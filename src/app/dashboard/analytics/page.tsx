"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Share,
  Eye,
  Download,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedPlatform, setSelectedPlatform] = useState("all");

  const overviewStats = [
    {
      title: "Total Reach",
      value: "124.5K",
      change: "+12.5%",
      trend: "up",
      icon: Eye,
      color: "text-blue-600",
    },
    {
      title: "Engagement Rate",
      value: "4.2%",
      change: "+0.8%",
      trend: "up",
      icon: Heart,
      color: "text-pink-600",
    },
    {
      title: "New Followers",
      value: "2,847",
      change: "+18.2%",
      trend: "up",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Posts Published",
      value: "24",
      change: "-4.2%",
      trend: "down",
      icon: BarChart3,
      color: "text-purple-600",
    },
  ];

  const platformStats = [
    {
      platform: "Instagram",
      icon: Instagram,
      followers: "12.5K",
      engagement: "5.2%",
      reach: "45.2K",
      posts: 8,
      color: "bg-pink-500",
      change: "+15%",
    },
    {
      platform: "Twitter",
      icon: Twitter,
      followers: "8.2K",
      engagement: "3.8%",
      reach: "32.1K",
      posts: 12,
      color: "bg-blue-500",
      change: "+8%",
    },
    {
      platform: "Facebook",
      icon: Facebook,
      followers: "15.8K",
      engagement: "2.9%",
      reach: "28.7K",
      posts: 4,
      color: "bg-blue-600",
      change: "+5%",
    },
    {
      platform: "LinkedIn",
      icon: Linkedin,
      followers: "5.3K",
      engagement: "6.1%",
      reach: "18.5K",
      posts: 3,
      color: "bg-blue-700",
      change: "+22%",
    },
  ];

  const topPosts = [
    {
      id: 1,
      platform: "Instagram",
      content: "Behind the scenes of our latest product photoshoot ✨",
      engagement: 1247,
      reach: 8934,
      likes: 892,
      comments: 45,
      shares: 23,
      date: "2 days ago",
    },
    {
      id: 2,
      platform: "Twitter",
      content: "Just launched our new AI-powered content generator! 🚀",
      engagement: 856,
      reach: 5621,
      likes: 234,
      comments: 67,
      shares: 89,
      date: "3 days ago",
    },
    {
      id: 3,
      platform: "LinkedIn",
      content: "5 tips for better social media engagement in 2025",
      engagement: 634,
      reach: 3421,
      likes: 156,
      comments: 23,
      shares: 45,
      date: "5 days ago",
    },
  ];

  const engagementData = [
    { day: "Mon", likes: 120, comments: 45, shares: 23 },
    { day: "Tue", likes: 150, comments: 52, shares: 31 },
    { day: "Wed", likes: 180, comments: 38, shares: 28 },
    { day: "Thu", likes: 220, comments: 65, shares: 42 },
    { day: "Fri", likes: 190, comments: 48, shares: 35 },
    { day: "Sat", likes: 160, comments: 41, shares: 29 },
    { day: "Sun", likes: 140, comments: 36, shares: 25 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  Analytics
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Track your social media performance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Overview Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {overviewStats.map((stat, index) => (
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
                    <div className="flex items-center gap-1 mt-1">
                      {stat.trend === "up" ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm ${
                          stat.trend === "up"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Platform Performance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>
                  Compare performance across all your connected platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {platformStats.map((platform, index) => (
                  <motion.div
                    key={platform.platform}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 ${platform.color} rounded-lg flex items-center justify-center`}
                      >
                        <platform.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{platform.platform}</p>
                        <p className="text-sm text-slate-500">
                          {platform.followers} followers
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm font-medium">
                          {platform.engagement}
                        </p>
                        <p className="text-xs text-slate-500">Engagement</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{platform.reach}</p>
                        <p className="text-xs text-slate-500">Reach</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{platform.posts}</p>
                        <p className="text-xs text-slate-500">Posts</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-700"
                    >
                      {platform.change}
                    </Badge>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Engagement Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Weekly Engagement</CardTitle>
                <CardDescription>Engagement breakdown by day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {engagementData.map((day, index) => (
                    <div key={day.day} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{day.day}</span>
                        <span className="text-slate-500">
                          {day.likes + day.comments + day.shares}
                        </span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div
                          className="bg-blue-500 rounded-sm"
                          style={{ width: `${(day.likes / 250) * 100}%` }}
                        />
                        <div
                          className="bg-green-500 rounded-sm"
                          style={{ width: `${(day.comments / 250) * 100}%` }}
                        />
                        <div
                          className="bg-purple-500 rounded-sm"
                          style={{ width: `${(day.shares / 250) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 text-xs pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                      <span>Likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded-sm" />
                      <span>Comments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                      <span>Shares</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Performing Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle>Top Performing Posts</CardTitle>
              <CardDescription>
                Your best content from the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{post.platform}</Badge>
                        <span className="text-sm text-slate-500">
                          {post.date}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Reach: {post.reach.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          Engagement: {post.engagement}
                        </p>
                      </div>
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 mb-3">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Share className="w-4 h-4" />
                        <span>{post.shares}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
