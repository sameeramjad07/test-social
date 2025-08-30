"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Image as ImageIcon,
  Clock,
} from "lucide-react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { Platform, PostStatus } from "@prisma/client";

interface PostDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  post: any | null;
}

const platforms = [
  {
    name: Platform.INSTAGRAM,
    icon: Instagram,
    color: "bg-gradient-to-br from-pink-500 to-purple-500",
  },
  { name: Platform.FACEBOOK, icon: Facebook, color: "bg-blue-600" },
  { name: Platform.LINKEDIN, icon: Linkedin, color: "bg-blue-700" },
  { name: Platform.TWITTER, icon: Twitter, color: "bg-blue-500" },
  { name: Platform.TIKTOK, icon: Instagram, color: "bg-black" }, // Placeholder for TikTok
];

export function PostDetailsDialog({
  isOpen,
  onClose,
  post,
}: PostDetailsDialogProps) {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const { data: schedules } = api.schedules.list.useQuery({ workspaceId });

  if (!post) return null;

  const platform = platforms.find((p) =>
    post.socialAccounts?.some(
      (account: { platform: Platform }) => account.platform === p.name
    )
  );
  const platformDisplayName = platform
    ? platform.name.charAt(0).toUpperCase() +
      platform.name.slice(1).toLowerCase()
    : "Unknown Platform";

  return (
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
            Post Details
          </DialogTitle>
          <DialogDescription>
            View details of your scheduled post
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Badge
              variant={
                post.status === PostStatus.PUBLISHED
                  ? "default"
                  : post.status === PostStatus.SCHEDULED
                  ? "secondary"
                  : "destructive"
              }
            >
              {post.status}
            </Badge>
            {post.scheduleId && (
              <Badge variant="outline">
                {schedules?.find((s) => s.id === post.scheduleId)?.name ||
                  "Unknown Schedule"}
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Content</Label>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                {post.content}
              </p>
            </div>

            {post.images?.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Images</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {post.images.map((image: { url: string; alt?: string }) => (
                    <img
                      key={image.url}
                      src={image.url}
                      alt={image.alt || "Post image"}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Platform</Label>
                <div className="flex items-center gap-2 mt-1">
                  {platform && (
                    <div
                      className={`w-6 h-6 ${platform.color} rounded flex items-center justify-center`}
                    >
                      <platform.icon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm">{platformDisplayName}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Scheduled Time</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {post.scheduledAt
                      ? `${post.scheduledAt.toLocaleDateString()} at ${post.scheduledAt.toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}`
                      : "Not scheduled"}
                  </span>
                </div>
              </div>
            </div>

            {post.hashtags?.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Hashtags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {post.hashtags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
