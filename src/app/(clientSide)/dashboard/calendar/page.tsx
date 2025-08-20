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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  ImageIcon,
  Video,
  FileText,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sample scheduled posts data
  const scheduledPosts = [
    {
      id: 1,
      title: "Product Launch Announcement",
      content: "Excited to announce our latest AI-powered feature! 🚀",
      platform: "Instagram",
      date: new Date(2025, 1, 15, 10, 0),
      status: "scheduled",
      type: "image",
      engagement: { likes: 0, comments: 0, shares: 0 },
    },
    {
      id: 2,
      title: "Behind the Scenes",
      content: "Take a look behind the scenes of our development process",
      platform: "Twitter",
      date: new Date(2025, 1, 15, 14, 30),
      status: "scheduled",
      type: "video",
      engagement: { likes: 0, comments: 0, shares: 0 },
    },
    {
      id: 3,
      title: "Industry Insights",
      content: "5 trends shaping the future of social media marketing",
      platform: "LinkedIn",
      date: new Date(2025, 1, 16, 9, 0),
      status: "scheduled",
      type: "text",
      engagement: { likes: 0, comments: 0, shares: 0 },
    },
    {
      id: 4,
      title: "Customer Success Story",
      content: "How @customer increased their engagement by 300%",
      platform: "Facebook",
      date: new Date(2025, 1, 17, 16, 0),
      status: "published",
      type: "image",
      engagement: { likes: 124, comments: 23, shares: 45 },
    },
  ];

  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    platform: "",
    date: "",
    time: "",
    type: "text",
  });

  const platforms = [
    { name: "Instagram", icon: Instagram, color: "bg-pink-500" },
    { name: "Twitter", icon: Twitter, color: "bg-blue-500" },
    { name: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter(
      (post) => post.date.toDateString() === date.toDateString()
    );
  };

  const handleCreatePost = () => {
    if (
      !newPost.title ||
      !newPost.content ||
      !newPost.platform ||
      !newPost.date ||
      !newPost.time
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    toast.success("Post scheduled successfully!");
    setIsCreateModalOpen(false);
    setNewPost({
      title: "",
      content: "",
      platform: "",
      date: "",
      time: "",
      type: "text",
    });
  };

  const handleDeletePost = (postId: number) => {
    toast.success("Post deleted successfully!");
  };

  const handleDuplicatePost = (postId: number) => {
    toast.success("Post duplicated successfully!");
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  Content Calendar
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Schedule and manage your social media posts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={viewMode}
                onValueChange={(value: "month" | "week" | "day") =>
                  setViewMode(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>
              <Dialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
              >
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule New Post</DialogTitle>
                    <DialogDescription>
                      Create and schedule a new social media post
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Post Title</Label>
                        <Input
                          id="title"
                          value={newPost.title}
                          onChange={(e) =>
                            setNewPost({ ...newPost, title: e.target.value })
                          }
                          placeholder="Enter post title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platform">Platform</Label>
                        <Select
                          value={newPost.platform}
                          onValueChange={(value) =>
                            setNewPost({ ...newPost, platform: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {platforms.map((platform) => (
                              <SelectItem
                                key={platform.name}
                                value={platform.name}
                              >
                                <div className="flex items-center gap-2">
                                  <platform.icon className="w-4 h-4" />
                                  {platform.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={newPost.content}
                        onChange={(e) =>
                          setNewPost({ ...newPost, content: e.target.value })
                        }
                        placeholder="Write your post content..."
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Content Type</Label>
                        <Select
                          value={newPost.type}
                          onValueChange={(value) =>
                            setNewPost({ ...newPost, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text Only</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newPost.date}
                          onChange={(e) =>
                            setNewPost({ ...newPost, date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newPost.time}
                          onChange={(e) =>
                            setNewPost({ ...newPost, time: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreatePost}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Schedule Post
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {monthNames[currentDate.getMonth()]}{" "}
                    {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth("prev")}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentDate(new Date())}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth("next")}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {dayNames.map((day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentDate).map((date, index) => {
                    if (!date) {
                      return <div key={index} className="p-2 h-24" />;
                    }

                    const posts = getPostsForDate(date);
                    const isToday =
                      date.toDateString() === new Date().toDateString();
                    const isSelected =
                      selectedDate?.toDateString() === date.toDateString();

                    return (
                      <motion.div
                        key={date.toISOString()}
                        whileHover={{ scale: 1.02 }}
                        className={`p-2 h-24 border rounded-lg cursor-pointer transition-all ${
                          isToday
                            ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                            : isSelected
                            ? "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`text-sm font-medium ${
                              isToday ? "text-blue-600" : ""
                            }`}
                          >
                            {date.getDate()}
                          </span>
                          {posts.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0"
                            >
                              {posts.length}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          {posts.slice(0, 2).map((post) => {
                            const platform = platforms.find(
                              (p) => p.name === post.platform
                            );
                            return (
                              <div
                                key={post.id}
                                className={`text-xs p-1 rounded text-white truncate ${
                                  platform?.color || "bg-gray-500"
                                }`}
                              >
                                {post.title}
                              </div>
                            );
                          })}
                          {posts.length > 2 && (
                            <div className="text-xs text-slate-500">
                              +{posts.length - 2} more
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Today's Posts */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-lg">Today's Schedule</CardTitle>
                <CardDescription>Posts scheduled for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledPosts
                    .filter(
                      (post) =>
                        post.date.toDateString() === new Date().toDateString()
                    )
                    .map((post) => {
                      const platform = platforms.find(
                        (p) => p.name === post.platform
                      );
                      return (
                        <div key={post.id} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            {platform && <platform.icon className="w-4 h-4" />}
                            <span className="text-sm font-medium">
                              {post.platform}
                            </span>
                            <Badge
                              variant={
                                post.status === "published"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {post.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {post.date.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      );
                    })}
                  {scheduledPosts.filter(
                    (post) =>
                      post.date.toDateString() === new Date().toDateString()
                  ).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No posts scheduled for today
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Scheduled Posts
                    </span>
                    <span className="font-medium">
                      {
                        scheduledPosts.filter((p) => p.status === "scheduled")
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Published Today
                    </span>
                    <span className="font-medium">
                      {
                        scheduledPosts.filter(
                          (p) =>
                            p.status === "published" &&
                            p.date.toDateString() === new Date().toDateString()
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      This Week
                    </span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      This Month
                    </span>
                    <span className="font-medium">48</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>
                  Posts for{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <CardDescription>
                  Manage posts scheduled for this date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getPostsForDate(selectedDate).map((post) => {
                    const platform = platforms.find(
                      (p) => p.name === post.platform
                    );
                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            {platform && (
                              <div
                                className={`w-10 h-10 ${platform.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                              >
                                <platform.icon className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{post.title}</h3>
                                <Badge
                                  variant={
                                    post.status === "published"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {post.status}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                  {post.type === "image" && (
                                    <ImageIcon className="w-4 h-4" />
                                  )}
                                  {post.type === "video" && (
                                    <Video className="w-4 h-4" />
                                  )}
                                  {post.type === "text" && (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 mb-3">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {post.date.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                                {post.status === "published" && (
                                  <>
                                    <span>❤️ {post.engagement.likes}</span>
                                    <span>💬 {post.engagement.comments}</span>
                                    <span>🔄 {post.engagement.shares}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicatePost(post.id)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePost(post.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {getPostsForDate(selectedDate).length === 0 && (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">
                        No posts scheduled for this date
                      </p>
                      <Button
                        className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Schedule Post
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
