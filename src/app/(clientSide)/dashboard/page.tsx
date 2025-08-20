"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Calendar,
  Users,
  TrendingUp,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Plus,
  Zap,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

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

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
      toast.success("Signed out successfully.");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const socialAccounts = [
    {
      platform: "Instagram",
      username: "@yourhandle",
      followers: "12.5K",
      connected: true,
      color: "bg-pink-500",
    },
    {
      platform: "Twitter",
      username: "@yourhandle",
      followers: "8.2K",
      connected: true,
      color: "bg-blue-500",
    },
    {
      platform: "Facebook",
      username: "Your Page",
      followers: "15.8K",
      connected: false,
      color: "bg-blue-600",
    },
    {
      platform: "LinkedIn",
      username: "Your Profile",
      followers: "5.3K",
      connected: false,
      color: "bg-blue-700",
    },
  ];

  const stats = [
    { title: "Total Followers", value: "36.8K", change: "+12%", icon: Users },
    {
      title: "Engagement Rate",
      value: "4.2%",
      change: "+0.8%",
      icon: TrendingUp,
    },
    { title: "Posts This Month", value: "24", change: "+6", icon: BarChart3 },
    { title: "Scheduled Posts", value: "12", change: "+3", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                Welcome back, {session.user.name || session.user.email}!
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Here's what's happening with your social media presence
              </p>
            </div>
            <div className="flex gap-4">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Social Accounts */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Connected Accounts
              </CardTitle>
              <CardDescription>
                Manage your social media connections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialAccounts.map((account, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 ${account.color} rounded-lg flex items-center justify-center`}
                    >
                      {account.platform === "Instagram" && (
                        <Instagram className="w-5 h-5 text-white" />
                      )}
                      {account.platform === "Twitter" && (
                        <Twitter className="w-5 h-5 text-white" />
                      )}
                      {account.platform === "Facebook" && (
                        <Facebook className="w-5 h-5 text-white" />
                      )}
                      {account.platform === "LinkedIn" && (
                        <Linkedin className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {account.platform}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {account.username} • {account.followers} followers
                      </p>
                    </div>
                  </div>
                  <Badge variant={account.connected ? "default" : "secondary"}>
                    {account.connected ? "Connected" : "Connect"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Content Generation */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                AI Content Assistant
              </CardTitle>
              <CardDescription>
                Generate engaging content with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Content Generation
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    85%
                  </span>
                </div>
                <Progress value={85} className="h-2" />
              </div>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Instagram Post
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Create Twitter Thread
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Write LinkedIn Article
                </Button>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                  💡 Pro Tip
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Provide context about your brand and target audience for
                  better AI-generated content.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to manage your social media presence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
              >
                <Calendar className="w-6 h-6" />
                Schedule Posts
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
              >
                <BarChart3 className="w-6 h-6" />
                View Analytics
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 bg-transparent"
              >
                <Users className="w-6 h-6" />
                Manage Audience
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
