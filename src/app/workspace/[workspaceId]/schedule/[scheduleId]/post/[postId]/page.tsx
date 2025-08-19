"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
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

  const generateContent = api.posts.generateContent.useMutation({
    onSuccess: () => toast.success("Content generated"),
    onError: (error) => toast.error(error.message),
  });

  const approveContent = api.posts.approveContent.useMutation({
    onSuccess: () => toast.success("Content approved"),
    onError: (error) => toast.error(error.message),
  });

  const unapproveContent = api.posts.approveContent.useMutation({
    onSuccess: () => toast.success("Content unapproved"),
    onError: (error) => toast.error(error.message),
  });

  const generateImage = api.posts.generateImage.useMutation({
    onSuccess: () => toast.success("Image generated"),
    onError: (error) => toast.error(error.message),
  });

  const approveImage = api.posts.approveImage.useMutation({
    onSuccess: () => toast.success("Image approved"),
    onError: (error) => toast.error(error.message),
  });

  const unapproveImage = api.posts.approveImage.useMutation({
    onSuccess: () => toast.success("Image unapproved"),
    onError: (error) => toast.error(error.message),
  });

  const updatePost = api.posts.update.useMutation({
    onSuccess: () => toast.success("Post updated"),
    onError: (error) => toast.error(error.message),
  });

  const finalApprovePost = api.posts.finalApprovePost.useMutation({
    onSuccess: () => toast.success("Post approved"),
    onError: (error) => toast.error(error.message),
  });

  const [contentPrompt, setContentPrompt] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Update prompts when post data loads
  useEffect(() => {
    if (post) {
      setContentPrompt(post.aiPrompt || post.schedule?.contentPrompt || "");
      setImagePrompt(
        post.images[0]?.aiPrompt || post.schedule?.imagePrompt || ""
      );
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

  const handleGenerateContent = async () => {
    setIsGeneratingContent(true);
    try {
      await generateContent.mutateAsync({ postId, prompt: contentPrompt });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleApproveContent = async () => {
    await approveContent.mutateAsync({ postId });
  };

  const handleUnapproveContent = async () => {
    await unapproveContent.mutateAsync({ postId });
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      await generateImage.mutateAsync({ postId, prompt: imagePrompt });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleApproveImage = async () => {
    await approveImage.mutateAsync({ postId });
  };

  const handleUnapproveImage = async () => {
    await unapproveImage.mutateAsync({ postId });
  };

  const handleUpdatePost = async (data: { content?: string }) => {
    await updatePost.mutateAsync({ postId, workspaceId, ...data });
  };

  const handleFinalApprove = async () => {
    await finalApprovePost.mutateAsync({ postId });
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
          <Button variant="outline" onClick={() => router.back()}>
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

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger
              value="image"
              disabled={post.status !== PostStatus.CONTENT_APPROVED}
            >
              Image
            </TabsTrigger>
            <TabsTrigger
              value="review"
              disabled={post.status !== PostStatus.IMAGE_APPROVED}
            >
              Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Content Generation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content-prompt">Content Prompt</Label>
                  <Textarea
                    id="content-prompt"
                    value={contentPrompt}
                    onChange={(e) => setContentPrompt(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleGenerateContent}
                  disabled={isGeneratingContent || post.contentApproved}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </Button>
                <div className="space-y-2">
                  <Label>Generated Content</Label>
                  <Textarea
                    value={post.content}
                    onChange={(e) =>
                      handleUpdatePost({ content: e.target.value })
                    }
                    rows={6}
                    disabled={!post.content || post.contentApproved}
                  />
                </div>
                {post.content && !post.contentApproved && (
                  <Button onClick={handleApproveContent}>
                    Approve Content
                  </Button>
                )}
                {post.contentApproved && (
                  <Button variant="outline" onClick={handleUnapproveContent}>
                    Unapprove Content
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="image">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Image Generation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="image-prompt">Image Prompt</Label>
                  <Textarea
                    id="image-prompt"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || post.imagesApproved}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Image
                </Button>
                {post.images.length > 0 && post.images[0] && (
                  <div className="space-y-2">
                    <Label>Generated Image</Label>
                    <img
                      src={post.images[0].url}
                      alt="Generated image"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
                {post.images.length > 0 && !post.imagesApproved && (
                  <Button onClick={handleApproveImage}>Approve Image</Button>
                )}
                {post.imagesApproved && (
                  <Button variant="outline" onClick={handleUnapproveImage}>
                    Unapprove Image
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="review">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Final Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Content</Label>
                  <p className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    {post.content}
                  </p>
                </div>
                {post.images.length > 0 && post.images[0] && (
                  <div className="space-y-2">
                    <Label>Image</Label>
                    <img
                      src={post.images[0].url}
                      alt="Generated image"
                      className="w-full rounded-lg"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Hashtags</Label>
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                {post.status === PostStatus.IMAGE_APPROVED && (
                  <Button onClick={handleFinalApprove}>
                    Final Approve Post
                  </Button>
                )}
                {post.status === PostStatus.APPROVED && (
                  <Badge className="bg-green-100 text-green-700">
                    Approved
                  </Badge>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
