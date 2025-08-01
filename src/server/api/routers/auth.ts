// src/server/api/routers/auth.ts
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { signIn } from "@/server/auth";

// Validation schemas
const signUpSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z
    .string()
    .email("Invalid email address")
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  company: z
    .string()
    .max(100, "Company name must be less than 100 characters")
    .optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
});

export const authRouter = createTRPCRouter({
  // Sign up with email and password
  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, email, password } = input;

      try {
        // Check if user already exists
        const existingUser = await ctx.db.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists",
          });
        }

        // Hash password
        const hashedPassword = await hash(password, 12);

        // Create user
        const user = await ctx.db.user.create({
          data: {
            name: name.trim(),
            email,
            hashedPassword,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        });

        return {
          success: true,
          message: "Account created successfully! You can now sign in.",
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            createdAt: user.createdAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Sign up error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create account. Please try again.",
        });
      }
    }),

  signIn: publicProcedure.input(signInSchema).mutation(async ({ input }) => {
    const { email, password } = input;

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      return { success: true, message: "Signed in successfully" };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Sign in error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to sign in. Please try again.",
      });
    }
  }),

  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          company: true,
          website: true,
          createdAt: true,
          updatedAt: true,
          emailVerified: true,
          _count: {
            select: {
              posts: true,
              socialAccounts: true,
              contentPosts: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }

      return {
        ...user,
        stats: {
          totalPosts: user._count.posts,
          socialAccounts: user._count.socialAccounts,
          contentPosts: user._count.contentPosts,
        },
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Get profile error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user profile",
      });
    }
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            ...input,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            bio: true,
            company: true,
            website: true,
            updatedAt: true,
          },
        });

        return {
          success: true,
          message: "Profile updated successfully",
          user: updatedUser,
        };
      } catch (error) {
        console.error("Update profile error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile. Please try again.",
        });
      }
    }),

  // Change password (for users who signed up with credentials)
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword } = input;

      try {
        // Get user's current hashed password
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: {
            id: true,
            hashedPassword: true,
          },
        });

        if (!user || !user.hashedPassword) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot change password for social login accounts",
          });
        }

        // Verify current password
        const isCurrentPasswordValid = await compare(
          currentPassword,
          user.hashedPassword
        );

        if (!isCurrentPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Current password is incorrect",
          });
        }

        // Hash new password
        const hashedNewPassword = await hash(newPassword, 12);

        // Update password
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            hashedPassword: hashedNewPassword,
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Password updated successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Change password error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to change password. Please try again.",
        });
      }
    }),

  // Check if email exists (for forgot password functionality)
  checkEmailExists: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { email: input.email.toLowerCase().trim() },
          select: { id: true, hashedPassword: true },
        });

        return {
          exists: !!user,
          hasPassword: !!user?.hashedPassword,
        };
      } catch (error) {
        console.error("Check email error:", error);
        return { exists: false, hasPassword: false };
      }
    }),

  // Get user's connected accounts
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const accounts = await ctx.db.account.findMany({
        where: { userId: ctx.session.user.id },
        select: {
          id: true,
          provider: true,
          type: true,
          providerAccountId: true,
        },
      });

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { hashedPassword: true },
      });

      return {
        connectedProviders: accounts.map((account) => ({
          id: account.id,
          provider: account.provider,
          type: account.type,
        })),
        hasPasswordAuth: !!user?.hashedPassword,
      };
    } catch (error) {
      console.error("Get connected accounts error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch connected accounts",
      });
    }
  }),

  // Delete user account (soft delete - can be extended)
  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmPassword: z.string().optional(),
        confirmation: z.literal("DELETE_MY_ACCOUNT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // If user has password, verify it
        if (input.confirmPassword) {
          const user = await ctx.db.user.findUnique({
            where: { id: ctx.session.user.id },
            select: { hashedPassword: true },
          });

          if (user?.hashedPassword) {
            const isPasswordValid = await compare(
              input.confirmPassword,
              user.hashedPassword
            );

            if (!isPasswordValid) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Password is incorrect",
              });
            }
          }
        }

        // Delete user and all related data (cascading deletes handled by Prisma)
        await ctx.db.user.delete({
          where: { id: ctx.session.user.id },
        });

        return {
          success: true,
          message: "Account deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Delete account error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete account. Please try again.",
        });
      }
    }),

  // Get user statistics
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          _count: {
            select: {
              posts: true,
              socialAccounts: true,
              contentPosts: {
                where: { status: "published" },
              },
              schedules: {
                where: { isActive: true },
              },
            },
          },
          contentPosts: {
            where: { status: "published" },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!stats) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        totalPosts: stats._count.posts,
        connectedAccounts: stats._count.socialAccounts,
        publishedContent: stats._count.contentPosts,
        activeSchedules: stats._count.schedules,
        lastPostDate: stats.contentPosts[0]?.createdAt || null,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Get user stats error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user statistics",
      });
    }
  }),
});
