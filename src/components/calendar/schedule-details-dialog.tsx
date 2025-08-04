"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Edit,
  Trash2,
  Calendar,
  Clock,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import type { Schedule } from "@/types/calendar";

interface ScheduleDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onDeleteSchedule: (scheduleId: string) => void;
}

const platforms = [
  { name: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { name: "Twitter", icon: Twitter, color: "bg-blue-500" },
  { name: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
];

export function ScheduleDetailsDialog({
  isOpen,
  onClose,
  schedule,
  onDeleteSchedule,
}: ScheduleDetailsDialogProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!schedule) return null;

  const handleEdit = () => {
    router.push(`/dashboard/schedule/${schedule.id}`);
  };

  const handleDelete = () => {
    onDeleteSchedule(schedule.id);
    setIsDeleteDialogOpen(false);
    onClose();
    toast.success(`Schedule "${schedule.name}" deleted successfully!`);
  };

  const upcomingPosts = schedule.posts
    .filter((post) => post.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const publishedPosts = schedule.posts.filter(
    (post) => post.status === "published"
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              {schedule.name}
            </DialogTitle>
            <DialogDescription>
              Manage your content schedule and view all associated posts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Schedule Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {schedule.posts.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {upcomingPosts.length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Published</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {publishedPosts.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Posts */}
            {upcomingPosts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Upcoming Posts</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {upcomingPosts.slice(0, 5).map((post) => {
                    const platform = platforms.find(
                      (p) => p.name === post.platform
                    );
                    return (
                      <div
                        key={post.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        {platform && (
                          <div
                            className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                          >
                            <platform.icon className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {post.title}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {post.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            <span>
                              {post.date.toLocaleDateString()} at{" "}
                              {post.date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {upcomingPosts.length > 5 && (
                    <div className="text-center py-2">
                      <Button variant="outline" size="sm" onClick={handleEdit}>
                        View All {upcomingPosts.length} Posts
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Status */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <h3 className="font-medium">Schedule Status</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This schedule contains {schedule.posts.length} posts across
                  multiple platforms
                </p>
              </div>
              <Badge
                variant={schedule.status === "active" ? "default" : "secondary"}
                className="capitalize"
              >
                {schedule.status}
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex items-center gap-2 bg-transparent"
              >
                <Edit className="w-4 h-4" />
                Edit Schedule
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Schedule
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{schedule.name}"? This will
              remove all {schedule.posts.length} posts associated with this
              schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
