import { z } from "zod";
import { Platform, PostStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  FacebookWrapper,
  InstagramWrapper,
  LinkedInWrapper,
} from "@/lib/social-media";
import OpenAI from "openai";

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
});

const updatePostSchema = z.object({
  postId: z.string(),
  workspaceId: z.string(),
  content: z.string().optional(),
  imageUrl: z.string().url().optional(),
  hashtags: z.array(z.string()).optional(),
});

export const postsRouter = createTRPCRouter({
  // Publish a post
  publish: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        workspaceId: z.string(), // Added for wrapper initialization
      })
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
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

      // Update status to publishing
      await ctx.db.post.update({
        where: { id: input.postId },
        data: { status: PostStatus.PUBLISHING },
      });

      const results = [];

      // Publish to each connected platform
      for (const account of post.socialAccounts) {
        try {
          if (!account.accessToken) {
            throw new Error("No valid access token for this account");
          }

          let wrapper;
          switch (account.platform) {
            case Platform.INSTAGRAM:
              wrapper = new InstagramWrapper(ctx.db);
              break;
            case Platform.FACEBOOK:
              wrapper = new FacebookWrapper(ctx.db);
              break;
            case Platform.LINKEDIN:
              wrapper = new LinkedInWrapper(ctx.db);
              break;
            default:
              await ctx.db.postPublication.create({
                data: {
                  postId: post.id,
                  platform: account.platform,
                  success: false,
                  errorMessage: `Unsupported platform: ${account.platform}`,
                },
              });
              continue;
          }

          const content = {
            text: post.content,
            images: post.images.map((img) => img.url),
            hashtags: post.hashtags,
            mentions: post.mentions,
          };

          const result = await wrapper.createPost(account.accessToken, content);

          // Save publication result
          await ctx.db.postPublication.create({
            data: {
              postId: post.id,
              platform: account.platform,
              platformPostId: result.postId,
              success: result.success,
              errorMessage: result.error,
            },
          });

          results.push({ platform: account.platform, ...result });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.error(`Failed to publish to ${account.platform}:`, error);

          await ctx.db.postPublication.create({
            data: {
              postId: post.id,
              platform: account.platform,
              success: false,
              errorMessage,
            },
          });

          results.push({
            platform: account.platform,
            success: false,
            error: errorMessage,
          });
        }
      }

      // Update post status
      const allSuccessful = results.every((r) => r.success);
      await ctx.db.post.update({
        where: { id: input.postId },
        data: {
          status: allSuccessful ? PostStatus.PUBLISHED : PostStatus.FAILED,
          publishedAt: allSuccessful ? new Date() : undefined,
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
          content: true,
          caption: true,
          hashtags: true,
          mentions: true,
          status: true,
          scheduledAt: true,
          publishedAt: true,
          createdAt: true,
          contentApproved: true,
          imagesApproved: true,
          aiPrompt: true,
          aiModel: true,
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
          schedule: {
            select: {
              id: true,
              name: true,
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

      const socialAccounts = await ctx.db.socialAccount.findMany({
        where: {
          workspaceId,
          platform: { in: schedule.platforms },
          isActive: true,
        },
        select: { id: true },
      });

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

      const totalPosts =
        schedule.postsPerSlot * schedule.timeSlots.length * dates.length;

      await ctx.db.postGenerationProgress.create({
        data: {
          scheduleId,
          total: totalPosts,
          completed: 0,
        },
      });

      const posts = [];
      for (const date of dates) {
        for (const timeSlot of schedule.timeSlots) {
          const [hh, mm] = timeSlot.split(":").map(Number);
          if (hh === undefined || mm === undefined || isNaN(hh) || isNaN(mm)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid time slot format: ${timeSlot}`,
            });
          }
          for (let i = 0; i < schedule.postsPerSlot; i++) {
            const scheduledAt = new Date(date);
            scheduledAt.setHours(hh, mm, 0, 0);

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an expert social media content creator. Generate engaging content, hashtags, and an image prompt for a social media post based on the provided prompt. Return JSON with fields: content (string), hashtags (array of strings), imagePrompt (string).",
                },
                { role: "user", content: prompt },
              ],
            });

            const result = completion.choices[0]?.message?.content;
            if (!result) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "AI did not return content",
              });
            }

            const { content, hashtags, imagePrompt } = JSON.parse(result);

            const imageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: imagePrompt,
              n: 1,
              size: "1024x1024",
            });

            const imageUrl = imageResponse.data[0]?.url;
            if (!imageUrl) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to generate image",
              });
            }

            const post = await ctx.db.post.create({
              data: {
                workspaceId,
                createdById: ctx.session.user.id,
                content,
                hashtags,
                status: PostStatus.DRAFT,
                scheduledAt,
                aiPrompt: prompt,
                aiModel: "gpt-4o-mini",
                scheduleId,
                socialAccounts: {
                  connect: socialAccounts.map(({ id }) => ({ id })),
                },
                images: {
                  create: {
                    url: imageUrl,
                    aiPrompt: imagePrompt,
                    order: 0,
                    isApproved: false,
                  },
                },
              },
            });

            posts.push(post);

            await ctx.db.postGenerationProgress.update({
              where: { scheduleId },
              data: { completed: { increment: 1 } },
            });
          }
        }
      }

      await ctx.db.postSchedule.update({
        where: { id: scheduleId },
        data: { lastGeneratedAt: new Date() },
      });

      return { success: true, posts };
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

      if (approve && post.status !== PostStatus.DRAFT) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post can only be approved from draft status",
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
