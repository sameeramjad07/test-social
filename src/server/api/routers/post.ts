import { z } from "zod";
import { Platform, PostStatus } from "@prisma/client";
import axios from "axios";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  FacebookWrapper,
  InstagramWrapper,
  LinkedInWrapper,
} from "@/lib/social-media";
import OpenAI from "openai";
import { format } from "date-fns";
import type { SupportedPlatform } from "@/app/(clientSide)/workspace/[workspaceId]/schedule/[scheduleId]/posts/[postId]/page";
import {
  uploadGeneratedImage,
  uploadGeneratedImageFromBase64,
} from "@/lib/uploadthing-server";
import { publishPostInternal } from "../utils/publishPost";
import { fetchAndSelectStore, type Store } from "@/lib/promoStores";
import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "@/env";

type PromptPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type CommissionRange = {
  min: number;
  max: number;
  type: "percentage" | "fixed";
};

// Helper function to format commission data for display
function formatCommissionDisplay(
  commissions: Array<{ type: string; min: number; max: number }>
): string | null {
  if (!commissions || commissions.length === 0) return null;
  const displays: string[] = [];
  for (const commission of commissions) {
    if (commission.type === "percentage") {
      displays.push(`${commission.max}% Cashback`);
    } else if (commission.type === "fixed") {
      displays.push(`€${commission.max} Reward`);
    }
  }
  return displays.join(" + ");
}

// Helper function to get the best commission highlight
function getBestCommissionHighlight(
  commissions: CommissionRange[]
): string | null {
  if (!commissions || commissions.length === 0) return null;

  const percentage = commissions.find((c) => c.type === "percentage");
  const fixed = commissions.find((c) => c.type === "fixed");

  if (percentage && fixed) {
    return `${percentage.max}% + €${fixed.max}`;
  } else if (percentage) {
    return `${percentage.max}% BACK`;
  } else if (fixed) {
    return `€${fixed.max} BONUS`;
  }

  return null;
}

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const genAI = new GoogleGenAI({
  apiKey: "AIzaSyAgBNcr9B_5ptU8bGhP_GpdN9KS1tBc41U",
});

