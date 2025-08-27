import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import { db } from "@/server/db";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { env } from "@/env";
import type { Workspace } from "@prisma/client";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isSuperAdmin?: boolean;
      workspaces?: Workspace[];
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isSuperAdmin?: boolean;
    workspaces?: Workspace[];
  }
  interface JWT {
    id?: string;
    isSuperAdmin?: boolean;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "Enter your email",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "Enter your password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await db.user.findUnique({
            where: {
              email: (credentials.email as string).toLowerCase().trim(),
            },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              hashedPassword: true,
              isSuperAdmin: true,
              workspaces: {
                select: {
                  workspace: true,
                },
              },
            },
          });

          if (!user || !user.hashedPassword) {
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password as string,
            user.hashedPassword
          );

          if (!isPasswordValid) {
            return null;
          }

          // Extract the actual workspace objects from the WorkspaceMember relation
          const workspaces = user.workspaces.map((wm) => wm.workspace);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            isSuperAdmin: user.isSuperAdmin,
            workspaces: workspaces,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  adapter: PrismaAdapter(db),
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isSuperAdmin = user.isSuperAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user = {
          ...session.user,
          id: token.id as string,
          isSuperAdmin: token.isSuperAdmin as boolean,
        };
      }
      if (token?.id) {
        const user = await db.user.findUnique({
          where: {
            id: token.id as string,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            hashedPassword: true,
            isSuperAdmin: true,
            workspaces: {
              select: {
                workspace: true,
              },
            },
          },
        });

        if (!user || !user.hashedPassword) {
          return session;
        }

        if (user) {
          // Extract the actual workspace objects from the WorkspaceMember relation
          const workspaces = user.workspaces.map((wm) => wm.workspace);

          session.user = {
            ...session.user,
            id: user.id,
            name: user.name ?? "",
            email: user.email ?? "",
            image: user.image ?? "",
            isSuperAdmin: user.isSuperAdmin,
            workspaces: workspaces,
          };
        }
      }
      return session;
    },
  },
  events: {
    createUser({ user }) {
      console.log("New user created:", user.email);
    },
    signIn({ user, account, isNewUser }) {
      console.log(
        "User signed in:",
        user.email,
        "via",
        account?.provider,
        isNewUser ? "(new user)" : ""
      );
    },
    async signOut(message) {
      if ("token" in message && message.token) {
        // For JWT-based sessions, the token is provided.
        console.log("User signed out (JWT session):", message.token.email);
      } else if ("session" in message && message.session) {
        // For database-based sessions, the session object is provided.
        // Note: AdapterSession might not always have an email.
        console.log(
          "User signed out (Database session):",
          message.session.userId
        );
      }
    },
  },
  debug: env.NODE_ENV === "development",
  secret: env.AUTH_SECRET,
};
