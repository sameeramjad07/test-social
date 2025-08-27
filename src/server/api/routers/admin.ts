import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { addDays, subDays, format } from "date-fns";

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(50),
});

const updateWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(50).optional(),
  plan: z.enum(["starter", "pro", "business", "enterprise"]).optional(),
});

const toggleWorkspaceStatusSchema = z.object({
  id: z.string(),
});

const deleteWorkspaceSchema = z.object({
  id: z.string(),
});

const toggleUserStatusSchema = z.object({
  userId: z.string(),
});

const reassignUserSchema = z.object({
  userId: z.string(),
  workspaceId: z.string(),
});

const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  permissionIds: z.array(z.string()),
});

const updateRoleSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string()),
});

const saveSettingsSchema = z.object({
  platform: z.object({
    maintenanceMode: z.boolean(),
    allowNewRegistrations: z.boolean(),
    requireEmailVerification: z.boolean(),
    maxWorkspacesPerUser: z.number().int().min(1),
    maxUsersPerWorkspace: z.number().int().min(1),
  }),
  ai: z.object({
    dailyGenerationLimit: z.number().int().min(0),
    monthlyGenerationLimit: z.number().int().min(0),
    enableImageGeneration: z.boolean(),
    enableTextGeneration: z.boolean(),
    defaultModel: z.string(),
  }),
  security: z.object({
    sessionTimeout: z.number().int().min(1),
    requireTwoFactor: z.boolean(),
    passwordMinLength: z.number().int().min(6),
    allowPasswordReset: z.boolean(),
  }),
  notifications: z.object({
    emailNotifications: z.boolean(),
    systemAlerts: z.boolean(),
    usageWarnings: z.boolean(),
    maintenanceNotices: z.boolean(),
  }),
});

const AIGenerationSchema = z.object({
  id: z.string(),
  user: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    avatar: z.string().nullable(), // Changed from optional() to nullable() to allow null
  }),
  workspace: z.object({
    name: z.string(),
    id: z.string(),
  }),
  type: z.enum(["TEXT", "IMAGE"]), // Matches AIGenerationType enum values
  prompt: z.string(),
  model: z.string(),
  tokens: z.number().nullable(), // Changed to nullable to match Prisma
  imageSize: z.string().nullable(), // Changed to nullable to match Prisma
  duration: z.number(),
  status: z.enum(["PROCESSING", "COMPLETED", "FAILED"]), // Matches AIGenerationStatus enum values
  cost: z.number(),
  createdAt: z.string(),
});

// Helper to convert logs to CSV (unchanged)
function logsToCsv(logs: any[]): string {
  const headers = [
    "ID",
    "User Name",
    "User Email",
    "Workspace Name",
    "Type",
    "Model",
    "Prompt",
    "Tokens",
    "Image Size",
    "Duration (s)",
    "Cost ($)",
    "Status",
    "Created At",
  ];
  let csv = headers.join(",") + "\n";
  for (const log of logs) {
    const row = [
      log.id,
      log.user.name || "Unknown",
      log.user.email || "N/A",
      log.workspace.name,
      log.type,
      log.model,
      `"${log.prompt.replace(/"/g, '""')}"`,
      log.tokens || "",
      log.imageSize || "",
      log.duration,
      log.cost,
      log.status,
      log.createdAt,
    ];
    csv += row.join(",") + "\n";
  }
  return csv;
}

