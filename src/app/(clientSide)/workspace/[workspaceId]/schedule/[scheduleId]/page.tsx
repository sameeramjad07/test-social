"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Platform, PostStatus } from "@prisma/client";
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
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Play,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Sparkles,
  Trash2,
  Edit,
  Check,
  X,
  Image,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, isAfter, addDays } from "date-fns";
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
import EditScheduleDialog from "@/components/schedule/EditScheduleDialog";

const platformIcons = {
  INSTAGRAM: {
    icon: Instagram,
    color: "bg-gradient-to-br from-pink-500 to-purple-500",
  },
  FACEBOOK: { icon: Facebook, color: "bg-blue-600" },
  LINKEDIN: { icon: Linkedin, color: "bg-blue-700" },
  TWITTER: { icon: Twitter, color: "bg-blue-400" },
  TIKTOK: { icon: Twitter, color: "bg-black" },
};

export default function ScheduleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.scheduleId as string;
  const workspaceId = params.workspaceId as string;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [bulkPrompt, setBulkPrompt] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPostDeleteDialog, setShowPostDeleteDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const { data: schedule, isLoading } = api.schedules.getSchedule.useQuery(
    { scheduleId, workspaceId },
    { enabled: !!scheduleId && !!workspaceId }
  );

  const { data: progress, refetch: refetchProgress } =
    api.posts.getGenerationProgress.useQuery(
      { scheduleId },
      {
        enabled: !!scheduleId,
        refetchInterval: schedule?.posts.length === 0 ? 5000 : 0,
      }
    );

  const activateSchedule = api.schedules.activateSchedule.useMutation({
    onSuccess: () => toast.success("Schedule activated"),
    onError: (error) => toast.error(error.message),
  });

  const generateBulkPosts = api.posts.generateBulkPosts.useMutation({
    onSuccess: () => {
      toast.success("Post generation started");
      refetchProgress();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteAllPosts = api.posts.deleteAllPosts.useMutation({
    onSuccess: () => {
      toast.success("All posts deleted");
      setBulkPrompt("");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const generateImagesForAllPosts =
    api.posts.generateImagesForAllPosts.useMutation({
      onSuccess: () => {
        toast.success("Image generation started for all posts");
        refetchProgress();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    });

  const deletePost = api.posts.deletePost.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkApprovePosts = api.posts.bulkApprovePosts.useMutation({
    onSuccess: () => {
      toast.success("All posts approved");
      router.refresh();
    },
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

  useEffect(() => {
    if (schedule) {
      setBulkPrompt(schedule.contentPrompt || "");
    }
  }, [schedule]);

  const handleActivate = () => {
    activateSchedule.mutate({ scheduleId, workspaceId });
  };

  const handleGenerateBulkPosts = async () => {
    if (!bulkPrompt) {
      toast.error("Please provide a detailed prompt");
      return;
    }
    try {
      await generateBulkPosts.mutateAsync({
        scheduleId,
        workspaceId,
        prompt: bulkPrompt,
      });
      const interval = setInterval(() => {
        refetchProgress();
        if (progress?.completed === progress?.total) {
          clearInterval(interval);
          toast.success("Post generation completed");
          router.refresh();
        }
      }, 5000);
    } catch (error) {
      toast.error(
        "Failed to start generation process: " + (error as Error).message
      );
    }
  };

  const handleGenerateImagesForAllPosts = async () => {
    try {
      await generateImagesForAllPosts.mutateAsync({ scheduleId, workspaceId });
      const interval = setInterval(() => {
        refetchProgress();
        if (progress?.completed === progress?.total) {
          clearInterval(interval);
          toast.success("Image generation completed for all posts");
          router.refresh();
        }
      }, 5000);
    } catch (error) {
      toast.error(
        "Failed to start image generation process: " + (error as Error).message
      );
    }
  };

  const handleDeleteAllPosts = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteAllPosts = () => {
    deleteAllPosts.mutate({ scheduleId, workspaceId });
    setShowDeleteDialog(false);
  };

  const handleDeletePost = (postId: string) => {
    setPostToDelete(postId);
    setShowPostDeleteDialog(true);
  };

  const confirmDeletePost = () => {
    if (postToDelete) {
      deletePost.mutate({ postId: postToDelete, workspaceId });
      setShowPostDeleteDialog(false);
      setPostToDelete(null);
    }
  };

  const handleApprove = (postId: string) => {
    approvePost.mutate({ postId, approve: true });
  };

  const handleUnapprove = (postId: string) => {
    unapprovePost.mutate({ postId, approve: false });
  };

  const allPostsApproved = schedule?.posts.every(
    (post) => post.status === PostStatus.APPROVED
  );

  const calculateTotalPosts = () => {
    let datesCount = 0;
    let current = new Date(schedule?.startDate || new Date());
    const end = schedule?.endDate
      ? new Date(schedule.endDate)
      : new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000);
    while (!isAfter(current, end)) {
      let include = false;
      const dayOfWeek = current.getDay();
      const dayOfMonth = current.getDate();
      switch (schedule?.frequency) {
        case "DAILY":
          include = true;
          break;
        case "WEEKLY":
          if (schedule.weekDays?.includes(dayOfWeek)) include = true;
          break;
        case "MONTHLY":
          if (schedule.monthDays?.includes(dayOfMonth)) include = true;
          break;
        case "CUSTOM":
          if (
            schedule.weekDays?.includes(dayOfWeek) ||
            schedule.monthDays?.includes(dayOfMonth)
          )
            include = true;
          break;
      }
      if (include) datesCount++;
      current = addDays(current, 1);
    }
    return (
      (schedule?.postsPerSlot || 1) *
      (schedule?.timeSlots.length || 1) *
      datesCount
    );
  };

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

  const totalPosts = calculateTotalPosts();
  const completionPercentage = progress
    ? (progress.completed / progress.total) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/workspace/${workspaceId}/dashboard`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              {schedule.platforms.map((platform: Platform) => {
                const platformInfo = platformIcons[platform];
                return (
                  platformInfo && (
                    <div
                      key={platform}
                      className={`w-8 h-8 ${platformInfo.color} rounded-lg flex items-center justify-center`}
                    >
                      <platformInfo.icon className="w-4 h-4 text-white" />
                    </div>
                  )
                );
              })}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                {schedule.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {schedule.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  schedule.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }
              >
                {schedule.isActive ? "Active" : "Draft"}
              </Badge>
              {!schedule.isActive && allPostsApproved && (
                <Button
                  onClick={handleActivate}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Activate Schedule
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Schedule
              </Button>
            </div>
          </div>
        </motion.div>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 mb-8 rounded-xl">
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
                    Provide a detailed prompt below to generate content and
                    hashtags for all posts.
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
                    placeholder="Enter a detailed prompt (e.g., 'Create engaging posts about sustainable fashion for young professionals on the specified platforms, tailored for August 21-31, 2025, with hashtags like #SustainableFashion #EcoFriendly')"
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
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Posts</h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateImagesForAllPosts}
                      disabled={generateImagesForAllPosts.isPending}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      <Image className="w-4 h-4 mr-2" />
                      {generateImagesForAllPosts.isPending
                        ? "Generating Images..."
                        : "Generate Images for all Posts"}
                    </Button>
                    {/* ✅ New bulk approve button */}
                    <Button
                      onClick={() =>
                        bulkApprovePosts.mutate({ scheduleId, workspaceId })
                      }
                      disabled={bulkApprovePosts.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {bulkApprovePosts.isPending
                        ? "Approving..."
                        : "Approve All Posts"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAllPosts}
                      disabled={deleteAllPosts.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete All Posts
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 dark:bg-slate-800">
                        <TableHead className="w-48 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Scheduled Date
                        </TableHead>
                        <TableHead className="w-36 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Platforms
                        </TableHead>
                        <TableHead className="w-[500px] py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Content
                        </TableHead>
                        <TableHead className="w-48 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Hashtags
                        </TableHead>
                        <TableHead className="w-32 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Status
                        </TableHead>
                        <TableHead className="w-72 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.posts.map((post) => (
                        <TableRow
                          key={post.id}
                          className="min-h-[100px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <TableCell className="py-6 align-top text-sm">
                            {post.scheduledAt
                              ? format(post.scheduledAt, "PPP HH:mm")
                              : "Not scheduled"}
                          </TableCell>
                          <TableCell className="py-6 align-top text-sm">
                            {post.socialAccounts
                              .map((acc) => acc.platform)
                              .join(", ")}
                          </TableCell>
                          <TableCell className="py-6 align-top text-sm whitespace-normal max-w-[500px]">
                            {post.content || "No content"}
                          </TableCell>
                          <TableCell className="py-6 align-top text-sm whitespace-normal">
                            {post.hashtags.map((tag) => `#${tag}`).join(", ") ||
                              "None"}
                          </TableCell>
                          <TableCell className="py-6 align-top">
                            <Badge
                              variant={
                                post.status === PostStatus.APPROVED
                                  ? "default"
                                  : post.status ===
                                    PostStatus.CONTENT_PENDING_APPROVAL
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {post.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-6 align-top flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/workspace/${workspaceId}/schedule/${scheduleId}/posts/${post.id}`
                                )
                              }
                              disabled={
                                post.status === PostStatus.APPROVED ||
                                post.status === PostStatus.SCHEDULED
                              }
                              size="sm"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            {post.status !== PostStatus.APPROVED && (
                              <Button
                                onClick={() => handleApprove(post.id)}
                                disabled={approvePost.isPending}
                                className="bg-green-600 hover:bg-green-700"
                                size="sm"
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
                                size="sm"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Unapprove
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              onClick={() => handleDeletePost(post.id)}
                              disabled={deletePost.isPending}
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <EditScheduleDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          schedule={schedule}
          workspaceId={workspaceId}
          scheduleId={scheduleId}
        />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all posts for this schedule?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAllPosts}
                disabled={deleteAllPosts.isPending}
              >
                {deleteAllPosts.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showPostDeleteDialog}
          onOpenChange={setShowPostDeleteDialog}
        >
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
                onClick={confirmDeletePost}
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