const listPostsSchema = z.object({
  workspaceId: z.string(),
  status: z.nativeEnum(PostStatus).optional(),
  scheduled: z.boolean().optional(),
  platform: z.nativeEnum(Platform).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

const createPostSchema = z.object({
  workspaceId: z.string(),
  content: z.string().min(1, "Content is required"),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional().default([]),
  mentions: z.array(z.string()).optional().default([]),
  socialAccountIds: z
    .array(z.string())
    .min(1, "At least one social account is required"),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
        aiPrompt: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  scheduleId: z.string().optional(),
  status: z.nativeEnum(PostStatus).default(PostStatus.DRAFT),
  aiPrompt: z.string().optional(),
  aiModel: z.string().optional(),
  storeName: z.string().optional(), // Added
  storeUrl: z.string().optional(), // Added
});

const updatePostSchema = z.object({
  postId: z.string(),
  workspaceId: z.string(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
  hashtags: z.array(z.string()).optional(),
});

export const postsRouter = createTRPCRouter({
  // // Publish a post
  publish: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, workspaceId } = input;

      // Fetch the post with social accounts and workspace permissions
      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          images: true,
          socialAccounts: true,
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Check permissions
      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission = member.role.permissions.some(
        (rp) =>
          rp.permission.resource === "posts" &&
          rp.permission.action === "publish"
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to publish posts",
        });
      }

      // Check if post is fully approved
      if (
        post.status !== PostStatus.APPROVED ||
        !post.contentApproved ||
        !post.imagesApproved
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Post must be fully approved (content and images) before publishing",
        });
      }

      // Filter for supported platforms (LinkedIn, Facebook, Instagram)
      const supportedPlatforms: SupportedPlatform[] = [
        "INSTAGRAM",
        "FACEBOOK",
        "LINKEDIN",
      ];

      const socialAccounts = post.socialAccounts.filter((account) =>
        supportedPlatforms.includes(account.platform as SupportedPlatform)
      );

      if (socialAccounts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No supported social accounts (LinkedIn, Facebook, Instagram) connected to this post",
        });
      }

      // Update status to PUBLISHING
      await ctx.db.post.update({
        where: { id: postId },
        data: { status: PostStatus.PUBLISHING },
      });

      const results = [];

      // Publish to each connected platform
      for (const account of socialAccounts) {
        try {
          // Check for valid access token
          if (!account.accessToken) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: `No valid access token for ${account.platform} account`,
            });
          }

          // Initialize platform-specific wrapper
          let wrapper;
          switch (account.platform) {
            case Platform.LINKEDIN:
              wrapper = new LinkedInWrapper(ctx.db);
              break;
            case Platform.FACEBOOK:
              wrapper = new FacebookWrapper(ctx.db);
              break;
            case Platform.INSTAGRAM:
              wrapper = new InstagramWrapper(ctx.db);
              break;
            default:
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Unsupported platform: ${account.platform}`,
              });
          }

          // Check and refresh access token if expired
          if (account.expiresAt && account.expiresAt < new Date()) {
            if (!account.refreshToken) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: `Access token expired and no refresh token available for ${account.platform}`,
              });
            }

            const { accessToken, expiresAt } = await wrapper.refreshAccessToken(
              account.refreshToken
            );

            await ctx.db.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken,
                expiresAt,
              },
            });
          }

          // Prepare post content
          const postContent = {
            text: post.content || "",
            images: post.images.map((img) => img.url).filter(Boolean),
            hashtags: post.hashtags,
            mentions: post.mentions || [],
          };

          // Publish to platform
          const result = await wrapper.createPost(
            account.accessToken,
            postContent
          );

          // Log publication result
          await ctx.db.postPublication.create({
            data: {
              postId: post.id,
              platform: account.platform,
              platformPostId: result.postId,
              success: result.success,
              errorMessage: result.error,
              publishedAt: new Date(),
            },
          });

          results.push({
            platform: account.platform,
            success: result.success,
            postId: result.postId,
            url: result.url ?? null,
            error: result.error ?? null,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed to publish to ${account.platform}:`, error);

          // Log failure
          await ctx.db.postPublication.create({
            data: {
              postId: post.id,
              platform: account.platform,
              success: false,
              errorMessage,
              publishedAt: new Date(),
            },
          });

          results.push({
            platform: account.platform,
            success: false,
            postId: null,
            url: null,
            error: errorMessage,
          });
        }
      }

      // Update post status based on results
      const anySuccessful = results.some((r) => r.success);
      await ctx.db.post.update({
        where: { id: postId },
        data: {
          status: anySuccessful ? PostStatus.PUBLISHED : PostStatus.FAILED,
          publishedAt: anySuccessful ? new Date() : undefined,
        },
      });

      return { results };
    }),

  // Create a post
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User must be authenticated",
        });
      }

      // Verify membership
      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission = member.role.permissions.some(
        (rp) =>
          rp.permission.resource === "posts" &&
          rp.permission.action === "create"
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create posts",
        });
      }

      // Validate socialAccountIds
      const socialAccounts = await ctx.db.socialAccount.findMany({
        where: {
          id: { in: input.socialAccountIds },
          workspaceId: input.workspaceId,
          isActive: true,
        },
      });

      if (socialAccounts.length !== input.socialAccountIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more social accounts are invalid or not active",
        });
      }

      // Validate scheduleId if provided
      if (input.scheduleId) {
        const schedule = await ctx.db.postSchedule.findUnique({
          where: { id: input.scheduleId, workspaceId: input.workspaceId },
        });
        if (!schedule) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid schedule ID",
          });
        }
      }

      // If storeName is provided, verify it exists and log it
      if (
        input.storeName &&
        input.storeUrl &&
        // input.workspaceId === "cmfcejqiw003go25g2vwaqiia" // PostWaves Promowaves ID
        input.workspaceId === "cmfhdr7ba003gnv37cmewal29" // Promowaves ID in Neon DB
      ) {
        await ctx.db.usedStore.create({
          data: {
            workspaceId: input.workspaceId,
            scheduleId: input.scheduleId,
            storeName: input.storeName,
            storeUrl: input.storeUrl,
          },
        });
      }

      // Create post with related data
      return ctx.db.post.create({
        data: {
          workspaceId: input.workspaceId,
          createdById: ctx.session.user.id,
          content: input.content,
          caption: input.caption,
          hashtags: input.hashtags,
          mentions: input.mentions,
          status: input.status,
          scheduledAt: input.scheduleId ? new Date() : undefined,
          aiPrompt: input.aiPrompt,
          aiModel: input.aiModel,
          scheduleId: input.scheduleId,
          storeName: input.storeName,
          storeUrl: input.storeUrl,
          socialAccounts: {
            connect: input.socialAccountIds.map((id) => ({ id })),
          },
          images: {
            create: input.images.map((img, index) => ({
              url: img.url,
              alt: img.alt,
              width: img.width,
              height: img.height,
              size: img.size,
              mimeType: img.mimeType,
              aiPrompt: img.aiPrompt,
              order: index,
            })),
          },
        },
      });
    }),

  // List posts
  list: protectedProcedure
    .input(listPostsSchema)
    .query(async ({ ctx, input }) => {
      // Verify membership
      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const posts = await ctx.db.post.findMany({
        where: {
          workspaceId: input.workspaceId,
          status: input.status,
          scheduledAt: input.scheduled ? { not: null } : undefined,
          socialAccounts: input.platform
            ? { some: { platform: input.platform } }
            : undefined,
        },
        select: {
          id: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          content: true,
          caption: true,
          hashtags: true,
          mentions: true,
          status: true,
          scheduledAt: true,
          publishedAt: true,
          contentApproved: true,
          imagesApproved: true,
          aiPrompt: true,
          aiModel: true,
          scheduleId: true,
          storeName: true,
          storeUrl: true,
          socialAccounts: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              accountImage: true,
            },
          },
          images: {
            select: {
              id: true,
              url: true,
              alt: true,
              width: true,
              height: true,
              mimeType: true,
              isApproved: true,
            },
          },
          publications: {
            select: {
              platform: true,
              success: true,
              platformPostId: true,
              errorMessage: true,
              metrics: true,
            },
          },
        },
        orderBy: { scheduledAt: "asc" },
        take: input.limit,
      });

      return posts;
    }),

  update: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, workspaceId, content, imageUrl, hashtags } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
          images: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update posts",
        });
      }

      if (post.status === PostStatus.APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update approved posts",
        });
      }

      const updatedPost = await ctx.db.post.update({
        where: { id: postId },
        data: {
          content: content || post.content,
          hashtags: hashtags || post.hashtags,
          status: PostStatus.DRAFT,
          images: imageUrl
            ? {
                upsert: {
                  where: { id: post.images[0]?.id || "dummy-id" },
                  create: {
                    url: imageUrl,
                    order: 0,
                    isApproved: false,
                  },
                  update: {
                    url: imageUrl,
                    isApproved: false,
                  },
                },
              }
            : undefined,
        },
      });

      return { success: true, post: updatedPost };
    }),

  updateContentWithPrompt: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        workspaceId: z.string(),
        instruction: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, workspaceId, instruction } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      // Permission checks (same as update)
      const member = await ctx.db.workspaceMember.findFirst({
        where: { workspaceId, userId: ctx.session.user.id },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update posts",
        });
      }

      if (post.status === PostStatus.APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update approved posts",
        });
      }

      // === Call OpenAI ===
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
              You are an assistant that ONLY rewrites text.
              Rules:
              - Take the provided "current content" and the "instruction".
              - Return ONLY the updated content, nothing else.
              - Do not add explanations, hashtags, or JSON.
            `,
          },
          {
            role: "user",
            content: `
              Current content:
              ${post.content}
  
              Instruction: ${instruction}
            `,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const updatedContent =
        response.choices[0]?.message?.content?.trim() || post.content;

      // Save back
      const updatedPost = await ctx.db.post.update({
        where: { id: postId },
        data: {
          content: updatedContent,
          status: PostStatus.DRAFT,
        },
      });

      return { success: true, post: updatedPost };
    }),

  generateBulkPosts: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        workspaceId: z.string(),
        prompt: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId, prompt } = input;

      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session not found",
        });
      }

      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: ctx.session.user.id,
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "create"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create posts",
        });
      }

      const schedule = await ctx.db.postSchedule.findUnique({
        where: { id: scheduleId },
        include: { posts: true },
      });

      if (!schedule || schedule.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      if (schedule.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate posts for active schedule",
        });
      }

      if (schedule.posts.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Posts already generated for this schedule",
        });
      }

      // Calculate dates for post scheduling
      const dates = [];
      let current = new Date(schedule.startDate);
      const end = schedule.endDate
        ? new Date(schedule.endDate)
        : new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000);
      while (current <= end) {
        let include = false;
        const dayOfWeek = current.getDay();
        const dayOfMonth = current.getDate();
        switch (schedule.frequency) {
          case "DAILY":
            include = true;
            break;
          case "WEEKLY":
            if (schedule.weekDays?.includes(dayOfWeek)) include = true;
            break;
          case "MONTHLY":
            if (schedule.monthDays?.includes(dayOfMonth)) include = true;
            break;
          case "CUSTOM":
            if (
              schedule.weekDays?.includes(dayOfWeek) ||
              schedule.monthDays?.includes(dayOfMonth)
            )
              include = true;
            break;
        }
        if (include) dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      const totalPosts =
        schedule.postsPerSlot * schedule.timeSlots.length * dates.length;

      // Initialize progress
      await ctx.db.postGenerationProgress.upsert({
        where: { scheduleId },
        create: { scheduleId, total: totalPosts, completed: 0 },
        update: { total: totalPosts, completed: 0 },
      });

      const socialAccounts = await ctx.db.socialAccount.findMany({
        where: {
          workspaceId,
          platform: { in: schedule.platforms },
          isActive: true,
        },
        select: { id: true },
      });

      // Create posts with content
      let completed = 0;
      const usedHashtags: Set<string> = new Set(schedule.hashtags || []);
      for (const date of dates) {
        for (const timeSlot of schedule.timeSlots) {
          const [hh, mm] = timeSlot.split(":").map(Number);
          if (hh === undefined || mm === undefined || isNaN(hh) || isNaN(mm)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid time slot format: ${timeSlot}`,
            });
          }
          const scheduledAt = new Date(date);
          scheduledAt.setHours(hh, mm, 0, 0);

          for (let i = 0; i < schedule.postsPerSlot; i++) {
            const postIndex = completed + 1;
            const start = Date.now();
            const contentResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `
                    You are an AI content creator for social media.
                    Generate exactly one post at a time.
                    Your output must be valid JSON with the following keys:
                    - content: the text of the post (max 280 chars if Twitter is included, 2200 for Instagram, 3000 for LinkedIn, 63206 for Facebook).
                    - hashtags: 3-5 hashtags, array of strings, no duplicates from the provided list.
                    Ensure content is unique, engaging, and tailored to the platforms: ${schedule.platforms.join(
                      ", "
                    )}.
                  `,
                },
                {
                  role: "user",
                  content: `
                    Global prompt: "${prompt}"
                    Post index: ${postIndex} of ${totalPosts}
                    Platforms: ${schedule.platforms.join(", ")}
                    Avoid reusing these hashtags: ${Array.from(
                      usedHashtags
                    ).join(", ")}
                    Scheduled date: ${format(scheduledAt, "PPP")}
                  `,
                },
              ],
              temperature: 0.8,
              max_tokens: 500,
            });

            const duration = (Date.now() - start) / 1000; // in seconds

            let parsed: {
              content: string;
              hashtags: string[];
            } = {
              content: "",
              hashtags: [],
            };

            try {
              parsed = JSON.parse(
                contentResponse.choices[0]?.message?.content || "{}"
              );
            } catch (err) {
              parsed = {
                content: `Post ${postIndex} about ${prompt}`,
                hashtags: [],
              };
            }

            // Deduplicate hashtags
            parsed.hashtags = parsed.hashtags.filter(
              (h) => !usedHashtags.has(h)
            );
            parsed.hashtags.forEach((h) => usedHashtags.add(h));

            // Create post
            const post = await ctx.db.post.create({
              data: {
                workspaceId,
                createdById: ctx.session.user.id,
                content: parsed.content,
                hashtags: [...(schedule.hashtags || []), ...parsed.hashtags],
                mentions: [],
                status: PostStatus.CONTENT_APPROVED,
                contentApproved: false,
                imagesApproved: false,
                scheduledAt,
                aiPrompt: prompt,
                aiModel: "gpt-4o-mini",
                socialAccounts: {
                  connect: socialAccounts.map(({ id }) => ({ id })),
                },
                scheduleId,
              },
            });

            // ==== Add AI Generation Log ====
            await ctx.db.aIGenerationLog.create({
              data: {
                userId: ctx.session.user.id,
                workspaceId,
                postId: post.id,
                scheduleId,
                type: "TEXT", // from AIGenerationType enum
                prompt,
                model: "gpt-4o-mini",
                tokens: contentResponse.usage?.total_tokens ?? null,
                duration,
                status: "COMPLETED", // from AIGenerationStatus enum
                cost: 0, // if you track OpenAI costs, calculate here
              },
            });

            completed++;
            await ctx.db.postGenerationProgress.update({
              where: { scheduleId },
              data: { completed },
            });
          }
        }
      }

      await ctx.db.postSchedule.update({
        where: { id: scheduleId },
        data: { lastGeneratedAt: new Date() },
      });

      return { success: true };
    }),

  generateImagesForAllPosts: protectedProcedure
    .input(z.object({ scheduleId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId } = input;

      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session not found",
        });
      }

      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: ctx.session.user.id,
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update posts",
        });
      }

      const schedule = await ctx.db.postSchedule.findUnique({
        where: { id: scheduleId },
        include: { posts: { include: { images: true } } },
      });

      if (!schedule || schedule.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      if (schedule.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate images for active schedule",
        });
      }

      const posts = schedule.posts.filter(
        (post) => post.status === PostStatus.CONTENT_APPROVED
      );

      if (posts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No posts with approved content available for image generation",
        });
      }

      const totalImages = posts.length;
      await ctx.db.postGenerationProgress.upsert({
        where: { scheduleId },
        create: { scheduleId, total: totalImages, completed: 0 },
        update: { total: totalImages, completed: 0 },
      });

      let completed = 0;
      for (const post of posts) {
        const effectivePrompt =
          schedule.imagePrompt ||
          `Generate a relevant image for the post content: ${post.content}`;

        try {
          const start = Date.now();
          const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: effectivePrompt,
            n: 1,
            size: "1024x1024",
          });

          const duration = (Date.now() - start) / 1000;

          if (!response.data || !response.data[0]) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate image: No data returned",
            });
          }

          const imageUrl = response.data[0].url;

          if (!imageUrl) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to generate image: No URL returned",
            });
          }

          const uploadUrl = await uploadGeneratedImage(imageUrl);

          // Log AI generation
          const aiGeneration = await ctx.db.aIGenerationLog.create({
            data: {
              userId: ctx.session.user.id,
              workspaceId,
              postId: post.id,
              scheduleId,
              type: "IMAGE",
              prompt: effectivePrompt,
              model: "dall-e-3",
              imageSize: "1024x1024",
              duration, // Update with actual duration if available
              status: "COMPLETED",
              cost: 0, // Update with actual cost if applicable
            },
          });

          let postImage;
          if (post.images.length > 0 && post.images[0]?.id) {
            postImage = await ctx.db.postImage.update({
              where: { id: post.images[0].id },
              data: {
                url: uploadUrl,
                aiPrompt: effectivePrompt,
                isApproved: false,
                aiGenerationId: aiGeneration.id,
              },
            });
          } else {
            postImage = await ctx.db.postImage.create({
              data: {
                postId: post.id,
                url: uploadUrl,
                aiPrompt: effectivePrompt,
                isApproved: false,
                order: 0,
                aiGenerationId: aiGeneration.id,
              },
            });
          }

          // 3. Update the AI generation log with the imageId + mark completed
          await ctx.db.aIGenerationLog.update({
            where: { id: aiGeneration.id },
            data: {
              imageId: postImage.id,
              status: "COMPLETED",
            },
          });

          await ctx.db.post.update({
            where: { id: post.id },
            data: {
              status: PostStatus.IMAGE_PENDING_APPROVAL,
            },
          });

          completed++;
          await ctx.db.postGenerationProgress.update({
            where: { scheduleId },
            data: { completed },
          });
        } catch (error) {
          console.error(`Failed to generate image for post ${post.id}:`, error);
          continue; // Skip to the next post on error
        }
      }

      return { success: true, imagesGenerated: completed };
    }),

  generateBulkPostsForPromowaves: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        workspaceId: z.string(),
        prompt: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId, prompt } = input;

      // Authorization checks (unchanged)
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session not found",
        });
      }
      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: ctx.session.user.id,
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        });
      }
      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "create"
        );
      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create posts",
        });
      }

      const schedule = await ctx.db.postSchedule.findUnique({
        where: { id: scheduleId },
        include: { posts: true },
      });
      if (!schedule || schedule.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }
      if (schedule.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate posts for active schedule",
        });
      }
      if (schedule.posts.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Posts already generated for this schedule",
        });
      }

      // Calculate dates (unchanged)
      const dates = [];
      let current = new Date(schedule.startDate);
      const end = schedule.endDate
        ? new Date(schedule.endDate)
        : new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000);
      while (current <= end) {
        let include = false;
        const dayOfWeek = current.getDay();
        const dayOfMonth = current.getDate();
        switch (schedule.frequency) {
          case "DAILY":
            include = true;
            break;
          case "WEEKLY":
            if (schedule.weekDays?.includes(dayOfWeek)) include = true;
            break;
          case "MONTHLY":
            if (schedule.monthDays?.includes(dayOfMonth)) include = true;
            break;
          case "CUSTOM":
            if (
              schedule.weekDays?.includes(dayOfWeek) ||
              schedule.monthDays?.includes(dayOfMonth)
            )
              include = true;
            break;
        }
        if (include) dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      const totalPosts =
        schedule.postsPerSlot * schedule.timeSlots.length * dates.length;

      // Initialize progress
      await ctx.db.postGenerationProgress.upsert({
        where: { scheduleId },
        create: { scheduleId, total: totalPosts, completed: 0 },
        update: { total: totalPosts, completed: 0 },
      });

      const socialAccounts = await ctx.db.socialAccount.findMany({
        where: {
          workspaceId,
          platform: { in: schedule.platforms },
          isActive: true,
        },
        select: { id: true },
      });

      const workspace = await ctx.db.workspace.findUnique({
        where: { id: workspaceId },
        select: { logoUrl: true },
      });

      let completed = 0;
      const usedHashtags: Set<string> = new Set(schedule.hashtags || []);

      // Predefined engaging post templates focusing on Promowaves affiliate benefits
      const postTemplates = [
        "🚨 EXCLUSIVE DEAL ALERT! Get amazing discounts on {storeName} through Promowaves! 💰 Save big + earn cashback rewards! 🎯",
        "💸 Smart shoppers choose Promowaves! Discover {storeName} deals with extra savings & commission rewards! 🛍️✨",
        "🔥 LIMITED TIME: {storeName} + Promowaves = Double the savings! Get your exclusive discount now! ⏰💎",
        "💰 Why pay full price? Shop {storeName} through Promowaves and get cashback + exclusive deals! 🎁🚀",
        "🛍️ PROMOWAVES EXCLUSIVE: Unlock hidden savings at {storeName}! Your wallet will thank you! 💳✨",
        "⚡ Flash Deal Alert! {storeName} via Promowaves = Instant savings + commission rewards! Don't miss out! 🏃‍♂️💨",
        "🎯 Pro tip: Always shop through Promowaves! Get {storeName} deals + earn while you save! 💪🔥",
        "🌟 TRENDING NOW: {storeName} exclusive offers only on Promowaves! Join thousands saving smart! 📈💰",
      ];

      for (const date of dates) {
        for (const timeSlot of schedule.timeSlots) {
          const [hh, mm] = timeSlot.split(":").map(Number);
          if (hh === undefined || mm === undefined || isNaN(hh) || isNaN(mm)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid time slot format: ${timeSlot}`,
            });
          }
          const scheduledAt = new Date(date);
          scheduledAt.setHours(hh, mm, 0, 0);

          for (let i = 0; i < schedule.postsPerSlot; i++) {
            const postIndex = completed + 1;

            // Fetch a random unused store
            const store = await fetchAndSelectStore(
              ctx,
              workspaceId,
              scheduleId
            );

            // Get character limits for platforms
            const maxChars = Math.min(
              ...schedule.platforms.map((platform) => {
                switch (platform.toLowerCase()) {
                  case "twitter":
                  case "x":
                    return 280;
                  case "instagram":
                    return 2200;
                  case "linkedin":
                    return 3000;
                  case "facebook":
                    return 63206;
                  default:
                    return 280;
                }
              })
            );

            // Select a random template
            const template =
              postTemplates[Math.floor(Math.random() * postTemplates.length)] ??
              "🔥 Shop {storeName} through Promowaves for cashback + discounts!";

            const startTime = Date.now();

            // Enhanced prompt for better Promowaves-focused content
            const contentResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `
                    You are an expert social media content creator for PROMOWAVES - a leading affiliate marketing platform.
                    
                    BRAND IDENTITY:
                    - Promowaves is THE affiliate marketing platform for smart shoppers
                    - Users get CASHBACK + EXCLUSIVE DISCOUNTS when shopping through Promowaves
                    - We partner with top stores to provide the best deals
                    - Our value proposition: "Why pay full price when you can save + earn?"
                    
                    CONTENT REQUIREMENTS:
                    - ALWAYS mention "Promowaves" prominently in every post
                    - Highlight the DUAL BENEFIT: savings + cashback/commission
                    - Use action-oriented, FOMO-inducing language
                    - Include clear call-to-action
                    - Stay within ${maxChars} characters
                    - Make it feel exclusive and urgent
                    
                    TONE: Exciting, benefit-focused, trustworthy, urgent
                    
                    OUTPUT FORMAT: Valid JSON with keys:
                    - content: engaging post text emphasizing Promowaves benefits
                    - hashtags: 3-5 relevant hashtags (array of strings)
                    
                    STORE CONTEXT:
                    - Store: ${store.name}
                    - Category: ${store.category}
                    - Description: ${
                      store.description || "Premium quality products"
                    }
                    - URL: ${store.displayUrl}
                  `,
                },
                {
                  role: "user",
                  content: `
                    Create an engaging post using this template as inspiration: "${template}"
                    
                    Requirements:
                    - Post ${postIndex} of ${totalPosts}
                    - Platforms: ${schedule.platforms.join(", ")}
                    - Global prompt context: "${prompt}"
                    - Scheduled for: ${format(scheduledAt, "PPP")}
                    - Must emphasize Promowaves as the affiliate platform
                    - Show both store benefits AND Promowaves advantages
                    - Avoid these hashtags: ${Array.from(usedHashtags).join(
                      ", "
                    )}
                    - Include store name: ${store.name}
                    - Make it feel like an exclusive deal through Promowaves
                    
                    Focus on why shopping through Promowaves is better than direct shopping!
                  `,
                },
              ],
              temperature: 0.9,
              max_tokens: 500,
            });

            const duration = (Date.now() - startTime) / 1000;

            let parsed: { content: string; hashtags: string[] } = {
              content: "",
              hashtags: [],
            };

            try {
              parsed = JSON.parse(
                contentResponse.choices[0]?.message?.content || "{}"
              );
            } catch (err) {
              // Enhanced fallback content with Promowaves focus
              const fallbackTemplate = template.replace(
                "{storeName}",
                store.name
              );
              parsed = {
                content: `${fallbackTemplate} Shop through Promowaves and get exclusive cashback rewards! 🔗 ${store.displayUrl}`,
                hashtags: [
                  `#Promowaves`,
                  `#${store.category.replace(/\s/g, "")}`,
                  "#CashbackDeals",
                  "#ExclusiveOffers",
                ],
              };
            }

            // Ensure Promowaves is mentioned if somehow missing
            if (!parsed.content.toLowerCase().includes("promowaves")) {
              parsed.content = `🔥 Promowaves Exclusive: ${parsed.content}`;
            }

            // Add mandatory Promowaves hashtag
            const promoHashtags = [
              "#Promowaves",
              "#AffiliateDeals",
              "#CashbackRewards",
            ];
            parsed.hashtags = [
              ...promoHashtags,
              ...parsed.hashtags.filter((h) => !promoHashtags.includes(h)),
            ];

            // Deduplicate hashtags
            parsed.hashtags = parsed.hashtags.filter(
              (h) => !usedHashtags.has(h)
            );
            parsed.hashtags.forEach((h) => usedHashtags.add(h));

            // Create post with enhanced store details
            const post = await ctx.db.post.create({
              data: {
                workspaceId,
                createdById: ctx.session.user.id,
                content: parsed.content,
                hashtags: [...(schedule.hashtags || []), ...parsed.hashtags],
                mentions: [],
                status: PostStatus.CONTENT_APPROVED,
                contentApproved: false,
                imagesApproved: false,
                scheduledAt,
                aiPrompt: prompt,
                aiModel: "gpt-4o-mini",
                socialAccounts: {
                  connect: socialAccounts.map(({ id }) => ({ id })),
                },
                scheduleId,
                storeName: store.name,
                storeUrl: store.displayUrl,
              },
            });

            // Add AI Generation Log
            await ctx.db.aIGenerationLog.create({
              data: {
                userId: ctx.session.user.id,
                workspaceId,
                postId: post.id,
                scheduleId,
                type: "TEXT",
                prompt: `${prompt} | Template: ${template}`,
                model: "gpt-4o-mini",
                tokens: contentResponse.usage?.total_tokens ?? null,
                duration,
                status: "COMPLETED",
                cost: 0,
              },
            });

            completed++;
            await ctx.db.postGenerationProgress.update({
              where: { scheduleId },
              data: { completed },
            });
          }
        }
      }

      await ctx.db.postSchedule.update({
        where: { id: scheduleId },
        data: { lastGeneratedAt: new Date() },
      });

      return { success: true };
    }),

  generateImagesForAllPostsOfPromowaves: protectedProcedure
    .input(z.object({ scheduleId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId } = input;

      // Authorization checks (unchanged)
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session not found",
        });
      }
      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: ctx.session.user.id,
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        });
      }
      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        );
      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update posts",
        });
      }

      const schedule = await ctx.db.postSchedule.findUnique({
        where: { id: scheduleId },
        include: { posts: { include: { images: true } } },
      });
      if (!schedule || schedule.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }
      if (schedule.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate images for active schedule",
        });
      }

      const posts = schedule.posts.filter(
        (post) => post.status === PostStatus.CONTENT_APPROVED
      );
      if (posts.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No posts with approved content available for image generation",
        });
      }

      const totalImages = posts.length;

      await ctx.db.postGenerationProgress.upsert({
        where: { scheduleId },
        create: { scheduleId, total: totalImages, completed: 0 },
        update: { total: totalImages, completed: 0 },
      });

      const workspaceUrl =
        "https://promowaves.net/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_close_beta.4fedd7a9.png&w=384&q=75";

      // const workspace = await ctx.db.workspace.findUnique({
      //   where: { id: workspaceId },
      //   select: { logoUrl: true },
      // });

      // if (!workspace || !workspace.logoUrl) {
      //   throw new TRPCError({
      //     code: "BAD_REQUEST",
      //     message: "Workspace logo not found",
      //   });
      // }

      // Fetch list of stores once (cache per run)
      let storeList: any[] = [];
      try {
        const storesResp = await axios.get(
          "https://promowaves.net/api/getStores",
          {
            timeout: 10000,
          }
        );
        storeList = Array.isArray(storesResp.data) ? storesResp.data : [];
      } catch (err) {
        console.warn("Could not fetch store list from Promowaves API:", err);
        // we continue - individual store lookups will fail gracefully
      }

      let completed = 0;
      for (const post of posts) {
        try {
          // Fetch the store details from UsedStore table
          const usedStore = await ctx.db.usedStore.findFirst({
            where: { workspaceId, scheduleId, storeName: post.storeName || "" },
          });

          if (!usedStore) {
            console.error(`No store found for post ${post.id}`);
            continue;
          }

          // Find store in Promowaves API response using name OR displayUrl fallback
          const store =
            storeList.find(
              (s: any) =>
                (s.name &&
                  s.name.toLowerCase() ===
                    (post.storeName || "").toLowerCase()) ||
                (s.displayUrl && s.displayUrl === post.storeName)
            ) || null;

          if (!store) {
            console.error(`Store not found for ${post.storeName}`);
            continue;
          }

          // Commission highlight text
          const commissionHighlight = getBestCommissionHighlight(
            store.commissionRanges || []
          );
          const commissionText = commissionHighlight
            ? `• "${commissionHighlight}" in bold, eye-catching style`
            : "";

          // Construct the image prompt (keep minimal). Also add a short directive to use displayUrl as a small watermark/footer.
          const effectivePrompt =
            schedule.imagePrompt ||
            `Create a CLEAN, MINIMAL promotional banner with VERY LIMITED TEXT.

            STRICT Design Rules:
            - MAXIMUM 3-4 text elements only
            - NO paragraphs, NO descriptions, NO body text
            - Focus on visual impact, not text content

            Essential Elements (text minimal):
            1. Store name: "${store.name}" (prominent)
            2. Commission offer: "${
              commissionHighlight || "SPECIAL OFFER"
            }" (very bold)
            3. Call-to-action: "SHOP NOW" or similar (1-2 words max)

            Visual Requirements:
            - Logos: Include Promowaves and ${
              store.name
            } logos (use Promowaves logo as a brand mark)
            - Add store website/displayUrl as a small watermark/footer: "${
              store.displayUrl || ""
            }" (tiny, bottom-right)
            - Style: Clean, modern, high-impact design
            - Colors: Bold, contrasting, attention-grabbing
            - Category: ${
              store.category || "general"
            } theme (visual elements, not text)
            - Layout: Spacious, uncluttered, professional
            - Background: Simple gradient or pattern

            Format: Social media banner, mobile-optimized`;

          // Build prompt parts (text + inline logos). We intentionally push the main text prompt first,
          // then inline promowaves logo, then store logo, then a small text part for the displayUrl watermark.
          const promptContent: any[] = [{ text: effectivePrompt }];

          // Add Promowaves (workspace) logo as inline image
          if (workspaceUrl) {
            try {
              const logoResp = await fetch(workspaceUrl);
              const logoArrayBuffer = await logoResp.arrayBuffer();
              const logoBase64 =
                Buffer.from(logoArrayBuffer).toString("base64");
              promptContent.push({
                inlineData: {
                  mimeType:
                    // @ts-ignore headers may be present
                    (logoResp.headers && logoResp.headers.get
                      ? logoResp.headers.get("content-type")
                      : undefined) || "image/png",
                  data: logoBase64,
                },
              });
            } catch (logoError) {
              console.warn(
                "Failed to fetch Promowaves workspace logo:",
                logoError
              );
            }
          }

          // Add store logo as inline image (if present)
          if (store.logo) {
            try {
              const storeLogoResp = await fetch(store.logo);
              const storeLogoBuffer = await storeLogoResp.arrayBuffer();
              const storeLogoBase64 =
                Buffer.from(storeLogoBuffer).toString("base64");
              promptContent.push({
                inlineData: {
                  mimeType:
                    (storeLogoResp.headers && storeLogoResp.headers.get
                      ? storeLogoResp.headers.get("content-type")
                      : undefined) || "image/png",
                  data: storeLogoBase64,
                },
              });
            } catch (storeLogoError) {
              console.warn(
                `Failed to fetch ${store.name} logo:`,
                storeLogoError
              );
            }
          }

          // Small explicit text instruction to use store.displayUrl as watermark/footer (helps the model place it)
          if (store.displayUrl) {
            promptContent.push({
              text: `Small watermark/footer: ${store.displayUrl} (tiny, bottom-right)`,
            });
          }

          // Also pass the commission text as a short explicit instruction if available
          if (commissionText) {
            promptContent.push({ text: commissionText });
          }

          // Call the image model
          const start = Date.now();
          const genResponse = await genAI.models.generateContent({
            model: "gemini-2.5-flash-image-preview",
            contents: promptContent,
          });

          const duration = (Date.now() - start) / 1000;

          // Extract base64 image
          let imageBase64: string | null = null;
          if (genResponse.candidates?.length) {
            for (const part of genResponse.candidates[0]?.content?.parts ||
              []) {
              if (part.inlineData?.data) {
                imageBase64 = part.inlineData.data;
                break;
              }
            }
          }

          if (!imageBase64) {
            throw new Error("No image generated in response");
          }

          // Upload the generated image (assumes helper exists in your codebase)
          const uploadUrl = await uploadGeneratedImageFromBase64(imageBase64);

          // Log AI generation
          const aiGeneration = await ctx.db.aIGenerationLog.create({
            data: {
              userId: ctx.session.user.id,
              workspaceId,
              postId: post.id,
              scheduleId,
              type: "IMAGE",
              prompt: effectivePrompt,
              model: "gemini-2.5-flash-image-preview",
              imageSize: "1200x630",
              duration,
              status: "COMPLETED",
              cost: 0,
            },
          });

          // Attach / update post image entry
          let postImage;
          if (post.images.length > 0 && post.images[0]?.id) {
            postImage = await ctx.db.postImage.update({
              where: { id: post.images[0].id },
              data: {
                url: uploadUrl,
                aiPrompt: effectivePrompt,
                isApproved: false,
                aiGenerationId: aiGeneration.id,
              },
            });
          } else {
            postImage = await ctx.db.postImage.create({
              data: {
                postId: post.id,
                url: uploadUrl,
                aiPrompt: effectivePrompt,
                isApproved: false,
                order: 0,
                aiGenerationId: aiGeneration.id,
              },
            });
          }

          // Update the AI generation log with the imageId
          await ctx.db.aIGenerationLog.update({
            where: { id: aiGeneration.id },
            data: {
              imageId: postImage.id,
              status: "COMPLETED",
            },
          });

          completed++;
          await ctx.db.postGenerationProgress.update({
            where: { scheduleId },
            data: { completed },
          });

          console.log(
            `✅ Generated image for "${store.name}" (${
              store.displayUrl || "no displayUrl"
            }) — ${duration}s — commission: ${commissionHighlight || "none"}`
          );
        } catch (error) {
          console.error(`Failed to generate image for post ${post.id}:`, error);

          // Log failed generation
          await ctx.db.aIGenerationLog.create({
            data: {
              userId: ctx.session.user.id,
              workspaceId,
              postId: post.id,
              scheduleId,
              type: "IMAGE",
              prompt: schedule.imagePrompt || "Default prompt",
              model: "gemini-2.5-flash-image-preview",
              imageSize: "1200x630",
              duration: 0,
              status: "FAILED",
              error: error instanceof Error ? error.message : "Unknown error",
              cost: 0,
            },
          });
          continue;
        }
      } // end for posts

      return { success: true, imagesGenerated: completed };
    }),
  getGenerationProgress: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const progress = await ctx.db.postGenerationProgress.findUnique({
        where: { scheduleId: input.scheduleId },
      });
      return (
        progress || { scheduleId: input.scheduleId, total: 0, completed: 0 }
      );
    }),

  bulkApprovePosts: protectedProcedure
    .input(z.object({ scheduleId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId } = input;

      // Permission check (similar to deleteAllPosts)
      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: ctx.session.user.id,
        },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } },
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don’t have permission to approve posts",
        });
      }

      await ctx.db.post.updateMany({
        where: { scheduleId, workspaceId },
        data: { status: "APPROVED" },
      });

      return { success: true };
    }),

  approvePost: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        approve: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, approve } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "approve"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to approve posts",
        });
      }

      if (!approve && post.status !== PostStatus.APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post can only be unapproved from approved status",
        });
      }

      await ctx.db.post.update({
        where: { id: postId },
        data: {
          status: approve ? PostStatus.APPROVED : PostStatus.DRAFT,
          contentApproved: approve,
          imagesApproved: approve,
        },
      });

      return { success: true };
    }),

  deleteAllPosts: protectedProcedure
    .input(z.object({ scheduleId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.post.deleteMany({
        where: { scheduleId: input.scheduleId, workspaceId: input.workspaceId },
      });
      return { success: true };
    }),

  deletePost: protectedProcedure
    .input(z.object({ postId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.post.delete({
        where: { id: input.postId, workspaceId: input.workspaceId },
      });
      return { success: true };
    }),

  // New: Generate posts for schedule
  generateSchedulePosts: protectedProcedure
    .input(z.object({ scheduleId: z.string(), workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId } = input;

      // Validate user session
      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User session not found",
        });
      }

      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: ctx.session.user.id,
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "create"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create posts",
        });
      }

      const schedule = await ctx.db.postSchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule || schedule.workspaceId !== workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule not found",
        });
      }

      if (schedule.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate posts for active schedule",
        });
      }

      // Fetch social accounts for the schedule's platforms
      const socialAccounts = await ctx.db.socialAccount.findMany({
        where: {
          workspaceId,
          platform: { in: schedule.platforms },
          isActive: true,
        },
        select: { id: true },
      });

      // Calculate dates
      const dates = [];
      let current = new Date(schedule.startDate);
      const end = schedule.endDate
        ? new Date(schedule.endDate)
        : new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days if no endDate
      while (current <= end) {
        let include = false;
        const dayOfWeek = current.getDay();
        const dayOfMonth = current.getDate();

        switch (schedule.frequency) {
          case "DAILY":
            include = true;
            break;
          case "WEEKLY":
            if (schedule.weekDays.includes(dayOfWeek)) {
              include = true;
            }
            break;
          case "MONTHLY":
            if (schedule.monthDays.includes(dayOfMonth)) {
              include = true;
            }
            break;
          case "CUSTOM":
            if (
              schedule.weekDays.includes(dayOfWeek) ||
              schedule.monthDays.includes(dayOfMonth)
            ) {
              include = true;
            }
            break;
        }

        if (include) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      // Generate posts
      for (const date of dates) {
        for (const timeSlot of schedule.timeSlots) {
          const [hh, mm] = timeSlot.split(":").map(Number);
          if (hh === undefined || mm === undefined || isNaN(hh) || isNaN(mm)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid time slot format: ${timeSlot}`,
            });
          }
          const scheduledAt = new Date(date);
          scheduledAt.setHours(hh, mm, 0, 0);

          await ctx.db.post.create({
            data: {
              workspaceId,
              createdById: ctx.session.user.id,
              content: "",
              status: PostStatus.DRAFT,
              scheduledAt,
              aiPrompt: schedule.contentPrompt || "",
              scheduleId,
              socialAccounts: {
                connect: socialAccounts.map(({ id }) => ({ id })),
              },
            },
          });
        }
      }

      // Update lastGeneratedAt
      await ctx.db.postSchedule.update({
        where: { id: scheduleId },
        data: { lastGeneratedAt: new Date() },
      });

      return { success: true };
    }),

  // New: Generate content for post
  generateContent: protectedProcedure
    .input(z.object({ postId: z.string(), prompt: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { postId, prompt } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          schedule: true,
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update posts",
        });
      }

      if (post.status !== PostStatus.DRAFT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Content can only be generated for draft posts",
        });
      }

      const effectivePrompt =
        prompt ||
        post.aiPrompt ||
        post.schedule?.contentPrompt ||
        "Generate engaging social media content";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert social media content creator.",
          },
          { role: "user", content: effectivePrompt },
        ],
      });

      const firstChoice = completion.choices[0];

      if (!firstChoice?.message?.content) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI did not return any content",
        });
      }

      const generatedContent = firstChoice.message.content;

      await ctx.db.post.update({
        where: { id: postId },
        data: {
          content: generatedContent,
          aiModel: "gpt-4o-mini",
          status: PostStatus.CONTENT_PENDING_APPROVAL,
        },
      });

      return { success: true, content: generatedContent };
    }),

  // New: Approve content
  approveContent: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        approve: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, approve } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "approve_content"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to approve/unapprove content",
        });
      }

      if (approve && post.status !== PostStatus.CONTENT_PENDING_APPROVAL) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Content can only be approved when pending approval",
        });
      }

      if (!approve && post.status !== PostStatus.CONTENT_APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Content can only be unapproved when approved",
        });
      }

      await ctx.db.post.update({
        where: { id: postId },
        data: {
          contentApproved: approve,
          status: approve ? PostStatus.CONTENT_APPROVED : PostStatus.DRAFT,
        },
      });

      return { success: true };
    }),

  // New: Generate image
  generateImage: protectedProcedure
    .input(z.object({ postId: z.string(), prompt: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { postId, prompt } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          schedule: true,
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
          images: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update posts",
        });
      }

      if (post.status !== PostStatus.CONTENT_APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Content must be approved before generating image",
        });
      }

      const effectivePrompt =
        prompt ||
        post.schedule?.imagePrompt ||
        "Generate a relevant image for the post content: " + post.content;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: effectivePrompt,
        n: 1,
        size: "1024x1024",
      });

      if (!response.data || !response.data[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate image: No data returned",
        });
      }

      const imageUrl = response.data[0].url;

      if (!imageUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate image: No URL returned",
        });
      }

      // Create or update PostImage
      if (post.images.length > 0 && post.images[0]?.id) {
        await ctx.db.postImage.update({
          where: { id: post.images[0].id },
          data: {
            url: imageUrl,
            aiPrompt: effectivePrompt,
            isApproved: false,
          },
        });
      } else {
        await ctx.db.postImage.create({
          data: {
            postId,
            url: imageUrl,
            aiPrompt: effectivePrompt,
            isApproved: false,
            order: 0,
          },
        });
      }

      await ctx.db.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.IMAGE_PENDING_APPROVAL,
        },
      });

      return { success: true, imageUrl };
    }),

  // New: Approve image
  approveImage: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        approve: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { postId, approve } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "approve_images"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to approve/unapprove images",
        });
      }

      if (approve && post.status !== PostStatus.IMAGE_PENDING_APPROVAL) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image can only be approved when pending approval",
        });
      }

      if (!approve && post.status !== PostStatus.IMAGE_APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image can only be unapproved when approved",
        });
      }

      await ctx.db.post.update({
        where: { id: postId },
        data: {
          imagesApproved: approve,
          status: approve
            ? PostStatus.IMAGE_APPROVED
            : PostStatus.CONTENT_APPROVED,
        },
      });

      return { success: true };
    }),

  // New: Final approve post
  finalApprovePost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { postId } = input;

      const post = await ctx.db.post.findUnique({
        where: { id: postId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "approve"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to approve posts",
        });
      }

      if (post.status !== PostStatus.IMAGE_APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image must be approved before final approval",
        });
      }

      await ctx.db.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.APPROVED,
        },
      });

      return { success: true };
    }),

  // New: Get post by ID
  getPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
        include: {
          images: true,
          socialAccounts: true,
          schedule: true,
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id },
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: { permission: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const member = post.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "read"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view posts",
        });
      }

      return post;
    }),
});
