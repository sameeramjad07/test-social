"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Platform } from "@prisma/client";
import { api } from "@/trpc/react";
import { ConnectAccountButton } from "@/components/social-accounts/ConnectAccountButton";
import { SocialAccountsList } from "@/components/social-accounts/SocialAccountsList";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SocialAccountsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  // Fetch workspace data to verify access
  const { data: workspaces } = api.workspaces.getUserWorkspaces.useQuery(
    undefined,
    {
      enabled: !!session,
    }
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (workspaces && !workspaces.some((ws) => ws.id === workspaceId)) {
      toast.error("Access denied to this workspace");
      router.push("/dashboard");
    }
  }, [status, workspaces, workspaceId, router]);

  if (status === "loading" || !workspaces) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !workspaces.some((ws) => ws.id === workspaceId)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Social Media Accounts
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Connect and manage your social media accounts to publish content
            across platforms.
          </p>
        </motion.div>

        <Tabs defaultValue="connected" className="space-y-6">
          <TabsList className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <TabsTrigger value="connected">Connected Accounts</TabsTrigger>
            <TabsTrigger value="add">Add New Account</TabsTrigger>
          </TabsList>

          <TabsContent value="connected" className="space-y-4">
            <SocialAccountsList workspaceId={workspaceId} />
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Connect New Account</CardTitle>
                <CardDescription>
                  Choose a platform to connect. You'll be redirected to
                  authenticate with your social media account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <ConnectAccountButton
                    platform={Platform.INSTAGRAM}
                    workspaceId={workspaceId}
                  />
                  <ConnectAccountButton
                    platform={Platform.FACEBOOK}
                    workspaceId={workspaceId}
                  />
                  <ConnectAccountButton
                    platform={Platform.LINKEDIN}
                    workspaceId={workspaceId}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Platform Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Instagram
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Requires a Facebook Business account and Instagram
                    Business/Creator profile.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    Facebook
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You must be an admin of the Facebook Page you want to
                    connect.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    LinkedIn
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Connect your personal LinkedIn profile to share posts.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
