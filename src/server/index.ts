// Example in a custom server or app bootstrap
import { startPublishCron } from "./cron/publishScheduledPosts";

if (process.env.NODE_ENV !== "development") {
  // Avoid in development
  startPublishCron();
}
