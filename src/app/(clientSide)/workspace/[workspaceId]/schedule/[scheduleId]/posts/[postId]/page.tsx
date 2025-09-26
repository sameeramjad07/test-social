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
import { Loader2, ArrowLeft, Check, X, Send } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { Platform, PostStatus } from "@prisma/client";

export type SupportedPlatform = Extract<
  Platform,
  "LINKEDIN" | "FACEBOOK" | "INSTAGRAM"
>;

export default function PostEditorPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const scheduleId = params.scheduleId as string;
  const workspaceId = params.workspaceId as string;
  const [instruction, setInstruction] = useState("");

  const { data: post, isLoading } = api.posts.getPost.useQuery({ postId });

  const { data: socialAccounts } = api.socialAccounts.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  const updatePost = api.posts.update.useMutation({
    onSuccess: () => toast.success("Post updated"),
    onError: (error) => toast.error(error.message),
  });

  const aiUpdate = api.posts.updateContentWithPrompt.useMutation({
    onSuccess: (data) => {
      setContent(data.post.content);
      toast.success("Post updated with AI");
      setInstruction("");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleAIUpdate = async () => {
    await aiUpdate.mutateAsync({ postId, workspaceId, instruction });
  };

  const approvePost = api.posts.approvePost.useMutation({
    onSuccess: () => toast.success("Post approved"),
    onError: (error) => toast.error(error.message),
  });

  const unapprovePost = api.posts.approvePost.useMutation({
    onSuccess: () => toast.success("Post unapproved"),
    onError: (error) => toast.error(error.message),
  });

  const publishPost = api.posts.publish.useMutation({
    onSuccess: ({ results }) => {
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (successful.length > 0) {
        const message = `Post published to ${successful
          .map((r) => r.platform)
          .join(", ")}: ${successful.map((r) => r.url).join(", ")}`;
        toast.success(message);
      }

      if (failed.length > 0) {
        const message = `Failed to publish to ${failed
          .map((r) => r.platform)
          .join(", ")}: ${failed.map((r) => r.error).join(", ")}`;
        toast.error(message);
      }
    },
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

  const supportedPlatforms: SupportedPlatform[] = [
    Platform.LINKEDIN,
    Platform.FACEBOOK,
    Platform.INSTAGRAM,
  ];

  const hasConnectedAccount = socialAccounts?.some((account) =>
    supportedPlatforms.includes(account.platform as SupportedPlatform)
  );

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

  const handlePublish = async () => {
    if (!hasConnectedAccount) {
      toast.error(
        "No supported social accounts (LinkedIn, Facebook, Instagram) connected to this workspace"
      );
      return;
    }
    await publishPost.mutateAsync({ postId, workspaceId });
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* === Left side: Editor === */}
          <Card className="border-0 col-span-2 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle>Post Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Content</Label>
                <div className="rounded-lg border bg-slate-50 dark:bg-slate-800 p-4 max-h-64 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {content || "No content available"}
                  </p>
                </div>
              </div>

              {/* Prompt area */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Update Instruction</Label>
                <Textarea
                  id="prompt"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g. Make it shorter and more engaging"
                  rows={4}
                />
                <Button
                  onClick={handleAIUpdate}
                  disabled={aiUpdate.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {aiUpdate.isPending ? "Updating..." : "Update with AI"}
                </Button>
              </div>

              {/* Image field (full image display) */}
              {imageUrl && (
                <div className="space-y-2">
                  <Label>Post Image</Label>
                  <div className="relative w-full max-w-md">
                    <img
                      src={imageUrl}
                      alt="Post preview"
                      className="w-full max-h-[400px] object-contain rounded-lg shadow-md border bg-black"
                    />
                  </div>
                </div>
              )}

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

              <div className="flex flex-wrap gap-4">
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
                  <>
                    <Button
                      onClick={handleUnapprove}
                      disabled={unapprovePost.isPending}
                      variant="outline"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Unapprove Post
                    </Button>
                    <Button
                      onClick={handlePublish}
                      disabled={
                        publishPost.isPending ||
                        !hasConnectedAccount ||
                        post.status !== PostStatus.APPROVED
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {publishPost.isPending ? "Publishing..." : "Publish Now"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* === Right side: Post Preview === */}
          <Card className="border shadow-md bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Post Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700" />
                <div>
                  <p className="font-semibold">Your Page Name</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(), "PPP")}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                {content}
              </p>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Post preview"
                  className="w-full rounded-lg border shadow-sm object-contain bg-black"
                />
              )}
              {hashtags && (
                <p className="text-blue-600 dark:text-blue-400">
                  {hashtags
                    .split(",")
                    .map((tag) => `#${tag.trim().replace(/^#/, "")}`)
                    .join(" ")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
