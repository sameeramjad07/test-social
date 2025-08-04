"use client";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import type { Post, Schedule } from "@/types/calendar";

interface CalendarSidebarProps {
  scheduledPosts: Post[];
  schedules: Schedule[];
  selectedDate: Date | null;
  onUpdatePost: (post: Post) => void;
  onDeletePost: (postId: number) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

const platforms = [
  { name: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { name: "Twitter", icon: Twitter, color: "bg-blue-500" },
  { name: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
];

export function CalendarSidebar({
  scheduledPosts,
  schedules,
  selectedDate,
  onUpdatePost,
  onDeletePost,
  onDeleteSchedule,
}: CalendarSidebarProps) {
  const handleDuplicatePost = (postId: number) => {
    const postToDuplicate = scheduledPosts.find((post) => post.id === postId);
    if (!postToDuplicate) return;

    const duplicatedPost: Post = {
      ...postToDuplicate,
      id: Date.now(),
      title: `${postToDuplicate.title} (Copy)`,
      date: new Date(postToDuplicate.date.getTime() + 24 * 60 * 60 * 1000),
      status: "scheduled",
      engagement: { likes: 0, comments: 0, shares: 0 },
    };

    onUpdatePost(duplicatedPost);
    toast.success("Post duplicated successfully!");
  };

  const todaysPosts = scheduledPosts.filter(
    (post) => post.date.toDateString() === new Date().toDateString()
  );

  return (
    <div className="space-y-6">
      {/* Today's Posts */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-lg">Today's Schedule</CardTitle>
          <CardDescription>Posts scheduled for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todaysPosts.map((post) => {
              const platform = platforms.find((p) => p.name === post.platform);
              return (
                <div key={post.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {platform && <platform.icon className="w-4 h-4" />}
                      <span className="text-sm font-medium">
                        {post.platform}
                      </span>
                      <Badge
                        variant={
                          post.status === "published" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {post.status}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicatePost(post.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeletePost(post.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            {todaysPosts.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                No posts scheduled for today
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Schedules */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-lg">Active Schedules</CardTitle>
          <CardDescription>Your content schedules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{schedule.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteSchedule(schedule.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Schedule
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span>{schedule.posts.length} posts</span>
                  <Badge variant="outline" className="text-xs">
                    {schedule.status}
                  </Badge>
                </div>
              </div>
            ))}
            {schedules.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                No active schedules
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
                {scheduledPosts.filter((p) => p.status === "scheduled").length}
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
                Active Schedules
              </span>
              <span className="font-medium">{schedules.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Total Posts
              </span>
              <span className="font-medium">{scheduledPosts.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
