// src/server/api/utils/publishPost.ts
import { db } from "@/server/db"; // Adjust import based on your setup
import { TRPCError } from "@trpc/server";
import { PostStatus, type Post, type SocialAccount } from "@prisma/client"; // Adjust types as needed
import {
  LinkedInWrapper,
  FacebookWrapper,
  InstagramWrapper,
} from "@/lib/social-media"; // Assume your wrappers are here

type SupportedPlatform = "INSTAGRAM" | "FACEBOOK" | "LINKEDIN";

export async function publishPostInternal(postId: string, workspaceId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      images: true,
      socialAccounts: true,
    },
  });

  if (!post) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
  }

  if (post.workspaceId !== workspaceId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Post does not belong to this workspace",
    });
  }

  // Check if post is fully approved (same as your procedure)
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

  // Filter for supported platforms
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
  await db.post.update({
    where: { id: postId },
    data: { status: PostStatus.PUBLISHING },
  });

  const results = [];

  // Publish to each connected platform (same loop as your procedure)
  for (const account of socialAccounts) {
    try {
      if (!account.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `No valid access token for ${account.platform} account`,
        });
      }

      let wrapper;
      switch (account.platform) {
        case "LINKEDIN":
          wrapper = new LinkedInWrapper(db);
          break;
        case "FACEBOOK":
          wrapper = new FacebookWrapper(db);
          break;
        case "INSTAGRAM":
          wrapper = new InstagramWrapper(db);
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
        await db.socialAccount.update({
          where: { id: account.id },
          data: { accessToken, expiresAt },
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
      const result = await wrapper.createPost(account.accessToken, postContent);

      // Log publication result
      await db.postPublication.create({
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
      await db.postPublication.create({
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
  await db.post.update({
    where: { id: postId },
    data: {
      status: anySuccessful ? PostStatus.PUBLISHED : PostStatus.FAILED,
      publishedAt: anySuccessful ? new Date() : undefined,
    },
  });

  return { results };
}
