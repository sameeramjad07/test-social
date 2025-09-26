import { z } from "zod";
import { Platform } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  FacebookWrapper,
  InstagramWrapper,
  LinkedInWrapper,
} from "@/lib/social-media";
import { randomBytes } from "crypto";

export const socialAccountsRouter = createTRPCRouter({
  // Get OAuth URL for connecting account
  getAuthUrl: protectedProcedure
    .input(
      z.object({
        platform: z.nativeEnum(Platform),
        workspaceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has permission to add social accounts
      const member = await ctx.db.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          userId: ctx.session.user.id,
        },
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
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission = member.role.permissions.some(
        (rp) =>
          rp.permission.resource === "social_accounts" &&
          rp.permission.action === "create"
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to add social accounts",
        });
      }

      // Generate secure random state token
      const stateToken = randomBytes(32).toString("hex");

      // Store state data
      const stateData = {
        workspaceId: input.workspaceId,
        userId: ctx.session.user.id,
        platform: input.platform,
        timestamp: Date.now(),
      };

      // Store state in database with 10 minute expiration
      await ctx.db.oAuthState.create({
        data: {
          state: stateToken,
          data: stateData,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });

      // Clean up expired states (optional, could be a cron job instead)
      await ctx.db.oAuthState.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      let wrapper;
      switch (input.platform) {
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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unsupported platform",
          });
      }

      const authUrl = wrapper.getAuthUrl(stateToken);
      console.log("Generated OAuth URL:", authUrl);
      return { authUrl };
    }),

  // Handle OAuth callback
  handleCallback: protectedProcedure
    .input(
      z.object({
        platform: z.nativeEnum(Platform),
        code: z.string(),
        state: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Retrieve and verify state from database
      const oauthState = await ctx.db.oAuthState.findUnique({
        where: { state: input.state },
      });

      if (!oauthState) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid state token",
        });
      }

      // Check if state has expired
      if (oauthState.expiresAt < new Date()) {
        // Clean up expired state
        await ctx.db.oAuthState.delete({
          where: { id: oauthState.id },
        });

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "State token expired",
        });
      }

      const stateData = oauthState.data as {
        workspaceId: string;
        userId: string;
        platform: Platform;
        timestamp: number;
      };

      // Verify the state belongs to the current user
      if (stateData.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid state token",
        });
      }

      // Verify platform matches
      if (stateData.platform !== input.platform) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Platform mismatch",
        });
      }

      // Delete the used state
      await ctx.db.oAuthState.delete({
        where: { id: oauthState.id },
      });

      let wrapper;
      switch (input.platform) {
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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unsupported platform",
          });
      }

      const accountInfo = await wrapper.handleCallback(input.code, input.state);
      console.log("Fetched account info:", accountInfo);

      // Save to database
      const socialAccount = await ctx.db.socialAccount.upsert({
        where: {
          workspaceId_platform_accountId: {
            workspaceId: stateData.workspaceId,
            platform: input.platform,
            accountId: accountInfo.id,
          },
        },
        update: {
          accountName: accountInfo.username,
          accountImage: accountInfo.profilePicture,
          accessToken: accountInfo.accessToken,
          refreshToken: accountInfo.refreshToken ?? null,
          expiresAt: accountInfo.expiresAt,
          isActive: true,
        },
        create: {
          workspaceId: stateData.workspaceId,
          platform: input.platform,
          accountId: accountInfo.id,
          accountName: accountInfo.username,
          accountImage: accountInfo.profilePicture,
          accessToken: accountInfo.accessToken,
          refreshToken: accountInfo.refreshToken ?? null,
          expiresAt: accountInfo.expiresAt,
        },
      });

      return {
        success: true,
        accountId: socialAccount.id,
        stateData: stateData,
      };
    }),

  // List connected accounts
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user is member of workspace
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

      const accounts = await ctx.db.socialAccount.findMany({
        where: {
          workspaceId: input.workspaceId,
          isActive: true,
        },
        select: {
          id: true,
          platform: true,
          accountName: true,
          accountImage: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      return accounts;
    }),

  // Disconnect account
  disconnect: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.socialAccount.findUnique({
        where: { id: input.accountId },
        include: {
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

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Social account not found",
        });
      }

      const member = account.workspace.members[0];
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission = member.role.permissions.some(
        (rp) =>
          rp.permission.resource === "social_accounts" &&
          rp.permission.action === "delete"
      );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to disconnect social accounts",
        });
      }

      await ctx.db.socialAccount.update({
        where: { id: input.accountId },
        data: { isActive: false },
      });

      return { success: true };
    }),

  // Refresh expired tokens
  refreshToken: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.socialAccount.findUnique({
        where: { id: input.accountId },
      });

      if (!account || !account.refreshToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Account not found or no refresh token available",
        });
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
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unsupported platform",
          });
      }

      const { accessToken, expiresAt } = await wrapper.refreshAccessToken(
        account.refreshToken
      );

      await ctx.db.socialAccount.update({
        where: { id: input.accountId },
        data: {
          accessToken,
          expiresAt,
        },
      });

      return { success: true };
    }),
});
