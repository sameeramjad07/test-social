"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import type { PostSchedule } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  FileText,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ScheduleCreationDialog } from "@/components/dashboard/schedule-dialog";
import { AIContentAssistant } from "@/components/dashboard/ai-content-assistant";

export default function WorkspaceDashboardPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);

  // Debug workspaceId availability
  useEffect(() => {
    console.log("Workspace ID:", workspaceId);
  }, [workspaceId]);

  // Fetch workspace data
  const { data: workspace } = api.workspaces.getUserWorkspaces.useQuery(
    undefined,
    {
      select: (workspaces) => workspaces?.find((ws) => ws.id === workspaceId),
    }
  );

  // Fetch social accounts
  const { data: socialAccounts } = api.socialAccounts.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  // Fetch schedules
  const {
    data: schedules = [],
    isLoading: isSchedulesLoading,
    isFetching: isSchedulesFetching,
    refetch,
  } = api.schedules.list.useQuery(
    { workspaceId },
    {
      initialData: [],
      staleTime: 0,
      refetchOnMount: "always",
    }
  );

  // Debug schedules fetch
  useEffect(() => {
    if (schedules) {
      console.log("Schedules fetched:", schedules);
    }
  }, [schedules]);

  // Fetch stats
  const { data: userStats } = api.auth.getUserStats.useQuery(undefined, {
    select: (stats) => ({
      totalPosts: stats.totalPosts,
      publishedPosts: stats.publishedPosts,
      connectedAccounts: stats.connectedAccounts,
      activeSchedules: stats.activeSchedules,
    }),
  });

  useEffect(() => {
    if (status === "unauthenticated" && !isRedirecting) {
      setIsRedirecting(true);
      router.push("/auth/signin");
    }
    if (
      session &&
      !session.user.workspaces?.some((ws) => ws.id === workspaceId)
    ) {
      toast.error("Access denied to this workspace");
      router.push("/dashboard");
    }
  }, [status, session, workspaceId, router, isRedirecting]);

  if (status === "loading" || isRedirecting || !workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  const stats = [
    {
      title: "Active Schedules",
      value: userStats?.activeSchedules.toString() || "0",
      change: "+1",
      icon: Calendar,
    },
    {
      title: "Draft Schedules",
      value: schedules.filter((s) => s.isActive === false).length.toString(),
      change: "0",
      icon: FileText,
    },
    {
      title: "Posts This Month",
      value: userStats?.publishedPosts.toString() || "0",
      change: "+6",
      icon: BarChart3,
    },
    // {
    //   title: "Total Reach",
    //   value:
    //     socialAccounts
    //       ?.reduce((sum, acc) => sum + (acc.followers || 0), 0)
    //       .toLocaleString() || "0",
    //   change: "+12%",
    //   icon: TrendingUp,
    // },
  ];

  const platformIcons = {
    INSTAGRAM: { icon: Instagram, color: "bg-pink-500" },
    TWITTER: { icon: Twitter, color: "bg-blue-500" },
    FACEBOOK: { icon: Facebook, color: "bg-blue-600" },
    LINKEDIN: { icon: Linkedin, color: "bg-blue-700" },
  };

  const handleEditSchedule = (scheduleId: string) => {
    router.push(`/workspace/${workspaceId}/schedule/${scheduleId}/edit`);
  };

  const handleViewSchedule = (scheduleId: string) => {
    router.push(`/workspace/${workspaceId}/schedule/${scheduleId}`);
  };

  return (
    <div className="min-h-screen dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Welcome back to {workspace.name},{" "}
            {session.user.name || session.user.email}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your AI-powered social media schedules
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {stat.value}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {stat.change} from last month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* AI Content Assistant */}
        <AIContentAssistant
          workspaceId={workspaceId}
          onCreateSchedule={() => setIsCreateScheduleOpen(true)}
          onEditSchedule={handleEditSchedule}
          onViewSchedule={handleViewSchedule}
        />

        {/* Connected Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Connected Accounts</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {socialAccounts?.map((account, index) => {
                  const { icon: Icon, color } = platformIcons[
                    account.platform as keyof typeof platformIcons
                  ] || {
                    icon: Zap,
                    color: "bg-gray-500",
                  };
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div
                        className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {account.accountName || account.platform}
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires:{" "}
                          {account.expiresAt
                            ? new Date(account.expiresAt).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                      <Badge
                        variant="default"
                        className="ml-auto bg-green-100 text-green-700"
                      >
                        Connected
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule Creation Dialog */}
        <ScheduleCreationDialog
          isOpen={isCreateScheduleOpen}
          onOpenChange={setIsCreateScheduleOpen}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  );
}
