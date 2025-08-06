import { z } from "zod";
import { Platform, PostStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { FacebookWrapper, InstagramWrapper, LinkedInWrapper } from "@/lib/social-media";

export const postsRouter = createTRPCRouter({
  // Publish a post
  publish: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
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

      if (post.status !== PostStatus.APPROVED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post must be approved before publishing",
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
              continue;
          }

          const content = {
            text: post.content,
            images: post.images.map((img) => img.url),
            hashtags: post.hashtags,
            mentions: post.mentions,
          };

          const result = await wrapper.createPost(
            account.accessToken!,
            content
          );

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

          results.push(result);
        } catch (error) {
          console.error(`Failed to publish to ${account.platform}:`, error);
          
          await ctx.db.postPublication.create({
            data: {
              postId: post.id,
              platform: account.platform,
              success: false,
              errorMessage: error instanceof Error ? error.message : "Unknown error",
            },
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
});