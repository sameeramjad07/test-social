// src/server/auth/helpers.ts
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import type { Workspace } from "@prisma/client";

/**
 * Get the server session
 */
export const getServerAuthSession = () => {
  return auth();
};

/**
 * Get user with full profile data
 */
export const getUserProfile = async (userId: string) => {
  return await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      emailVerified: true,
      workspaces: true,
    },
  });
};

/**
 * Check if user exists by email
 */
export const getUserByEmail = async (email: string) => {
  return await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      hashedPassword: true,
      workspaces: true,
    },
  });
};

/**
 * Middleware helper to require authentication
 */
export const requireAuth = async () => {
  const session = await getServerAuthSession();

  if (!session || !session.user) {
    throw new Error("Authentication required");
  }

  return session;
};

/**
 * Type for authenticated user session
 */
export type AuthenticatedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  workspaces: Workspace[];
};
