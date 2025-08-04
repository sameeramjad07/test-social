"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Instagram, Twitter, Facebook, Linkedin } from "lucide-react";
import { toast } from "sonner";
import type { Post, Schedule } from "@/types/calendar";

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePost: (post: Omit<Post, "id">) => void;
  schedules: Schedule[];
}

const platforms = [
  { name: "Instagram", icon: Instagram },
  { name: "Twitter", icon: Twitter },
  { name: "Facebook", icon: Facebook },
  { name: "LinkedIn", icon: Linkedin },
];

export function CreatePostDialog({
  isOpen,
  onClose,
  onCreatePost,
  schedules,
}: CreatePostDialogProps) {
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    platform: "",
    date: "",
    time: "",
    type: "text" as "text" | "image" | "video",
    scheduleId: "",
  });

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

    const dateTime = new Date(`${newPost.date}T${newPost.time}`);

    const postData: Omit<Post, "id"> = {
      title: newPost.title,
      content: newPost.content,
      platform: newPost.platform,
      date: dateTime,
      status: "scheduled",
      type: newPost.type,
      engagement: { likes: 0, comments: 0, shares: 0 },
    };

    // If a schedule was selected, associate the post with it
    if (newPost.scheduleId && newPost.scheduleId !== "none") {
      const schedule = schedules.find((s) => s.id === newPost.scheduleId);
      if (schedule) {
        postData.scheduleId = schedule.id;
        postData.scheduleName = schedule.name;
      }
    }

    onCreatePost(postData);
    toast.success("Post scheduled successfully!");
    onClose();
    setNewPost({
      title: "",
      content: "",
      platform: "",
      date: "",
      time: "",
      type: "text",
      scheduleId: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                    <SelectItem key={platform.name} value={platform.name}>
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
                  setNewPost({
                    ...newPost,
                    type: value as "text" | "image" | "video",
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
          <div className="space-y-2">
            <Label htmlFor="schedule">Add to Schedule (Optional)</Label>
            <Select
              value={newPost.scheduleId}
              onValueChange={(value) =>
                setNewPost({ ...newPost, scheduleId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a schedule or leave empty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Individual Post)</SelectItem>
                {schedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
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
  );
}
