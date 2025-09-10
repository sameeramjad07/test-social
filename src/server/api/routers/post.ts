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
import { uploadGeneratedImage } from "@/lib/uploadthing-server";
import { fetchAndSelectStore, type Store } from "@/lib/promoStores";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
        input.workspaceId === "cmdyoea02003f5d05xo4gpw8h" // Promowaves ID in Neon DB
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
            await ctx.db.post.create({
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

          const uploadUrl = await uploadGeneratedImage(imageUrl);

          if (post.images.length > 0 && post.images[0]?.id) {
            await ctx.db.postImage.update({
              where: { id: post.images[0].id },
              data: {
                url: uploadUrl,
                aiPrompt: effectivePrompt,
                isApproved: false,
              },
            });
          } else {
            await ctx.db.postImage.create({
              data: {
                postId: post.id,
                url: uploadUrl,
                aiPrompt: effectivePrompt,
                isApproved: false,
                order: 0,
              },
            });
          }

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

            // Generate post content
            const contentResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: `
                    You are an AI content creator for an affiliate marketing platform.
                    Generate exactly one social media post for the Promowaves workspace.
                    Your output must be valid JSON with the following keys:
                    - content: the text of the post (max 280 chars if Twitter is included, 2200 for Instagram, 3000 for LinkedIn, 63206 for Facebook).
                    - hashtags: 3-5 hashtags, array of strings, no duplicates from the provided list.
                    Use the store details to create an engaging post:
                    - Store Name: ${store.name}
                    - Description: ${
                      store.description || "No description available"
                    }
                    - Category: ${store.category}
                    - Display URL: ${store.displayUrl}
                    Ensure content is unique, promotional, and tailored to the platforms: ${schedule.platforms.join(
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

            let parsed: { content: string; hashtags: string[] } = {
              content: "",
              hashtags: [],
            };
            try {
              parsed = JSON.parse(
                contentResponse.choices[0]?.message?.content || "{}"
              );
            } catch (err) {
              parsed = {
                content: `Discover ${store.name} at ${store.displayUrl}! Shop now for great deals!`,
                hashtags: [`#${store.category.replace(/\s/g, "")}`, "#ShopNow"],
              };
            }

            // Deduplicate hashtags
            parsed.hashtags = parsed.hashtags.filter(
              (h) => !usedHashtags.has(h)
            );
            parsed.hashtags.forEach((h) => usedHashtags.add(h));

            // Create post with store details
            await ctx.db.post.create({
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
                storeName: store.name, // Store store name
                storeUrl: store.displayUrl, // Store store URL
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

      const workspace = await ctx.db.workspace.findUnique({
        where: { id: workspaceId },
        select: { logoUrl: true },
      });
      if (!workspace || !workspace.logoUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Workspace logo not found",
        });
      }

      let completed = 0;
      for (const post of posts) {
        // Fetch the store details from UsedStore table
        const usedStore = await ctx.db.usedStore.findFirst({
          where: { workspaceId, scheduleId, storeName: post.storeName || "" },
        });

        if (!usedStore) {
          console.error(`No store found for post ${post.id}`);
          continue;
        }

        // Fetch store details from API to get logo
        const storeResponse = await axios.get(
          "https://promowaves.net/api/getStores"
        );
        const store = storeResponse.data.find(
          (s: Store) => s.name === post.storeName
        );

        if (!store || !store.logo) {
          console.error(`Store or logo not found for ${post.storeName}`);
          continue;
        }

        const effectivePrompt =
          schedule.imagePrompt ||
          `Create a promotional social media graphic featuring the logos of Promowaves and ${store.name}. Include the Promowaves logo from ${workspace.logoUrl} and the store logo from ${store.logo}. Design an engaging, visually appealing background relevant to the store's category (${store.category}). Do not include any text in the image.`;

        try {
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
              duration: 0, // Update with actual duration if available
              status: "COMPLETED",
              cost: 0, // Update with actual cost if applicable
              imageId: undefined, // Will be updated below
            },
          });

          if (post.images.length > 0 && post.images[0]?.id) {
            await ctx.db.postImage.update({
              where: { id: post.images[0].id },
              data: {
                url: uploadUrl,
                aiPrompt: effectivePrompt,
                isApproved: false,
                aiGenerationId: aiGeneration.id,
              },
            });
          } else {
            await ctx.db.postImage.create({
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
          continue;
        }
      }

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
