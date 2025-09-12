import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { uploadGeneratedImage } from "@/lib/uploadthing-server";

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

const updateMemberRoleSchema = z.object({
  workspaceId: z.string(),
  memberId: z.string(),
  roleId: z.string(),
});

const createRoleSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  permissionIds: z.array(z.string()),
});

const updateRoleSchema = z.object({
  workspaceId: z.string(),
  roleId: z.string(),
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  permissionIds: z.array(z.string()),
});

const deleteRoleSchema = z.object({
  workspaceId: z.string(),
  roleId: z.string(),
});

const removeMemberSchema = z.object({
  workspaceId: z.string(),
  memberId: z.string(),
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

        // Use uploadthing URL if provided
        let finalLogoUrl = logoUrl;
        if (logoUrl && logoUrl.startsWith("http")) {
          // (Optional) you could process it through uploadGeneratedImage
          // if you want consistency, like you do for posts
          try {
            finalLogoUrl = await uploadGeneratedImage(logoUrl);
          } catch (err) {
            console.error("Logo upload failed:", err);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to upload workspace logo",
            });
          }
        }

        const workspace = await tx.workspace.create({
          data: {
            name,
            slug,
            description,
            logoUrl: finalLogoUrl,
          },
        });

        if (!ctx.session.user.id) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        // Get system owner role
        let ownerRole = await tx.role.findFirst({
          where: { name: "owner", isSystem: true },
        });

        if (!ownerRole) {
          ownerRole = await tx.role.create({
            data: {
              name: "owner",
              description: "Full access to all workspace features",
              isSystem: true,
            },
          });

          // Assign all permissions to owner role
          const allPermissions = await tx.permission.findMany();
          if (allPermissions.length > 0) {
            await tx.rolePermission.createMany({
              data: allPermissions.map((permission) => ({
                roleId: ownerRole!.id,
                permissionId: permission.id,
              })),
            });
          }
        }

        // Add current user as owner of the new workspace
        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: ctx.session.user.id,
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

      const hasUpdatePermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "workspace" &&
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
        data.slug = newSlug;
      }

      const updatedWorkspace = await ctx.db.workspace.update({
        where: { id: workspaceId },
        data,
      });

      return { success: true, workspace: updatedWorkspace };
    }),

  // Delete workspace (requires owner permission)
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

      const hasDeletePermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "workspace" &&
            rp.permission.action === "delete"
        );

      if (!hasDeletePermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to delete workspace",
        });
      }

      await ctx.db.workspace.delete({
        where: { id: workspaceId },
      });

      return { success: true };
    }),

  // Get user's workspaces (with stats)
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

  // Get workspace members
  getMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { workspaceId } = input;

      // Check if user is a member
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

      const hasReadPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "workspace" &&
            rp.permission.action === "read"
        );

      if (!hasReadPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to view workspace members",
        });
      }

      return await ctx.db.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }),

  // Get workspace roles
  getRoles: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { workspaceId } = input;

      // Check if user is a member
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

      const hasReadPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "workspace" &&
            rp.permission.action === "read"
        );

      if (!hasReadPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No permission to view roles",
        });
      }

      return await ctx.db.role.findMany({
        where: {
          OR: [{ workspaceId }, { isSystem: true }],
        },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    }),

  // Get all permissions
  getPermissions: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.permission.findMany({
      select: {
        id: true,
        resource: true,
        action: true,
        description: true,
      },
    });
  }),

  // Update member role
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, memberId, roleId } = input;

      // Check if user is admin
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

      if (!member || member.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update member roles",
        });
      }

      // Verify role exists
      const role = await ctx.db.role.findUnique({
        where: { id: roleId },
        include: { permissions: true },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      await ctx.db.workspaceMember.update({
        where: { id: memberId },
        data: { roleId },
      });

      return { success: true };
    }),

  // Create custom role
  createRole: protectedProcedure
    .input(createRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, name, description, permissionIds } = input;

      // Check if user is admin
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

      if (!member || member.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create roles",
        });
      }

      // Verify permissions exist
      const permissions = await ctx.db.permission.findMany({
        where: { id: { in: permissionIds } },
      });

      if (permissions.length !== permissionIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more permission IDs are invalid",
        });
      }

      return await ctx.db.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            workspaceId,
            name,
            description,
            isSystem: false,
          },
        });

        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });

        return { success: true, role };
      });
    }),

  // Update custom role
  updateRole: protectedProcedure
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, roleId, name, description, permissionIds } = input;

      // Check if user is admin
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

      if (!member || member.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update roles",
        });
      }

      // Verify role exists and is not a system role
      const role = await ctx.db.role.findUnique({
        where: { id: roleId },
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

      // Verify permissions exist
      const permissions = await ctx.db.permission.findMany({
        where: { id: { in: permissionIds } },
      });

      if (permissions.length !== permissionIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more permission IDs are invalid",
        });
      }

      return await ctx.db.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
        });

        const updatedRole = await tx.role.update({
          where: { id: roleId },
          data: {
            name,
            description,
          },
        });

        return { success: true, role: updatedRole };
      });
    }),

  // Delete custom role
  deleteRole: protectedProcedure
    .input(deleteRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, roleId } = input;

      // Check if user is admin
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

      if (!member || member.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete roles",
        });
      }

      // Verify role exists and is not a system role
      const role = await ctx.db.role.findUnique({
        where: { id: roleId },
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
          message: "Cannot delete system roles",
        });
      }

      // Check if role is assigned to any members
      const membersWithRole = await ctx.db.workspaceMember.count({
        where: { roleId },
      });

      if (membersWithRole > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete role assigned to members",
        });
      }

      await ctx.db.role.delete({
        where: { id: roleId },
      });

      return { success: true };
    }),

  // Remove member from workspace
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, memberId } = input;

      // Check if user is admin
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

      if (!member || member.role.name !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can remove members",
        });
      }

      // Verify member exists and is not the owner
      const targetMember = await ctx.db.workspaceMember.findFirst({
        where: { id: memberId, workspaceId },
        include: { role: true },
      });

      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Member not found",
        });
      }

      if (targetMember.role.name === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the workspace owner",
        });
      }

      await ctx.db.workspaceMember.delete({
        where: { id: memberId },
      });

      return { success: true };
    }),
});
