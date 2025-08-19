import { z } from "zod";
import { Platform, ScheduleFrequency } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const createScheduleSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)), // Expect ISO string
  endDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  frequency: z.nativeEnum(ScheduleFrequency),
  weekDays: z.array(z.number().min(0).max(6)).optional(),
  monthDays: z.array(z.number().min(1).max(31)).optional(),
  timeSlots: z
    .array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
    .min(1),
  platforms: z.array(z.nativeEnum(Platform)).min(1),
  postsPerSlot: z.number().min(1).default(1),
  contentPrompt: z.string().optional(),
  imagePrompt: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

const updateScheduleSchema = z.object({
  scheduleId: z.string(),
  workspaceId: z.string(),
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .transform((str) => new Date(str))
    .optional()
    .nullable(),
  frequency: z.nativeEnum(ScheduleFrequency).optional(),
  weekDays: z.array(z.number().min(0).max(6)).optional(),
  monthDays: z.array(z.number().min(1).max(31)).optional(),
  timeSlots: z
    .array(z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/))
    .optional(),
  platforms: z.array(z.nativeEnum(Platform)).optional(),
  postsPerSlot: z.number().min(1).optional(),
  contentPrompt: z.string().optional().nullable(),
  imagePrompt: z.string().optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const deleteScheduleSchema = z.object({
  scheduleId: z.string(),
  workspaceId: z.string(),
});

export const schedulesRouter = createTRPCRouter({
  // List schedules for a workspace
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
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

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "schedules" &&
            rp.permission.action === "read"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view schedules",
        });
      }

      const schedules = await ctx.db.postSchedule.findMany({
        where: {
          workspaceId: input.workspaceId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          startDate: true,
          endDate: true,
          frequency: true,
          weekDays: true,
          monthDays: true,
          timeSlots: true,
          platforms: true,
          postsPerSlot: true,
          contentPrompt: true,
          imagePrompt: true,
          hashtags: true,
          isActive: true,
          createdAt: true,
          posts: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      return schedules.map((schedule) => ({
        id: schedule.id,
        name: schedule.name,
        description: schedule.description,
        platforms: schedule.platforms,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        duration: schedule.endDate
          ? Math.ceil(
              (schedule.endDate.getTime() - schedule.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null,
        durationType: "days",
        frequency: schedule.frequency.toLowerCase(),
        isActive: schedule.isActive,
        createdAt: schedule.createdAt,
        postsGenerated: schedule.posts.length,
        totalPosts: schedule.postsPerSlot * schedule.timeSlots.length,
      }));
    }),

  // Create a new schedule
  create: protectedProcedure
    .input(createScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, ...scheduleData } = input;

      // Verify user has permission to create schedules
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
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "schedules" &&
            rp.permission.action === "create"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to create schedules",
        });
      }

      const schedule = await ctx.db.postSchedule.create({
        data: {
          workspaceId,
          ...scheduleData,
          hashtags: scheduleData.hashtags || [],
          weekDays: scheduleData.weekDays || [],
          monthDays: scheduleData.monthDays || [],
        },
      });

      return {
        success: true,
        schedule: {
          id: schedule.id,
          name: schedule.name,
          description: schedule.description,
          platforms: schedule.platforms,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          frequency: schedule.frequency,
          isActive: schedule.isActive,
          createdAt: schedule.createdAt,
        },
      };
    }),

  // Update an existing schedule
  update: protectedProcedure
    .input(updateScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId, ...updateData } = input;

      // Verify user has permission to update schedules
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
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "schedules" &&
            rp.permission.action === "update"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to update schedules",
        });
      }

      const schedule = await ctx.db.postSchedule.update({
        where: { id: scheduleId },
        data: updateData,
      });

      return {
        success: true,
        schedule: {
          id: schedule.id,
          name: schedule.name,
          description: schedule.description,
          platforms: schedule.platforms,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          frequency: schedule.frequency,
          isActive: schedule.isActive,
          createdAt: schedule.createdAt,
        },
      };
    }),

  // Delete a schedule
  delete: protectedProcedure
    .input(deleteScheduleSchema)
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, workspaceId } = input;

      // Verify user has permission to delete schedules
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
          message: "You are not a member of this workspace",
        });
      }

      const hasPermission =
        member.role.name === "owner" ||
        member.role.permissions.some(
          (rp) =>
            rp.permission.resource === "schedules" &&
            rp.permission.action === "delete"
        );

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete schedules",
        });
      }

      await ctx.db.postSchedule.delete({
        where: { id: scheduleId },
      });

      return { success: true };
    }),
});
