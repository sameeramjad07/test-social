import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { authRouter } from "./routers/auth";
import { postsRouter } from "./routers/post";
import { socialAccountsRouter } from "./routers/socialAccounts";
import { workspacesRouter } from "./routers/workspace";
import { schedulesRouter } from "./routers/schedules";
import { analyticsRouter } from "./routers/analytics";
import { calendarRouter } from "./routers/calendar";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  posts: postsRouter,
  socialAccounts: socialAccountsRouter,
  auth: authRouter,
  workspaces: workspacesRouter,
  schedules: schedulesRouter,
  analytics: analyticsRouter,
  calendar: calendarRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
