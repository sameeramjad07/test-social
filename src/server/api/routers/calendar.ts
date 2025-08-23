import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const calendarSchema = z.object({
  workspaceId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
});

export const calendarRouter = createTRPCRouter({
  getScheduledPosts: protectedProcedure
    .input(calendarSchema)
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

      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0);

      const posts = await ctx.db.post.findMany({
        where: {
          workspaceId: input.workspaceId,
          scheduledAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          content: true,
          scheduledAt: true,
          status: true,
          socialAccounts: {
            select: {
              platform: true,
            },
          },
        },
        orderBy: { scheduledAt: "asc" },
      });

      // Group by day
      const calendarData = posts
        .filter((post) => post.scheduledAt !== null)
        .reduce((acc, post) => {
          const day = post.scheduledAt!.getDate(); // safe because nulls are removed
          if (!acc[day]) acc[day] = [];
          acc[day].push(post);
          return acc;
        }, {} as Record<number, typeof posts>);

      return calendarData;
    }),
});
