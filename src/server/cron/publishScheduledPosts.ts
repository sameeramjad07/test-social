// src/server/cron/publishScheduledPosts.ts
import cron from "node-cron";
import { db } from "@/server/db"; // Adjust import
import { PostStatus } from "@prisma/client";
import { publishPostInternal } from "../api/utils/publishPost";

export function startPublishCron() {
  // Run every minute (adjust as needed, e.g., '*/5 * * * *' for every 5 minutes)
  cron.schedule("* * * * *", async () => {
    console.log("Running scheduled post publish cron...");

    try {
      const now = new Date();

      // Query for eligible posts: status SCHEDULED, scheduledAt <= now, has social accounts, schedule active (if exists)
      const posts = await db.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: { lte: now },
          socialAccounts: { some: {} }, // Ensure at least one social account
          schedule: { isActive: true }, // Assuming PostSchedule has 'active: boolean @default(true)'
        },
        include: {
          schedule: true, // Include to check active (if optional, the where clause will filter nulls implicitly if active is required)
        },
      });

      if (posts.length === 0) {
        console.log("No scheduled posts ready to publish.");
        return;
      }

      for (const post of posts) {
        try {
          // Publish using internal function
          const result = await publishPostInternal(post.id, post.workspaceId);
          console.log(`Published post ${post.id}:`, result);
        } catch (error) {
          console.error(`Failed to publish post ${post.id}:`, error);

          // Optionally update to FAILED if all attempts fail (but internal function already handles status updates)
          await db.post.update({
            where: { id: post.id },
            data: { status: PostStatus.FAILED },
          });
        }
      }
    } catch (error) {
      console.error("Cron job error:", error);
    }
  });

  console.log("Publish cron job started.");
}
