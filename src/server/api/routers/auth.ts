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
  workspaceName: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(50, "Workspace name must be less than 50 characters")
    .optional(),
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

// Helper function to create a URL-friendly slug
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export const authRouter = createTRPCRouter({
  // Sign up with email and password
  signUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, email, password, workspaceName } = input;

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

        // Create user and their first workspace in a transaction
        const result = await ctx.db.$transaction(async (tx) => {
          // Create user
          const user = await tx.user.create({
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

          // Create default workspace
          const defaultWorkspaceName = workspaceName || `${name.trim()}'s Workspace`;
          let slug = createSlug(defaultWorkspaceName);
          
          // Ensure unique slug
          let slugSuffix = 1;
          while (await tx.workspace.findUnique({ where: { slug } })) {
            slug = `${createSlug(defaultWorkspaceName)}-${slugSuffix}`;
            slugSuffix++;
          }

          const workspace = await tx.workspace.create({
            data: {
              name: defaultWorkspaceName,
              slug,
            },
          });

          // Get or create owner role
          let ownerRole = await tx.role.findFirst({
            where: {
              name: "owner",
              isSystem: true,
            },
          });

          if (!ownerRole) {
            // Create system owner role if it doesn't exist
            ownerRole = await tx.role.create({
              data: {
                name: "owner",
                description: "Full access to all workspace features",
                isSystem: true,
              },
            });

            // Get all permissions and assign to owner role
            const allPermissions = await tx.permission.findMany();
            const oRole = ownerRole
            if (allPermissions.length > 0) {
              await tx.rolePermission.createMany({
                data: allPermissions.map((permission) => ({
                  roleId: oRole.id,
                  permissionId: permission.id,
                })),
              });
            }
          }

          // Add user as workspace owner
          await tx.workspaceMember.create({
            data: {
              workspaceId: workspace.id,
              userId: user.id,
              roleId: ownerRole.id,
            },
          });

          return { user, workspace };
        });

        return {
          success: true,
          message: "Account created successfully! You can now sign in.",
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            image: result.user.image,
            createdAt: result.user.createdAt,
          },
          workspace: {
            id: result.workspace.id,
            name: result.workspace.name,
            slug: result.workspace.slug,
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
          createdAt: true,
          updatedAt: true,
          emailVerified: true,
          workspaces: {
            select: {
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logoUrl: true,
                  _count: {
                    select: {
                      members: true,
                      posts: true,
                      socialAccounts: true,
                    },
                  },
                },
              },
              role: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
              joinedAt: true,
            },
            orderBy: {
              joinedAt: 'asc',
            },
          },
          _count: {
            select: {
              createdPosts: true,
              approvals: true,
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
        workspaces: user.workspaces.map((wm) => ({
          id: wm.workspace.id,
          name: wm.workspace.name,
          slug: wm.workspace.slug,
          logoUrl: wm.workspace.logoUrl,
          role: wm.role,
          joinedAt: wm.joinedAt,
          stats: {
            members: wm.workspace._count.members,
            posts: wm.workspace._count.posts,
            socialAccounts: wm.workspace._count.socialAccounts,
          },
        })),
        stats: {
          totalPosts: user._count.createdPosts,
          totalApprovals: user._count.approvals,
          workspaceCount: user.workspaces.length,
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

  // Delete user account
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

        // Check if user is the only owner of any workspace
        const workspacesAsOwner = await ctx.db.workspaceMember.findMany({
          where: {
            userId: ctx.session.user.id,
            role: {
              name: "owner",
            },
          },
          include: {
            workspace: {
              include: {
                members: {
                  where: {
                    role: {
                      name: "owner",
                    },
                  },
                },
              },
            },
          },
        });

        const workspacesWithSingleOwner = workspacesAsOwner.filter(
          (wm) => wm.workspace.members.length === 1
        );

        if (workspacesWithSingleOwner.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `You are the only owner of ${workspacesWithSingleOwner.length} workspace(s). Please transfer ownership or delete these workspaces before deleting your account.`,
          });
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

  // Get user statistics across all workspaces
  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get all workspaces user is a member of
      const workspaceMemberships = await ctx.db.workspaceMember.findMany({
        where: { userId: ctx.session.user.id },
        select: {
          workspaceId: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      const workspaceIds = workspaceMemberships.map((wm) => wm.workspaceId);

      // Aggregate stats across all workspaces
      const [
        totalPosts,
        publishedPosts,
        socialAccounts,
        activeSchedules,
        lastPost,
      ] = await Promise.all([
        // Total posts created by user
        ctx.db.post.count({
          where: {
            createdById: ctx.session.user.id,
            workspaceId: { in: workspaceIds },
          },
        }),
        // Published posts
        ctx.db.post.count({
          where: {
            createdById: ctx.session.user.id,
            workspaceId: { in: workspaceIds },
            status: "PUBLISHED",
          },
        }),
        // Total social accounts across workspaces
        ctx.db.socialAccount.count({
          where: {
            workspaceId: { in: workspaceIds },
            isActive: true,
          },
        }),
        // Active schedules
        ctx.db.postSchedule.count({
          where: {
            workspaceId: { in: workspaceIds },
            isActive: true,
          },
        }),
        // Last published post
        ctx.db.post.findFirst({
          where: {
            createdById: ctx.session.user.id,
            workspaceId: { in: workspaceIds },
            status: "PUBLISHED",
          },
          orderBy: { publishedAt: "desc" },
          select: { publishedAt: true },
        }),
      ]);

      // Count workspaces by role
      const workspacesByRole = workspaceMemberships.reduce((acc, wm) => {
        const role = wm.role.name;
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalPosts,
        publishedPosts,
        connectedAccounts: socialAccounts,
        activeSchedules,
        lastPostDate: lastPost?.publishedAt || null,
        workspaces: {
          total: workspaceMemberships.length,
          byRole: workspacesByRole,
        },
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

  // Get workspaces user has access to
  getWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    try {
      const workspaces = await ctx.db.workspaceMember.findMany({
        where: { userId: ctx.session.user.id },
        select: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              createdAt: true,
              _count: {
                select: {
                  members: true,
                  posts: true,
                  socialAccounts: true,
                },
              },
            },
          },
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          joinedAt: true,
        },
        orderBy: {
          joinedAt: 'asc',
        },
      });

      return workspaces.map((wm) => ({
        id: wm.workspace.id,
        name: wm.workspace.name,
        slug: wm.workspace.slug,
        logoUrl: wm.workspace.logoUrl,
        role: wm.role,
        joinedAt: wm.joinedAt,
        createdAt: wm.workspace.createdAt,
        stats: {
          members: wm.workspace._count.members,
          posts: wm.workspace._count.posts,
          socialAccounts: wm.workspace._count.socialAccounts,
        },
      }));
    } catch (error) {
      console.error("Get workspaces error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch workspaces",
      });
    }
  }),
});