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
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  ImageIcon,
  Video,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { Post, Schedule } from "@/types/calendar";

interface PostDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  schedules: Schedule[];
  onUpdatePost: (post: Post) => void;
  onDeletePost: (postId: number) => void;
}

const platforms = [
  { name: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { name: "Twitter", icon: Twitter, color: "bg-blue-500" },
  { name: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
];

export function PostDetailsDialog({
  isOpen,
  onClose,
  post,
  schedules,
  onUpdatePost,
  onDeletePost,
}: PostDetailsDialogProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editedPost, setEditedPost] = useState<Post | null>(null);

  if (!post) return null;

  const platform = platforms.find((p) => p.name === post.platform);

  const handleEdit = () => {
    setEditedPost({ ...post });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editedPost) return;
    onUpdatePost(editedPost);
    setIsEditing(false);
    toast.success("Post updated successfully!");
  };

  const handleDelete = () => {
    onDeletePost(post.id);
    setIsDeleteDialogOpen(false);
    onClose();
    toast.success("Post deleted successfully!");
  };

  const handleDuplicate = () => {
    const duplicatedPost: Post = {
      ...post,
      id: Date.now(), // Temporary ID
      title: `${post.title} (Copy)`,
      date: new Date(post.date.getTime() + 24 * 60 * 60 * 1000), // Next day
      status: "scheduled",
      engagement: { likes: 0, comments: 0, shares: 0 },
    };
    onUpdatePost(duplicatedPost);
    toast.success("Post duplicated successfully!");
  };

  const handleViewSchedule = () => {
    if (post.scheduleId) {
      router.push(`/dashboard/schedule/${post.scheduleId}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {platform && (
                <div
                  className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center`}
                >
                  <platform.icon className="w-4 h-4 text-white" />
                </div>
              )}
              {isEditing ? "Edit Post" : "Post Details"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your scheduled post"
                : "View and manage your scheduled post"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!isEditing ? (
              // View Mode
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant={
                      post.status === "published" ? "default" : "secondary"
                    }
                  >
                    {post.status}
                  </Badge>
                  {post.scheduleId && (
                    <Badge variant="outline">{post.scheduleName}</Badge>
                  )}
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    {post.type === "image" && <ImageIcon className="w-4 h-4" />}
                    {post.type === "video" && <Video className="w-4 h-4" />}
                    {post.type === "text" && <FileText className="w-4 h-4" />}
                    <span>{post.type}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Title</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {post.title}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Content</Label>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                      {post.content}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Platform</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {platform && <platform.icon className="w-4 h-4" />}
                        <span className="text-sm">{post.platform}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        Scheduled Time
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {post.date.toLocaleDateString()} at{" "}
                          {post.date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {post.status === "published" && post.engagement && (
                    <div>
                      <Label className="text-sm font-medium">Engagement</Label>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                        <span>❤️ {post.engagement.likes}</span>
                        <span>💬 {post.engagement.comments}</span>
                        <span>🔄 {post.engagement.shares}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Edit Mode
              editedPost && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Post Title</Label>
                      <Input
                        id="edit-title"
                        value={editedPost.title}
                        onChange={(e) =>
                          setEditedPost({
                            ...editedPost,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-platform">Platform</Label>
                      <Select
                        value={editedPost.platform}
                        onValueChange={(value) =>
                          setEditedPost({ ...editedPost, platform: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                    <Label htmlFor="edit-content">Content</Label>
                    <Textarea
                      id="edit-content"
                      value={editedPost.content}
                      onChange={(e) =>
                        setEditedPost({
                          ...editedPost,
                          content: e.target.value,
                        })
                      }
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-type">Content Type</Label>
                      <Select
                        value={editedPost.type}
                        onValueChange={(value) =>
                          setEditedPost({
                            ...editedPost,
                            type: value as "image" | "video" | "text",
                          })
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
                      <Label htmlFor="edit-date">Date</Label>
                      <Input
                        id="edit-date"
                        type="date"
                        value={editedPost.date.toISOString().split("T")[0]}
                        onChange={(e) => {
                          const newDate = new Date(editedPost.date);
                          const [yearStr, monthStr, dayStr] =
                            e.target.value.split("-");
                          const year = Number(yearStr);
                          const month = Number(monthStr);
                          const day = Number(dayStr);
                          newDate.setFullYear(year, month - 1, day);
                          setEditedPost({ ...editedPost, date: newDate });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-time">Time</Label>
                      <Input
                        id="edit-time"
                        type="time"
                        value={`${String(editedPost.date.getHours()).padStart(
                          2,
                          "0"
                        )}:${String(editedPost.date.getMinutes()).padStart(
                          2,
                          "0"
                        )}`}
                        onChange={(e) => {
                          const newDate = new Date(editedPost.date);
                          const [hourStr, minuteStr] =
                            e.target.value.split(":");
                          const hours = Number(hourStr);
                          const minutes = Number(minuteStr);
                          newDate.setHours(hours, minutes);
                          setEditedPost({ ...editedPost, date: newDate });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-schedule">Schedule</Label>
                    <Select
                      value={editedPost.scheduleId || "none"}
                      onValueChange={(value) => {
                        const schedule = schedules.find((s) => s.id === value);
                        setEditedPost({
                          ...editedPost,
                          scheduleId: value === "none" ? undefined : value,
                          scheduleName: schedule?.name,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Individual Post" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Individual Post</SelectItem>
                        {schedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id}>
                            {schedule.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            )}
          </div>

          <DialogFooter>
            {!isEditing ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                {post.scheduleId && (
                  <Button variant="outline" onClick={handleViewSchedule}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Schedule
                  </Button>
                )}
                <Button variant="outline" onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={onClose}>Close</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Save Changes
                </Button>
              </div>
            )}
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
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
