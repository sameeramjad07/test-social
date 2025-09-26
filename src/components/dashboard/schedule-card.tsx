"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  FileText,
  Edit,
  Play,
  Trash2,
  MoreHorizontal,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Platform, PostStatus } from "@prisma/client";
import { format } from "date-fns";

interface Schedule {
  id: string;
  name: string;
  platforms: Platform[];
  duration: number | null;
  durationType: string;
  frequency: string;
  isActive: boolean;
  createdAt: Date;
  postsGenerated: number;
  approvedPosts: number;
  totalPosts: number;
  description?: string | null;
  posts: {
    id: string;
    content: string;
    status: PostStatus;
    images: { url: string }[];
  }[];
}

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (scheduleId: string) => void;
  onView: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
  onToggleActive: (scheduleId: string, isActive: boolean) => void;
  index: number;
}

const platformIcons = {
  INSTAGRAM: {
    icon: Instagram,
    color: "bg-gradient-to-br from-pink-500 to-purple-500",
  },
  FACEBOOK: { icon: Facebook, color: "bg-blue-600" },
  LINKEDIN: { icon: Linkedin, color: "bg-blue-700" },
  TWITTER: { icon: Twitter, color: "bg-blue-500" },
  TIKTOK: { icon: Instagram, color: "bg-black" }, // Placeholder for TikTok
};

function PreviewImage({ src, alt }: { src?: string | null; alt?: string }) {
  // fallback must match the file in /public (you said no-image.jpg)
  const FALLBACK = "/no-image.jpg";

  // initialize to src || fallback so we never render an undefined src
  const [imgSrc, setImgSrc] = useState<string>(src || FALLBACK);

  // if parent changes the src, update local src (but keep fallback as default)
  useEffect(() => {
    setImgSrc(src || FALLBACK);
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt ?? "Post preview"}
      width={64}
      height={64}
      loading="lazy"
      decoding="async"
      // if the image fails to load, switch to the fallback
      onError={() => {
        if (imgSrc !== FALLBACK) setImgSrc(FALLBACK);
      }}
      className="w-16 h-16 object-cover rounded-md border border-slate-200 dark:border-slate-700"
      // reserve space to avoid layout shifts
      style={{ minWidth: 64, minHeight: 64 }}
    />
  );
}

export function ScheduleCard({
  schedule,
  onEdit,
  onView,
  onDelete,
  onToggleActive,
}: ScheduleCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
  };

  const handleDelete = () => {
    onDelete(schedule.id);
    setShowDeleteDialog(false);
    toast.success("Schedule deleted successfully!");
  };

  // Sanitize and validate post counts
  const validTotalPosts = Math.max(1, schedule.totalPosts || 1); // Ensure at least 1 to avoid division by zero
  const validApprovedPosts = Math.max(0, schedule.approvedPosts || 0);

  return (
    <>
      <Card
        className="border-0 shadow-lg bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 hover:shadow-xl cursor-pointer transition-shadow rounded-xl overflow-hidden"
        onClick={() => onView(schedule.id)}
      >
        <CardContent className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-xl text-slate-900 dark:text-slate-100 truncate">
                  {schedule.name}
                </h3>
                <Badge className={getStatusColor(schedule.isActive)}>
                  {schedule.isActive ? "Active" : "Draft"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {schedule.platforms.map((platform) => {
                  const platformInfo =
                    platformIcons[platform as keyof typeof platformIcons];
                  return (
                    platformInfo && (
                      <div
                        key={platform}
                        className={`w-8 h-8 ${platformInfo.color} rounded-md flex items-center justify-center shadow-sm`}
                      >
                        <platformInfo.icon className="w-4 h-4 text-white" />
                      </div>
                    )
                  );
                })}
              </div>
              {schedule.description && (
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3">
                  {schedule.description}
                </p>
              )}
            </div>
            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                  className="hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <MoreHorizontal className="w-5 h-5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              >
                <DropdownMenuItem onClick={() => onEdit(schedule.id)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Schedule
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onToggleActive(schedule.id, !schedule.isActive)
                  }
                >
                  {schedule.isActive ? (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Save as Draft
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Activate Schedule
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Schedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>
                  {schedule.duration
                    ? `${schedule.duration} ${schedule.durationType}`
                    : "No duration set"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <FileText className="w-4 h-4" />
                <span>
                  {validApprovedPosts}/{validTotalPosts} posts approved
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-medium">Frequency:</span>{" "}
                {schedule.frequency}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-medium">Created:</span>{" "}
                {format(schedule.createdAt, "PPP")}
              </div>
            </div>
          </div>

          {/* Posts */}
          {schedule.posts.length > 0 && (
            <div className="space-y-3 flex-1">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Post Previews
              </h4>
              <div className="space-y-3">
                {schedule.posts.slice(0, 2).map((post) => (
                  <div
                    key={post.id}
                    className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <PreviewImage
                      src={post.images?.[0]?.url ?? null}
                      alt="Post preview"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {post.content.length > 100
                          ? `${post.content.slice(0, 100)}...`
                          : post.content}
                      </p>
                      <Badge
                        variant={
                          post.status === PostStatus.APPROVED
                            ? "default"
                            : post.status ===
                                PostStatus.CONTENT_PENDING_APPROVAL ||
                              post.status === PostStatus.IMAGE_PENDING_APPROVAL
                            ? "secondary"
                            : "destructive"
                        }
                        className="mt-1 text-xs"
                      >
                        {post.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-x-3 justify-end pt-6 mt-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView(schedule.id);
              }} // 👈 calls onView, not onEdit
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700 cursor-pointer"
            >
              <FileText className="w-3 h-3 mr-1" />
              View Schedule
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(schedule.id);
              }} // 👈 calls onView, not onEdit
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700 cursor-pointer"
            >
              <FileText className="w-3 h-3 mr-1" />
              Edit Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{schedule.name}"? This action
              cannot be undone and will remove all associated posts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
