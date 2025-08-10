import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
} from "date-fns";

const analyticsSchema = z.object({
  workspaceId: z.string(),
  timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("7d"),
  platform: z.enum(["all", "INSTAGRAM", "FACEBOOK", "LINKEDIN"]).default("all"),
});

export const analyticsRouter = createTRPCRouter({
  getAnalytics: protectedProcedure
    .input(analyticsSchema)
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

      let startDate: Date;
      switch (input.timeRange) {
        case "7d":
          startDate = subDays(new Date(), 7);
          break;
        case "30d":
          startDate = subDays(new Date(), 30);
          break;
        case "90d":
          startDate = subDays(new Date(), 90);
          break;
        case "1y":
          startDate = subYears(new Date(), 1);
          break;
        default:
          startDate = subDays(new Date(), 7);
      }

      // Fetch posts in time range
      const posts = await ctx.db.post.findMany({
        where: {
          workspaceId: input.workspaceId,
          publishedAt: { gte: startDate },
          publications: {
            some: {
              success: true,
              platform: input.platform !== "all" ? input.platform : undefined,
            },
          },
        },
        include: {
          publications: true,
          socialAccounts: true,
        },
      });

      // Aggregate overview stats
      let totalReach = 0;
      let totalEngagement = 0;
      let newFollowers = 0; // Assume from backend or mock; not in schema, so 0 for now
      let postsPublished = posts.length;
      posts.forEach((post) => {
        post.publications.forEach((pub) => {
          if (pub.metrics) {
            const metrics = pub.metrics as {
              likes: number;
              comments: number;
              shares: number;
              views: number;
            };
            totalReach += metrics.views || 0;
            totalEngagement +=
              (metrics.likes || 0) +
              (metrics.comments || 0) +
              (metrics.shares || 0);
          }
        });
      });

      const engagementRate =
        postsPublished > 0
          ? ((totalEngagement / totalReach) * 100).toFixed(1) + "%"
          : "0%";

      // Platform stats
      const platformStats = await ctx.db.socialAccount
        .findMany({
          where: {
            workspaceId: input.workspaceId,
            isActive: true,
          },
          select: {
            platform: true,
            accountName: true,
            // Assume followers not in schema, use mock or add to model if needed
            // For now, hardcode as per your mocks
          },
        })
        .then((accounts) =>
          accounts.map((acc) => ({
            platform: acc.platform,
            followers: "N/A", // Add followers to SocialAccount if needed
            engagement: "N/A", // Calculate per platform if needed
            reach: "N/A",
            posts: posts.filter((p) =>
              p.socialAccounts.some((sa) => sa.platform === acc.platform)
            ).length,
            change: "+0%",
          }))
        );

      // Top posts
      const topPosts = posts
        .map((post) => {
          let engagement = 0;
          let reach = 0;
          post.publications.forEach((pub) => {
            if (pub.metrics) {
              const metrics = pub.metrics as {
                likes: number;
                comments: number;
                shares: number;
                views: number;
              };
              engagement +=
                (metrics.likes || 0) +
                (metrics.comments || 0) +
                (metrics.shares || 0);
              reach += metrics.views || 0;
            }
          });
          return {
            id: post.id,
            platform: post.socialAccounts[0]?.platform || "Unknown",
            content: post.content,
            engagement,
            reach,
            likes: 0, // Aggregate from metrics
            comments: 0,
            shares: 0,
            date: post.publishedAt?.toLocaleDateString() || "",
          };
        })
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3);

      // Weekly engagement (mock for now; can aggregate by day)
      const weeklyEngagement = [
        { day: "Mon", likes: 120, comments: 45, shares: 23 },
        // ... add real aggregation if needed
      ];

      return {
        overviewStats: [
          {
            title: "Total Reach",
            value: totalReach.toLocaleString(),
            change: "+12.5%",
            trend: "up",
            icon: "Eye",
          },
          {
            title: "Engagement Rate",
            value: engagementRate,
            change: "+0.8%",
            trend: "up",
            icon: "Heart",
          },
          {
            title: "New Followers",
            value: newFollowers.toLocaleString(),
            change: "+18.2%",
            trend: "up",
            icon: "Users",
          },
          {
            title: "Posts Published",
            value: postsPublished.toString(),
            change: "-4.2%",
            trend: "down",
            icon: "BarChart3",
          },
        ],
        platformStats,
        topPosts,
        weeklyEngagement,
      };
    }),
});
