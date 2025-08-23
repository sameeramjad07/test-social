"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Platform, PostStatus } from "@prisma/client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Edit, Check, X, Sparkles, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
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

export default function SchedulePostsPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.scheduleId as string;
  const workspaceId = params.workspaceId as string;

  const { data: schedule, isLoading } = api.schedules.getSchedule.useQuery(
    { scheduleId, workspaceId },
    { enabled: !!scheduleId && !!workspaceId }
  );

  const generateBulkPosts = api.posts.generateBulkPosts.useMutation({
    onSuccess: () => toast.success("Post generation started"),
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

  const deletePost = api.posts.deletePost.useMutation({
    onSuccess: () => toast.success("Post deleted"),
    onError: (error) => toast.error(error.message),
  });

  const { data: progress } = api.posts.getGenerationProgress.useQuery(
    { scheduleId },
    { enabled: !!scheduleId, refetchInterval: 5000 }
  );

  const [bulkPrompt, setBulkPrompt] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (schedule) {
      setBulkPrompt(schedule.contentPrompt || "");
    }
  }, [schedule]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Schedule not found</p>
      </div>
    );
  }

  const totalPosts =
    schedule.postsPerSlot * schedule.timeSlots.length * schedule.posts.length;

  const completionPercentage = progress
    ? (progress.completed / progress.total) * 100
    : 0;

  const handleGenerateBulkPosts = () => {
    if (!bulkPrompt) {
      toast.error("Please provide a content prompt");
      return;
    }
    generateBulkPosts.mutate({ scheduleId, workspaceId, prompt: bulkPrompt });
  };

  const handleApprove = (postId: string) => {
    approvePost.mutate({ postId, approve: true });
  };

  const handleUnapprove = (postId: string) => {
    unapprovePost.mutate({ postId, approve: false });
  };

  const handleDelete = (postId: string) => {
    setPostToDelete(postId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deletePost.mutate({ postId: postToDelete, workspaceId });
      setShowDeleteDialog(false);
      setPostToDelete(null);
    }
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
            Posts for {schedule.name}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {schedule.description}
          </p>
          <Badge
            className={
              schedule.isActive
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }
          >
            {schedule.isActive ? "Active" : "Draft"}
          </Badge>
        </motion.div>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
          <CardHeader>
            <CardTitle>Manage Posts</CardTitle>
            <CardDescription>
              Generate, review, and approve posts for this schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {schedule.posts.length === 0 && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Based on your schedule configuration, {totalPosts} posts
                    will be generated for the following:
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 mt-2">
                    <li>
                      <strong>Platforms:</strong>{" "}
                      {schedule.platforms.join(", ")}
                    </li>
                    <li>
                      <strong>Dates:</strong>{" "}
                      {format(schedule.startDate, "PPP")} to{" "}
                      {schedule.endDate
                        ? format(schedule.endDate, "PPP")
                        : "30 days from start"}
                    </li>
                    <li>
                      <strong>Time Slots:</strong>{" "}
                      {schedule.timeSlots.join(", ")}
                    </li>
                    <li>
                      <strong>Posts per Slot:</strong> {schedule.postsPerSlot}
                    </li>
                  </ul>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                    Provide a detailed prompt below to generate content, images,
                    and hashtags for all posts.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk-prompt" className="text-sm font-medium">
                    Content Prompt
                  </Label>
                  <Textarea
                    id="bulk-prompt"
                    value={bulkPrompt}
                    onChange={(e) => setBulkPrompt(e.target.value)}
                    rows={6}
                    className="w-full p-2 border rounded-md"
                    placeholder="Enter a detailed prompt (e.g., 'Create engaging posts about sustainable fashion for young professionals on the specified platforms, tailored for August 21-31, 2025, with vibrant images and hashtags like #SustainableFashion #EcoFriendly')"
                  />
                </div>
                <Button
                  onClick={handleGenerateBulkPosts}
                  disabled={generateBulkPosts.isPending || !bulkPrompt}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generateBulkPosts.isPending
                    ? "Starting Generation..."
                    : "Generate All Posts"}
                </Button>
              </div>
            )}
            {progress && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Generation Progress</span>
                  <span>
                    {progress.completed}/{progress.total} posts (
                    {Math.round(completionPercentage)}%)
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
              </div>
            )}
            {schedule.posts.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Hashtags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        {post.scheduledAt
                          ? format(post.scheduledAt, "PPP HH:mm")
                          : "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        {post.socialAccounts
                          .map((acc) => acc.platform)
                          .join(", ")}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {post.content || "No content"}
                      </TableCell>
                      <TableCell>
                        {post.images[0]?.url ? (
                          <img
                            src={post.images[0].url}
                            alt={post.images[0].alt || "Post image"}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          "No image"
                        )}
                      </TableCell>
                      <TableCell>
                        {post.hashtags.map((tag) => `#${tag}`).join(", ") ||
                          "None"}
                      </TableCell>
                      <TableCell>
                        <Badge>{post.status}</Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/workspace/${workspaceId}/schedule/${scheduleId}/posts/${post.id}`
                            )
                          }
                          disabled={post.status === PostStatus.APPROVED}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        {post.status !== PostStatus.APPROVED && (
                          <Button
                            onClick={() => handleApprove(post.id)}
                            disabled={approvePost.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        {post.status === PostStatus.APPROVED && (
                          <Button
                            onClick={() => handleUnapprove(post.id)}
                            disabled={unapprovePost.isPending}
                            variant="outline"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Unapprove
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(post.id)}
                          disabled={deletePost.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this post? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deletePost.isPending}
              >
                {deletePost.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