export const adminRouter = createTRPCRouter({
  // Get dashboard statistics (previous procedures unchanged)
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const [workspaceCount, userCount, postCount, scheduledPostCount] =
      await Promise.all([
        ctx.db.workspace.count(),
        ctx.db.user.count(),
        ctx.db.post.count(),
        ctx.db.post.count({ where: { status: "SCHEDULED" } }),
      ]);

    const lastMonth = subDays(new Date(), 30);
    const [lastMonthPosts, lastMonthScheduled] = await Promise.all([
      ctx.db.post.count({ where: { createdAt: { lt: lastMonth } } }),
      ctx.db.post.count({
        where: { status: "SCHEDULED", createdAt: { lt: lastMonth } },
      }),
    ]);

    const postChange =
      lastMonthPosts > 0
        ? (((postCount - lastMonthPosts) / lastMonthPosts) * 100).toFixed(0) +
          "%"
        : "0%";
    const scheduledChange =
      lastMonthScheduled > 0
        ? (
            ((scheduledPostCount - lastMonthScheduled) / lastMonthScheduled) *
            100
          ).toFixed(0) + "%"
        : "0%";

    return {
      totalWorkspaces: {
        value: workspaceCount.toString(),
        change: "+0%",
        changeType: "neutral",
      },
      totalUsers: {
        value: userCount.toString(),
        change: "+0%",
        changeType: "neutral",
      },
      postsGenerated: {
        value: postCount.toString(),
        change: postChange,
        changeType: postChange.startsWith("-") ? "negative" : "positive",
      },
      scheduledPosts: {
        value: scheduledPostCount.toString(),
        change: scheduledChange,
        changeType: scheduledChange.startsWith("-") ? "negative" : "positive",
      },
    };
  }),

  // Get recent activity (previous procedure unchanged)
  getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const recentPosts = await ctx.db.post.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { workspace: true, createdBy: true },
    });

    const recentUsers = await ctx.db.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { workspaces: { include: { workspace: true } } },
    });

    const recentWorkspaces = await ctx.db.workspace.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    const activities = [
      ...recentPosts.map((post) => ({
        id: post.id,
        type: "post_generated",
        message: `Post created in "${post.workspace.name}" by ${
          post.createdBy.name || "User"
        }`,
        timestamp: format(post.createdAt, "MMM d, yyyy HH:mm"),
      })),
      ...recentUsers.map((user) => ({
        id: user.id,
        type: "user_added",
        message: `New user ${user.name || user.email} joined`,
        timestamp: format(user.createdAt, "MMM d, yyyy HH:mm"),
      })),
      ...recentWorkspaces.map((workspace) => ({
        id: workspace.id,
        type: "workspace_created",
        message: `New workspace "${workspace.name}" created`,
        timestamp: format(workspace.createdAt, "MMM d, yyyy HH:mm"),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 5);

    return activities;
  }),

  // Get AI usage trends (previous procedure unchanged)
  getAIUsageTrends: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    const days: {
      date: string;
      textGeneration: number;
      imageGeneration: number;
    }[] = [];

    for (let i = 0; i < 30; i += 7) {
      const currentDate = addDays(startDate, i);
      const nextDate = addDays(currentDate, 7);

      const [textPosts, imagePosts] = await Promise.all([
        ctx.db.post.count({
          where: {
            createdAt: { gte: currentDate, lt: nextDate },
            aiPrompt: { not: null },
          },
        }),
        ctx.db.postImage.count({
          where: {
            createdAt: { gte: currentDate, lt: nextDate },
            aiPrompt: { not: null },
          },
        }),
      ]);

      days.push({
        date: format(currentDate, "MMM d"),
        textGeneration: textPosts,
        imageGeneration: imagePosts,
      });
    }

    return days;
  }),

  // Updated procedures for AI logs
  getAILogs: protectedProcedure
    .output(z.array(AIGenerationSchema))
    .query(async ({ ctx }) => {
      const logs = await ctx.db.aIGenerationLog.findMany({
        include: {
          user: { select: { name: true, email: true, image: true } },
          workspace: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return logs.map((log) => ({
        id: log.id,
        user: {
          name: log.user.name || "Unknown",
          email: log.user.email || "N/A",
          avatar: log.user.image, // image is string | null, matches nullable schema
        },
        workspace: {
          id: log.workspace.id,
          name: log.workspace.name,
        },
        type: log.type, // Prisma returns "TEXT" | "IMAGE"
        prompt: log.prompt,
        model: log.model,
        tokens: log.tokens,
        imageSize: log.imageSize,
        duration: log.duration,
        status: log.status, // Prisma returns "PROCESSING" | "COMPLETED" | "FAILED"
        cost: log.cost,
        createdAt: log.createdAt.toISOString(),
      }));
    }),

  exportAILogs: protectedProcedure
    .output(z.string())
    .mutation(async ({ ctx }) => {
      const logs = await ctx.db.aIGenerationLog.findMany({
        include: {
          user: { select: { name: true, email: true, image: true } },
          workspace: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      const mappedLogs = logs.map((log) => ({
        id: log.id,
        user: {
          name: log.user.name || "Unknown",
          email: log.user.email || "N/A",
          avatar: log.user.image,
        },
        workspace: {
          id: log.workspace.id,
          name: log.workspace.name,
        },
        type: log.type,
        prompt: log.prompt,
        model: log.model,
        tokens: log.tokens,
        imageSize: log.imageSize,
        duration: log.duration,
        status: log.status,
        cost: log.cost,
        createdAt: log.createdAt.toISOString(),
      }));

      return logsToCsv(mappedLogs);
    }),

  // Get generation type distribution (previous procedure unchanged)
  getGenerationTypes: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const [textPosts, imagePosts] = await Promise.all([
      ctx.db.post.count({ where: { aiPrompt: { not: null } } }),
      ctx.db.postImage.count({ where: { aiPrompt: { not: null } } }),
    ]);

    const total = textPosts + imagePosts;
    if (total === 0) {
      return [
        { name: "Text Generation", value: 0, color: "hsl(var(--chart-1))" },
        { name: "Image Generation", value: 0, color: "hsl(var(--chart-2))" },
      ];
    }

    return [
      {
        name: "Text Generation",
        value: Math.round((textPosts / total) * 100),
        color: "hsl(var(--chart-1))",
      },
      {
        name: "Image Generation",
        value: Math.round((imagePosts / total) * 100),
        color: "hsl(var(--chart-2))",
      },
    ];
  }),

  // Get workspace activity (previous procedure unchanged)
  getWorkspaceActivity: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const lastWeek = subDays(new Date(), 7);
    const workspaces = await ctx.db.workspace.findMany({
      take: 5,
      orderBy: { posts: { _count: "desc" } },
      include: {
        _count: {
          select: { posts: { where: { createdAt: { gte: lastWeek } } } },
        },
      },
    });

    return workspaces.map((workspace) => ({
      workspace: workspace.name,
      posts: workspace._count.posts,
    }));
  }),

  // Workspaces: List all workspaces
  getWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const workspaces = await ctx.db.workspace.findMany({
      include: {
        members: { select: { id: true } }, // Include members to count them
        posts: { select: { id: true, createdAt: true } }, // Include posts to determine status
      },
      orderBy: { createdAt: "desc" },
    });

    return workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      // Simulate status based on recent activity (e.g., posts in last 30 days)
      status: workspace.posts.some(
        (post) => post.createdAt > subDays(new Date(), 30)
      )
        ? ("active" as const)
        : ("suspended" as const),
      userCount: workspace.members.length,
      createdAt: format(workspace.createdAt, "yyyy-MM-dd"),
    }));
  }),

  // Workspaces: Create a new workspace
  createWorkspace: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can create workspaces",
        });
      }

      if (!ctx.session.user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID is missing from session",
        });
      }

      const slug = input.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const workspace = await ctx.db.workspace.create({
        data: {
          name: input.name,
          slug: slug,
        },
      });

      // Create default roles and permissions (e.g., owner role)
      const ownerRole = await ctx.db.role.create({
        data: {
          workspaceId: workspace.id,
          name: "owner",
          description: "Workspace owner with full permissions",
          isSystem: false,
        },
      });

      // Assign the creator as the owner
      await ctx.db.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: ctx.session.user.id,
          roleId: ownerRole.id,
          joinedAt: new Date(),
        },
      });

      return {
        id: workspace.id,
        name: workspace.name,
        status: "active" as const,
        userCount: 1,
        createdAt: format(workspace.createdAt, "yyyy-MM-dd"),
      };
    }),

  // Workspaces: Update a workspace
  updateWorkspace: protectedProcedure
    .input(updateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can update workspaces",
        });
      }

      const workspace = await ctx.db.workspace.update({
        where: { id: input.id },
        data: {
          name: input.name,
          slug: input.name
            ? input.name
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "")
            : undefined,
        },
        include: { members: { select: { id: true } } },
      });

      return {
        id: workspace.id,
        name: workspace.name,
        status:
          (await ctx.db.post.count({
            where: {
              workspaceId: workspace.id,
              createdAt: { gt: subDays(new Date(), 30) },
            },
          })) > 0
            ? ("active" as const)
            : ("suspended" as const),
        userCount: workspace.members.length,
        createdAt: format(workspace.createdAt, "yyyy-MM-dd"),
      };
    }),

  // Workspaces: Toggle workspace status
  toggleWorkspaceStatus: protectedProcedure
    .input(toggleWorkspaceStatusSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can toggle workspace status",
        });
      }

      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.id },
        include: {
          members: { select: { id: true } },
          posts: { select: { id: true, createdAt: true } },
        },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      // Since isActive doesn't exist, we'll simulate toggling by enabling/disabling related entities
      // For example, toggle isActive on related social accounts
      const isCurrentlyActive = workspace.posts.some(
        (post) => post.createdAt > subDays(new Date(), 30)
      );
      await ctx.db.socialAccount.updateMany({
        where: { workspaceId: input.id },
        data: { isActive: !isCurrentlyActive },
      });

      const updatedWorkspace = await ctx.db.workspace.findUnique({
        where: { id: input.id },
        include: {
          members: { select: { id: true } },
          posts: { select: { id: true, createdAt: true } },
        },
      });

      if (!updatedWorkspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found after update",
        });
      }

      return {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        status: updatedWorkspace.posts.some(
          (post) => post.createdAt > subDays(new Date(), 30)
        )
          ? ("active" as const)
          : ("suspended" as const),
        userCount: updatedWorkspace.members.length,
        createdAt: format(updatedWorkspace.createdAt, "yyyy-MM-dd"),
      };
    }),

  // Workspaces: Delete a workspace
  deleteWorkspace: protectedProcedure
    .input(deleteWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can delete workspaces",
        });
      }

      await ctx.db.workspace.delete({
        where: { id: input.id },
      });

      return { id: input.id };
    }),

  // Users: List all users
  getUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const users = await ctx.db.user.findMany({
      include: {
        workspaces: {
          include: { workspace: true, role: true },
        },
        sessions: {
          orderBy: { expires: "desc" },
          take: 1,
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name || "Unknown",
      email: user.email || "Unknown",
      workspace: user.workspaces[0]?.workspace.name || "No Workspace",
      workspaceId: user.workspaces[0]?.workspaceId || "",
      status: user.isSuperAdmin
        ? ("active" as const)
        : user.workspaces.length > 0
        ? ("active" as const)
        : ("suspended" as const),
      role: user.workspaces[0]?.role.name || "member",
      joinedAt: format(user.createdAt, "yyyy-MM-dd"),
      lastActive: user.sessions[0]?.expires
        ? format(user.sessions[0].expires, "yyyy-MM-dd HH:mm")
        : "Never",
      avatar: user.image || undefined,
    }));
  }),

  // Users: Toggle user status
  toggleUserStatus: protectedProcedure
    .input(toggleUserStatusSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can toggle user status",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          workspaces: { include: { workspace: true, role: true } },
          sessions: { orderBy: { expires: "desc" }, take: 1 },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Simulate toggling user status by enabling/disabling their workspace memberships
      const isCurrentlyActive = user.workspaces.length > 0;
      if (isCurrentlyActive) {
        await ctx.db.workspaceMember.deleteMany({
          where: { userId: input.userId },
        });
      } else {
        // Reassign to a default workspace if none exists
        const defaultWorkspace = await ctx.db.workspace.findFirst();
        if (defaultWorkspace) {
          let memberRole = await ctx.db.role.findFirst({
            where: { workspaceId: defaultWorkspace.id, name: "member" },
          });

          if (!memberRole) {
            memberRole = await ctx.db.role.create({
              data: {
                workspaceId: defaultWorkspace.id,
                name: "member",
                description: "Default member role",
                isSystem: false,
              },
            });
          }

          await ctx.db.workspaceMember.create({
            data: {
              workspaceId: defaultWorkspace.id,
              userId: input.userId,
              roleId: memberRole.id,
              joinedAt: new Date(),
            },
          });
        }
      }

      const updatedUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          workspaces: { include: { workspace: true, role: true } },
          sessions: { orderBy: { expires: "desc" }, take: 1 },
        },
      });

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found after update",
        });
      }

      return {
        id: updatedUser.id,
        name: updatedUser.name || "Unknown",
        email: updatedUser.email || "Unknown",
        workspace: updatedUser.workspaces[0]?.workspace.name || "No Workspace",
        workspaceId: updatedUser.workspaces[0]?.workspaceId || "",
        status: updatedUser.isSuperAdmin
          ? ("active" as const)
          : updatedUser.workspaces.length > 0
          ? ("active" as const)
          : ("suspended" as const),
        role: updatedUser.workspaces[0]?.role.name || "member",
        joinedAt: format(updatedUser.createdAt, "yyyy-MM-dd"),
        lastActive: updatedUser.sessions[0]?.expires
          ? format(updatedUser.sessions[0].expires, "yyyy-MM-dd HH:mm")
          : "Never",
        avatar: updatedUser.image || undefined,
      };
    }),

  // Users: Reassign user to a different workspace
  reassignUser: protectedProcedure
    .input(reassignUserSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can reassign users",
        });
      }

      const workspace = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });

      if (!workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      // Find or create a "member" role for the new workspace
      let memberRole = await ctx.db.role.findFirst({
        where: { workspaceId: input.workspaceId, name: "member" },
      });

      if (!memberRole) {
        memberRole = await ctx.db.role.create({
          data: {
            workspaceId: input.workspaceId,
            name: "member",
            description: "Default member role",
            isSystem: false,
          },
        });
      }

      // Update or create workspace membership
      await ctx.db.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: input.userId,
          },
        },
        update: { roleId: memberRole.id },
        create: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          roleId: memberRole.id,
          joinedAt: new Date(),
        },
      });

      // Remove the user from their previous workspace
      await ctx.db.workspaceMember.deleteMany({
        where: {
          userId: input.userId,
          workspaceId: { not: input.workspaceId },
        },
      });

      const updatedUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
        include: {
          workspaces: { include: { workspace: true, role: true } },
          sessions: { orderBy: { expires: "desc" }, take: 1 },
        },
      });

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        id: updatedUser.id,
        name: updatedUser.name || "Unknown",
        email: updatedUser.email || "Unknown",
        workspace: updatedUser.workspaces[0]?.workspace.name || "No Workspace",
        workspaceId: updatedUser.workspaces[0]?.workspaceId || "",
        status: updatedUser.isSuperAdmin
          ? ("active" as const)
          : updatedUser.workspaces.length > 0
          ? ("active" as const)
          : ("suspended" as const),
        role: updatedUser.workspaces[0]?.role.name || "member",
        joinedAt: format(updatedUser.createdAt, "yyyy-MM-dd"),
        lastActive: updatedUser.sessions[0]?.expires
          ? format(updatedUser.sessions[0].expires, "yyyy-MM-dd HH:mm")
          : "Never",
        avatar: updatedUser.image || undefined,
      };
    }),

  // Users: Delete a user
  deleteUser: protectedProcedure
    .input(toggleUserStatusSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can delete users",
        });
      }

      await ctx.db.user.delete({
        where: { id: input.userId },
      });

      return { id: input.userId };
    }),

  // Roles: List all roles
  getRoles: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access roles",
      });
    }

    const roles = await ctx.db.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || "",
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => ({
        id: rp.permissionId,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description || "",
      })),
    }));
  }),

  // Permissions: List all permissions
  getPermissions: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access permissions",
      });
    }

    const permissions = await ctx.db.permission.findMany();
    return permissions.map((perm) => ({
      id: perm.id,
      resource: perm.resource,
      action: perm.action,
      description: perm.description || "",
    }));
  }),

  // Roles: Create a new role
  createRole: protectedProcedure
    .input(createRoleSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can create roles",
        });
      }

      const role = await ctx.db.role.create({
        data: {
          name: input.name,
          description: input.description,
          isSystem: false,
        },
      });

      if (input.permissionIds.length > 0) {
        await ctx.db.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
            createdAt: new Date(),
          })),
        });
      }

      const createdRole = await ctx.db.role.findUnique({
        where: { id: role.id },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });

      if (!createdRole) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch created role",
        });
      }

      return {
        id: createdRole.id,
        name: createdRole.name,
        description: createdRole.description || "",
        isSystem: createdRole.isSystem,
        permissions: createdRole.permissions.map((rp) => ({
          id: rp.permissionId,
          resource: rp.permission.resource,
          action: rp.permission.action,
          description: rp.permission.description || "",
        })),
      };
    }),

  // Roles: Update a role
  updateRole: protectedProcedure
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can update roles",
        });
      }

      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot update system roles",
        });
      }

      await ctx.db.role.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
        },
      });

      await ctx.db.rolePermission.deleteMany({
        where: { roleId: input.id },
      });

      if (input.permissionIds.length > 0) {
        await ctx.db.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({
            roleId: input.id,
            permissionId,
            createdAt: new Date(),
          })),
        });
      }

      const updatedRole = await ctx.db.role.findUnique({
        where: { id: input.id },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });

      if (!updatedRole) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch updated role",
        });
      }

      return {
        id: updatedRole.id,
        name: updatedRole.name,
        description: updatedRole.description || "",
        isSystem: updatedRole.isSystem,
        permissions: updatedRole.permissions.map((rp) => ({
          id: rp.permissionId,
          resource: rp.permission.resource,
          action: rp.permission.action,
          description: rp.permission.description || "",
        })),
      };
    }),

  getPosts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can access this data",
      });
    }

    const posts = await ctx.db.post.findMany({
      include: {
        workspace: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        images: { select: { url: true }, orderBy: { order: "asc" } },
        socialAccounts: { select: { platform: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return posts.map((post) => ({
      id: post.id,
      workspace: {
        id: post.workspace.id,
        name: post.workspace.name,
      },
      user: {
        name: post.createdBy.name,
        email: post.createdBy.email,
        avatar: post.createdBy.image ?? undefined,
      },
      content: post.content,
      caption: post.caption ?? undefined,
      socialAccounts: post.socialAccounts.map((account) => ({
        platform: account.platform,
      })),
      images: post.images,
      scheduledAt: post.scheduledAt?.toISOString() ?? new Date().toISOString(),
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      generatedBy: post.aiPrompt ? "AI" : "MANUAL",
    }));
  }),

  getUserPermissions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const workspaceMembers = await ctx.db.workspaceMember.findMany({
      where: { userId },
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

    const permissions = workspaceMembers.flatMap((member) =>
      member.role.permissions.map((rp) => ({
        id: rp.permissionId,
        resource: rp.permission.resource,
        action: rp.permission.action,
      }))
    );

    // Remove duplicates by permission ID
    const uniquePermissions = Array.from(
      new Map(permissions.map((p) => [p.id, p])).values()
    );

    return uniquePermissions;
  }),

  togglePostStatus: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        status: z.enum([
          "DRAFT",
          "CONTENT_PENDING_APPROVAL",
          "CONTENT_APPROVED",
          "IMAGE_GENERATION_PENDING",
          "IMAGE_PENDING_APPROVAL",
          "IMAGE_APPROVED",
          "APPROVED",
          "SCHEDULED",
          "PUBLISHING",
          "PUBLISHED",
          "FAILED",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const permissions = await ctx.db.workspaceMember.findMany({
        where: { userId },
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

      const hasUpdatePermission = permissions.some((member) =>
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "posts" &&
            rp.permission.action === "update"
        )
      );

      if (!hasUpdatePermission) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You lack permission to update posts",
        });
      }

      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      await ctx.db.post.update({
        where: { id: input.postId },
        data: { status: input.status },
      });

      return { success: true };
    }),

  deletePost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can delete posts",
        });
      }

      const post = await ctx.db.post.findUnique({
        where: { id: input.postId },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      await ctx.db.post.delete({
        where: { id: input.postId },
      });

      return { success: true };
    }),

  // Settings: Save system settings
  saveSettings: protectedProcedure
    .input(saveSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isSuperAdmin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only super admins can save settings",
        });
      }

      // Placeholder: In a real app, save to a settings table or file
      // For now, return the input as if saved
      return input;
    }),

  // Data: Export platform data
  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can export data",
      });
    }

    // Placeholder: Implement actual export logic (e.g., generate JSON/CSV)
    return { message: "Data export initiated" };
  }),

  // Data: Import platform data
  importData: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session.user.isSuperAdmin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Only super admins can import data",
      });
    }

    // Placeholder: Implement actual import logic
    return { message: "Data import initiated" };
  }),
});
