"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Sparkles,
  Edit,
  Calendar,
  Play,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ContentGenerationTab } from "@/components/schedule/content-generation-tab";
import { PostEditorTab } from "@/components/schedule/post-editor-tab";

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

interface Schedule {
  id: string;
  name: string;
  platforms: string[];
  duration: number;
  durationType: "days" | "weeks" | "months";
  frequency: string;
  status: "draft" | "active" | "paused" | "completed";
  description?: string;
  brandContext?: string;
  targetAudience?: string;
  contentStyle?: string;
  posts: Post[];
}

const platformIcons = {
  Instagram: { icon: Instagram, color: "bg-pink-500" },
  Twitter: { icon: Twitter, color: "bg-blue-500" },
  Facebook: { icon: Facebook, color: "bg-blue-600" },
  LinkedIn: { icon: Linkedin, color: "bg-blue-700" },
};

export default function ScheduleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;

  const [schedule, setSchedule] = useState<Schedule | null>(null);

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockSchedule: Schedule = {
      id: scheduleId,
      name: "Product Launch Campaign",
      platforms: ["Instagram", "Twitter", "LinkedIn"],
      duration: 4,
      durationType: "weeks",
      frequency: "daily",
      status: "draft",
      description: "Comprehensive campaign for new AI feature launch",
      brandContext:
        "AI-powered social media management platform focused on helping businesses grow their online presence",
      targetAudience:
        "Small to medium business owners, marketing professionals, content creators",
      contentStyle:
        "Professional yet approachable, informative, engaging with a focus on value-driven content",
      posts: [
        {
          id: "1",
          content:
            "🚀 Exciting news! We're launching our revolutionary AI-powered content generator that will transform how you create social media posts. Say goodbye to writer's block and hello to endless creativity! #AI #SocialMedia #Innovation",
          platform: "Instagram",
          scheduledDate: new Date(2025, 1, 15, 10, 0),
          status: "content-generated",
          hashtags: ["AI", "SocialMedia", "Innovation", "ContentCreation"],
        },
        {
          id: "2",
          content:
            "The future of social media management is here! Our new AI feature can generate engaging content tailored to your brand voice in seconds. Ready to 10x your content creation? #ProductLaunch #AI #Productivity",
          platform: "Twitter",
          scheduledDate: new Date(2025, 1, 15, 14, 0),
          status: "content-generated",
          hashtags: ["ProductLaunch", "AI", "Productivity"],
        },
        {
          id: "3",
          content: "",
          platform: "LinkedIn",
          scheduledDate: new Date(2025, 1, 16, 9, 0),
          status: "draft",
          hashtags: [],
        },
      ],
    };
    setSchedule(mockSchedule);
  }, [scheduleId]);

  const handleGenerateContent = async (prompt: string) => {
    // Simulate AI content generation
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (schedule) {
      const updatedPosts = schedule.posts.map((post) => {
        if (post.status === "draft") {
          return {
            ...post,
            content: `Generated content based on: "${prompt}". This is a sample AI-generated post that would be created based on your prompt and brand context. #AI #Generated #Content`,
            status: "content-generated" as const,
            hashtags: ["AI", "Generated", "Content"],
          };
        }
        return post;
      });

      setSchedule({ ...schedule, posts: updatedPosts });
      toast.success("Content generated successfully!");
    }
  };

  const handleGenerateImage = async (post: Post, prompt: string) => {
    // Simulate AI image generation
    await new Promise((resolve) => setTimeout(resolve, 4000));

    if (schedule) {
      const updatedPosts = schedule.posts.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            imageUrl: `/placeholder.svg?height=400&width=400&text=AI Generated Image`,
            imagePrompt: prompt,
            status: "image-generated" as const,
          };
        }
        return p;
      });

      setSchedule({ ...schedule, posts: updatedPosts });
      toast.success("Image generated successfully!");
    }
  };

  const handleUpdatePost = (postId: string, updates: Partial<Post>) => {
    if (schedule) {
      const updatedPosts = schedule.posts.map((post) =>
        post.id === postId ? { ...post, ...updates } : post
      );
      setSchedule({ ...schedule, posts: updatedPosts });
    }
  };

  const handleDeletePost = (postId: string) => {
    if (schedule) {
      const updatedPosts = schedule.posts.filter((post) => post.id !== postId);
      setSchedule({ ...schedule, posts: updatedPosts });
    }
  };

  const handleApprovePost = (postId: string) => {
    if (schedule) {
      const updatedPosts = schedule.posts.map((post) => {
        if (post.id === postId && post.status !== "draft") {
          return { ...post, status: "approved" as const };
        }
        return post;
      });
      setSchedule({ ...schedule, posts: updatedPosts });
      toast.success("Post approved!");
    }
  };

  const handleUnapprovePost = (postId: string) => {
    if (schedule) {
      const updatedPosts = schedule.posts.map((post) => {
        if (post.id === postId && post.status === "approved") {
          return {
            ...post,
            status: post.imageUrl
              ? ("image-generated" as const)
              : ("content-generated" as const),
          };
        }
        return post;
      });
      setSchedule({ ...schedule, posts: updatedPosts });
      toast.success("Post approval removed!");
    }
  };

  const handleActivateSchedule = () => {
    if (schedule) {
      const allPostsApproved = schedule.posts.every(
        (post) => post.status === "approved"
      );
      if (!allPostsApproved) {
        toast.error("Please approve all posts before activating the schedule");
        return;
      }

      const updatedPosts = schedule.posts.map((post) => ({
        ...post,
        status: "scheduled" as const,
      }));

      setSchedule({ ...schedule, status: "active", posts: updatedPosts });
      toast.success(
        "Schedule activated! Posts will be published according to the schedule."
      );
    }
  };

  const getStatusColor = (status: Schedule["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "draft":
        return "bg-yellow-100 text-yellow-700";
      case "paused":
        return "bg-orange-100 text-orange-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getCompletionPercentage = () => {
    if (!schedule) return 0;
    const approvedPosts = schedule.posts.filter(
      (post) => post.status === "approved"
    ).length;
    return (approvedPosts / schedule.posts.length) * 100;
  };

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              {schedule.platforms.map((platform) => {
                const platformInfo =
                  platformIcons[platform as keyof typeof platformIcons];
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
              <Badge className={getStatusColor(schedule.status)}>
                {schedule.status}
              </Badge>
              {schedule.status === "draft" &&
                getCompletionPercentage() === 100 && (
                  <Button
                    onClick={handleActivateSchedule}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Activate Schedule
                  </Button>
                )}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Completion Progress</span>
              <span>{Math.round(getCompletionPercentage())}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </div>
        </motion.div>

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Content Generation
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Post Editor
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Preview
            </TabsTrigger>
          </TabsList>

          {/* Content Generation Tab */}
          <TabsContent value="content">
            <ContentGenerationTab
              schedule={schedule}
              onGenerateContent={handleGenerateContent}
            />
          </TabsContent>

          {/* Post Editor Tab */}
          <TabsContent value="posts">
            <PostEditorTab
              posts={schedule.posts}
              onUpdatePost={handleUpdatePost}
              onDeletePost={handleDeletePost}
              onApprovePost={handleApprovePost}
              onUnapprovePost={handleUnapprovePost}
              onGenerateImage={handleGenerateImage}
            />
          </TabsContent>

          {/* Schedule Preview Tab */}
          <TabsContent value="schedule">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Schedule Preview</CardTitle>
                <CardDescription>
                  Preview how your posts will be scheduled across platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedule.posts
                    .sort(
                      (a, b) =>
                        a.scheduledDate.getTime() - b.scheduledDate.getTime()
                    )
                    .map((post, index) => {
                      const platformInfo =
                        platformIcons[
                          post.platform as keyof typeof platformIcons
                        ];
                      return (
                        <div
                          key={post.id}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          {platformInfo && (
                            <div
                              className={`w-10 h-10 ${platformInfo.color} rounded-lg flex items-center justify-center`}
                            >
                              <platformInfo.icon className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {post.platform}
                              </span>
                              <Badge
                                className={`${
                                  post.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {post.status.replace("-", " ")}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {post.scheduledDate.toLocaleDateString()} at{" "}
                              {post.scheduledDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {post.content && (
                              <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 line-clamp-2">
                                {post.content}
                              </p>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
