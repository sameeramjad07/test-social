"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { PostStatus } from "@prisma/client";

export default function PostEditorPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const scheduleId = params.scheduleId as string;
  const workspaceId = params.workspaceId as string;

  const { data: post, isLoading } = api.posts.getPost.useQuery({ postId });

  const updatePost = api.posts.update.useMutation({
    onSuccess: () => toast.success("Post updated"),
    onError: (error) => toast.error(error.message),
  });

  const approvePost = api.posts.approvePost.useMutation({
    onSuccess: () => toast.success("Post approved"),
    onError: (error) => toast.error(error.message),
  });

  const unapprovePost = api.posts.approvePost.useMutation({
    onSuccess: () => toast.success("Post unapproved"),
    onError: (error) => toast.error(error.message),
  });

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [hashtags, setHashtags] = useState("");

  useEffect(() => {
    if (post) {
      setContent(post.content || "");
      setImageUrl(post.images[0]?.url || "");
      setHashtags(post.hashtags.join(", ") || "");
    }
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Post not found</p>
      </div>
    );
  }

  const handleSave = async () => {
    await updatePost.mutateAsync({
      postId,
      workspaceId,
      content,
      imageUrl,
      hashtags: hashtags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    });
  };

  const handleApprove = async () => {
    await approvePost.mutateAsync({ postId, approve: true });
  };

  const handleUnapprove = async () => {
    await unapprovePost.mutateAsync({ postId, approve: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/workspace/${workspaceId}/schedule/${scheduleId}`)
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schedule
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent mt-4">
            Edit Post
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Scheduled for{" "}
            {post.scheduledAt
              ? format(post.scheduledAt, "PPP HH:mm")
              : "Not scheduled"}
          </p>
          <Badge className="mt-2">{post.status}</Badge>
        </motion.div>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                disabled={post.status === PostStatus.APPROVED}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={post.status === PostStatus.APPROVED}
              />
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Post image"
                  className="w-64 h-64 object-cover rounded mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hashtags">Hashtags</Label>
              <Input
                id="hashtags"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="Enter hashtags separated by commas"
                disabled={post.status === PostStatus.APPROVED}
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={
                  updatePost.isPending || post.status === PostStatus.APPROVED
                }
              >
                Save Changes
              </Button>
              {post.status !== PostStatus.APPROVED && (
                <Button
                  onClick={handleApprove}
                  disabled={approvePost.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Post
                </Button>
              )}
              {post.status === PostStatus.APPROVED && (
                <Button
                  onClick={handleUnapprove}
                  disabled={unapprovePost.isPending}
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-2" />
                  Unapprove Post
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
