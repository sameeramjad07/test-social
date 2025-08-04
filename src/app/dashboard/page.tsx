"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

interface Schedule {
  id: string;
  name: string;
  platforms: string[];
  duration: number;
  durationType: "days" | "weeks" | "months";
  frequency: string;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: Date;
  postsGenerated: number;
  totalPosts: number;
  description?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: "1",
      name: "Product Launch Campaign",
      platforms: ["Instagram", "Twitter", "LinkedIn"],
      duration: 4,
      durationType: "weeks",
      frequency: "daily",
      status: "active",
      createdAt: new Date(2025, 0, 10),
      postsGenerated: 18,
      totalPosts: 28,
      description: "Comprehensive campaign for new AI feature launch",
    },
    {
      id: "2",
      name: "Brand Awareness Drive",
      platforms: ["Facebook", "Instagram"],
      duration: 2,
      durationType: "months",
      frequency: "every-2-days",
      status: "draft",
      createdAt: new Date(2025, 0, 12),
      postsGenerated: 0,
      totalPosts: 30,
      description: "Building brand recognition across social platforms",
    },
    {
      id: "3",
      name: "Holiday Special",
      platforms: ["Instagram", "Twitter", "Facebook", "LinkedIn"],
      duration: 10,
      durationType: "days",
      frequency: "twice-daily",
      status: "completed",
      createdAt: new Date(2024, 11, 20),
      postsGenerated: 20,
      totalPosts: 20,
      description: "Holiday season promotional content",
    },
  ]);

  useEffect(() => {
    if (status === "unauthenticated" && !isRedirecting) {
      setIsRedirecting(true);
      router.push("/auth/signin");
    }
  }, [status, router, isRedirecting]);

  if (status === "loading" || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  const socialAccounts = [
    {
      platform: "Instagram",
      username: "@yourhandle",
      followers: "12.5K",
      connected: true,
      color: "bg-pink-500",
      icon: Instagram,
    },
    {
      platform: "Twitter",
      username: "@yourhandle",
      followers: "8.2K",
      connected: true,
      color: "bg-blue-500",
      icon: Twitter,
    },
    {
      platform: "Facebook",
      username: "Your Page",
      followers: "15.8K",
      connected: true,
      color: "bg-blue-600",
      icon: Facebook,
    },
    {
      platform: "LinkedIn",
      username: "Your Profile",
      followers: "5.3K",
      connected: true,
      color: "bg-blue-700",
      icon: Linkedin,
    },
  ];

  const stats = [
    {
      title: "Active Schedules",
      value: schedules.filter((s) => s.status === "active").length.toString(),
      change: "+1",
      icon: Calendar,
    },
    {
      title: "Draft Schedules",
      value: schedules.filter((s) => s.status === "draft").length.toString(),
      change: "0",
      icon: FileText,
    },
    { title: "Posts This Month", value: "24", change: "+6", icon: BarChart3 },
    { title: "Total Reach", value: "124.5K", change: "+12%", icon: TrendingUp },
  ];

  const handleCreateSchedule = (schedule: Schedule) => {
    setSchedules((prev) => [...prev, schedule]);
  };

  const handleScheduleAction = (
    scheduleId: string,
    action: "edit" | "delete" | "pause" | "resume"
  ) => {
    switch (action) {
      case "edit":
        router.push(`/dashboard/schedule/${scheduleId}`);
        break;
      case "delete":
        setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
        break;
      case "pause":
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === scheduleId ? { ...s, status: "paused" as const } : s
          )
        );
        toast.success("Schedule paused");
        break;
      case "resume":
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === scheduleId ? { ...s, status: "active" as const } : s
          )
        );
        toast.success("Schedule resumed");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Welcome back, {session.user.name || session.user.email}!
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
          schedules={schedules}
          onCreateSchedule={() => setIsCreateScheduleOpen(true)}
          onEditSchedule={(id) => handleScheduleAction(id, "edit")}
          onDeleteSchedule={(id) => handleScheduleAction(id, "delete")}
          onPauseSchedule={(id) => handleScheduleAction(id, "pause")}
          onResumeSchedule={(id) => handleScheduleAction(id, "resume")}
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
                {socialAccounts.map((account, index) => (
                  <motion.div
                    key={account.platform}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div
                      className={`w-10 h-10 ${account.color} rounded-lg flex items-center justify-center`}
                    >
                      <account.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {account.platform}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {account.followers}
                      </p>
                    </div>
                    <Badge
                      variant="default"
                      className="ml-auto bg-green-100 text-green-700"
                    >
                      Connected
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule Creation Dialog */}
        <ScheduleCreationDialog
          isOpen={isCreateScheduleOpen}
          onOpenChange={setIsCreateScheduleOpen}
          onCreateSchedule={handleCreateSchedule}
        />
      </div>
    </div>
  );
}
