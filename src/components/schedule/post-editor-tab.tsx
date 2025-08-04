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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Sparkles,
  ImageIcon,
  RefreshCw,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  platform: string;
  scheduledDate: Date;
  status:
    | "draft"
    | "content-generated"
    | "image-generated"
    | "approved"
    | "scheduled";
  imageUrl?: string;
  imagePrompt?: string;
  hashtags: string[];
}

interface PostEditorTabProps {
  posts: Post[];
  onUpdatePost: (postId: string, updates: Partial<Post>) => void;
  onDeletePost: (postId: string) => void;
  onApprovePost: (postId: string) => void;
  onUnapprovePost: (postId: string) => void;
  onGenerateImage: (post: Post, prompt: string) => Promise<void>;
}

const platformIcons = {
  Instagram: { icon: Instagram, color: "bg-pink-500" },
  Twitter: { icon: Twitter, color: "bg-blue-500" },
  Facebook: { icon: Facebook, color: "bg-blue-600" },
  LinkedIn: { icon: Linkedin, color: "bg-blue-700" },
};

export function PostEditorTab({
  posts,
  onUpdatePost,
  onDeletePost,
  onApprovePost,
  onUnapprovePost,
  onGenerateImage,
}: PostEditorTabProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const getStatusColor = (status: Post["status"]) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700";
      case "content-generated":
        return "bg-blue-100 text-blue-700";
      case "image-generated":
        return "bg-purple-100 text-purple-700";
      case "approved":
        return "bg-green-100 text-green-700";
      case "scheduled":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedPost || !imagePrompt.trim()) {
      toast.error("Please provide an image prompt");
      return;
    }

    setIsGeneratingImage(true);
    try {
      await onGenerateImage(selectedPost, imagePrompt);
      setIsImageDialogOpen(false);
      setImagePrompt("");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDeletePost = () => {
    if (deletePostId) {
      onDeletePost(deletePostId);
      setDeletePostId(null);
      toast.success("Post deleted successfully!");
    }
  };

  return (
    <>
      <div className="space-y-6">
        {posts.map((post, index) => {
          const platformInfo =
            platformIcons[post.platform as keyof typeof platformIcons];
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {platformInfo && (
                        <div
                          className={`w-10 h-10 ${platformInfo.color} rounded-lg flex items-center justify-center`}
                        >
                          <platformInfo.icon className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {post.platform} Post
                        </CardTitle>
                        <CardDescription>
                          Scheduled for{" "}
                          {post.scheduledDate.toLocaleDateString()} at{" "}
                          {post.scheduledDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(post.status)}>
                        {post.status.replace("-", " ")}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletePostId(post.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {post.status === "draft" ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 mb-4">
                        Content not generated yet
                      </p>
                      <p className="text-sm text-slate-400">
                        Use the Content Generation tab to create content for
                        this post
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                          value={post.content}
                          onChange={(e) =>
                            onUpdatePost(post.id, { content: e.target.value })
                          }
                          rows={4}
                        />
                      </div>

                      {post.hashtags.length > 0 && (
                        <div className="space-y-2">
                          <Label>Hashtags</Label>
                          <div className="flex flex-wrap gap-2">
                            {post.hashtags.map((hashtag, idx) => (
                              <Badge key={idx} variant="secondary">
                                #{hashtag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {post.imageUrl ? (
                        <div className="space-y-2">
                          <Label>Generated Image</Label>
                          <div className="relative">
                            <img
                              src={post.imageUrl || "/placeholder.svg"}
                              alt="Generated content"
                              className="w-full max-w-md rounded-lg border"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 bg-white/90"
                              onClick={() => {
                                setSelectedPost(post);
                                setImagePrompt(post.imagePrompt || "");
                                setIsImageDialogOpen(true);
                              }}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Image</Label>
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 mb-4">
                              No image generated yet
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedPost(post);
                                setIsImageDialogOpen(true);
                              }}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Image
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-4 border-t">
                        {post.status === "approved" ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onUnapprovePost(post.id)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Unapprove
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => onApprovePost(post.id)}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve Post
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Image Generation Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-600" />
              Generate AI Image
            </DialogTitle>
            <DialogDescription>
              Create a custom image for your {selectedPost?.platform} post using
              AI
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPost?.content && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Label className="text-sm font-medium">Post Content</Label>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {selectedPost.content}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="image-prompt">Image Description</Label>
              <Textarea
                id="image-prompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to generate. For example: 'Modern office setting with AI technology, professional lighting, blue and purple color scheme...'"
                rows={4}
              />
            </div>
            {isGeneratingImage && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="font-medium">Generating your image...</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  This may take a few moments. We're creating a custom image
                  based on your description.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImageDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletePostId}
        onOpenChange={() => setDeletePostId(null)}
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
              onClick={handleDeletePost}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
