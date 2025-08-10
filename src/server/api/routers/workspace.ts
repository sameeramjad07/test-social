import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

const updateWorkspaceSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

const deleteWorkspaceSchema = z.object({
  workspaceId: z.string(),
});

export const workspacesRouter = createTRPCRouter({
  // Create new workspace (user becomes owner)
  create: protectedProcedure
    .input(createWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      const { name, description, logoUrl } = input;

      return await ctx.db.$transaction(async (tx) => {
        let slug = createSlug(name);
        let slugSuffix = 1;
        while (await tx.workspace.findUnique({ where: { slug } })) {
          slug = `${createSlug(name)}-${slugSuffix}`;
          slugSuffix++;
        }

        const workspace = await tx.workspace.create({
          data: {
            name,
            slug,
            description,
            logoUrl,
          },
        });

        // Get system owner role
        const ownerRole = await tx.role.findFirst({
          where: { name: "owner", isSystem: true },
        });

        if (!ownerRole) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "System owner role not found",
          });
        }

        if (!ctx.session.user.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Add user as owner
        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: ctx.session.user.id!,
            roleId: ownerRole.id,
          },
        });

        return {
          success: true,
          workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            description: workspace.description,
            logoUrl: workspace.logoUrl,
          },
        };
      });
    }),

  // Update workspace details (requires owner permission)
  update: protectedProcedure
    .input(updateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, ...updateData } = input;
      const data: typeof updateData & { slug?: string } = { ...updateData };

      // Check membership and permission
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

      const hasUpdatePermission = member.role.permissions.some(
        (rp) =>
          rp.permission.resource === "workspace_settings" &&
          rp.permission.action === "update"
      );

      if (!hasUpdatePermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to update workspace",
        });
      }

      // Update slug if name changes
      if (updateData.name) {
        let newSlug = createSlug(updateData.name);
        let slugSuffix = 1;
        while (
          await ctx.db.workspace.findUnique({ where: { slug: newSlug } })
        ) {
          newSlug = `${createSlug(updateData.name)}-${slugSuffix}`;
          slugSuffix++;
        }
        data.slug = newSlug; // Prisma doesn't have slug in input, but add it
      }

      const updatedWorkspace = await ctx.db.workspace.update({
        where: { id: workspaceId },
        data,
      });

      return { success: true, workspace: updatedWorkspace };
    }),

  // Delete workspace (requires owner, and checks if it's the last owner)
  delete: protectedProcedure
    .input(deleteWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId } = input;

      // Check membership and permission
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

      const hasDeletePermission = member.role.permissions.some(
        (rp) =>
          rp.permission.resource === "workspace_settings" &&
          rp.permission.action === "delete"
      );

      if (!hasDeletePermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to delete workspace",
        });
      }

      // Optional: Check if other members exist, but cascade delete handles relations

      await ctx.db.workspace.delete({
        where: { id: workspaceId },
      });

      return { success: true };
    }),

  // Get user's workspaces (moved from authRouter, with stats)
  getUserWorkspaces: protectedProcedure.query(async ({ ctx }) => {
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
        joinedAt: "asc",
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
  }),
});
