"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Platform, ScheduleFrequency, PostStatus } from "@prisma/client";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  Edit,
  Calendar,
  Play,
  Plus,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

const platformIcons = {
  INSTAGRAM: {
    icon: Instagram,
    color: "bg-gradient-to-br from-pink-500 to-purple-500",
  },
  FACEBOOK: { icon: Facebook, color: "bg-blue-600" },
  LINKEDIN: { icon: Linkedin, color: "bg-blue-700" },
  TWITTER: { icon: Twitter, color: "bg-blue-400" },
  TIKTOK: { icon: Twitter, color: "bg-black" }, // Using Twitter icon as placeholder for TikTok
};

const scheduleFormSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  platforms: z.array(z.nativeEnum(Platform)).min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  frequency: z.nativeEnum(ScheduleFrequency),
  weekDays: z.array(z.number().min(0).max(6)).optional(),
  monthDays: z.array(z.number().min(1).max(31)).optional(),
  timeSlots: z.array(z.string()).min(1),
  postsPerSlot: z.number().min(1),
  contentPrompt: z.string().optional(),
  imagePrompt: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

type ScheduleForm = z.infer<typeof scheduleFormSchema>;

export default function ScheduleEditorPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.scheduleId as string;
  const workspaceId = params.workspaceId as string;

  const { data: schedule, isLoading } = api.schedules.getSchedule.useQuery(
    { scheduleId, workspaceId },
    { enabled: !!scheduleId && !!workspaceId }
  );

  const { data: socialAccounts } = api.socialAccounts.list.useQuery({
    workspaceId,
  });

  const updateSchedule = api.schedules.update.useMutation({
    onSuccess: () => toast.success("Schedule updated"),
    onError: (error) => toast.error(error.message),
  });

  const generateBulkPosts = api.posts.generateBulkPosts.useMutation({
    onSuccess: () => toast.success("All posts generated successfully"),
    onError: (error) => toast.error(error.message),
  });

  const { data: progress, refetch: refetchProgress } =
    api.posts.getGenerationProgress.useQuery(
      { scheduleId },
      { enabled: !!scheduleId, refetchInterval: 5000 }
    );

  const activateSchedule = api.schedules.activateSchedule.useMutation({
    onSuccess: () => toast.success("Schedule activated"),
    onError: (error) => toast.error(error.message),
  });

  const { register, handleSubmit, setValue, getValues } = useForm<ScheduleForm>(
    {
      resolver: zodResolver(scheduleFormSchema),
      defaultValues: {
        name: "",
        platforms: [],
        startDate: "",
        frequency: ScheduleFrequency.DAILY,
        timeSlots: ["12:00"],
        postsPerSlot: 1,
        hashtags: [],
      },
    }
  );

  const [bulkPrompt, setBulkPrompt] = useState("");

  useEffect(() => {
    if (schedule) {
      setValue("name", schedule.name);
      setValue("description", schedule.description || "");
      setValue("platforms", schedule.platforms);
      setValue("startDate", format(schedule.startDate, "yyyy-MM-dd"));
      setValue(
        "endDate",
        schedule.endDate ? format(schedule.endDate, "yyyy-MM-dd") : ""
      );
      setValue("frequency", schedule.frequency);
      setValue("weekDays", schedule.weekDays);
      setValue("monthDays", schedule.monthDays);
      setValue("timeSlots", schedule.timeSlots);
      setValue("postsPerSlot", schedule.postsPerSlot);
      setValue("contentPrompt", schedule.contentPrompt || "");
      setValue("imagePrompt", schedule.imagePrompt || "");
      setValue("hashtags", schedule.hashtags);
      setBulkPrompt(schedule.contentPrompt || "");
    }
  }, [schedule, setValue]);

  const onSubmit = (data: ScheduleForm) => {
    updateSchedule.mutate({
      scheduleId,
      workspaceId,
      ...data,
      endDate: data.endDate ? data.endDate : null,
    });
  };

  const handleGenerateBulkPosts = () => {
    generateBulkPosts.mutate({ scheduleId, workspaceId, prompt: bulkPrompt });
  };

  const handleActivate = () => {
    activateSchedule.mutate({ scheduleId, workspaceId });
  };

  // Calculate dates for post generation
  const dates = schedule
    ? (() => {
        const result = [];
        let current = new Date(schedule.startDate);
        const end = schedule.endDate
          ? new Date(schedule.endDate)
          : new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default
        while (current <= end) {
          let include = false;
          const dayOfWeek = current.getDay();
          const dayOfMonth = current.getDate();
          switch (schedule.frequency) {
            case "DAILY":
              include = true;
              break;
            case "WEEKLY":
              if (schedule.weekDays.includes(dayOfWeek)) {
                include = true;
              }
              break;
            case "MONTHLY":
              if (schedule.monthDays.includes(dayOfMonth)) {
                include = true;
              }
              break;
            case "CUSTOM":
              if (
                schedule.weekDays.includes(dayOfWeek) ||
                schedule.monthDays.includes(dayOfMonth)
              ) {
                include = true;
              }
              break;
          }
          if (include) {
            result.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
        return result;
      })()
    : [];

  const totalPosts = schedule
    ? schedule.postsPerSlot * schedule.timeSlots.length * dates.length
    : 0;

  const allPostsApproved = schedule?.posts.every(
    (post) => post.status === PostStatus.APPROVED
  );

  const completionPercentage = progress
    ? (progress.completed / progress.total) * 100
    : 0;

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
            <Button variant="outline" onClick={() => router.back()}>
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
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Edit Schedule Details</CardTitle>
                <CardDescription>
                  Update the schedule configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...register("name")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" {...register("description")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {socialAccounts?.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            checked={getValues("platforms")?.includes(
                              account.platform
                            )}
                            onCheckedChange={(checked) => {
                              const platforms = getValues("platforms") || [];
                              setValue(
                                "platforms",
                                checked
                                  ? [...platforms, account.platform]
                                  : platforms.filter(
                                      (p) => p !== account.platform
                                    )
                              );
                            }}
                          />
                          <Label>{account.platform}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        {...register("startDate")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        {...register("endDate")}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      onValueChange={(value) =>
                        setValue("frequency", value as ScheduleFrequency)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ScheduleFrequency).map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time Slots</Label>
                    <div className="space-y-2">
                      {getValues("timeSlots").map((slot, index) => (
                        <Input
                          key={index}
                          type="time"
                          onChange={(e) => {
                            const timeSlots = getValues("timeSlots");
                            timeSlots[index] = e.target.value;
                            setValue("timeSlots", timeSlots);
                          }}
                          value={slot}
                        />
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const timeSlots = getValues("timeSlots");
                          setValue("timeSlots", [...timeSlots, "12:00"]);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Time Slot
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postsPerSlot">Posts per Slot</Label>
                    <Input
                      id="postsPerSlot"
                      type="number"
                      {...register("postsPerSlot", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contentPrompt">Content Prompt</Label>
                    <Textarea
                      id="contentPrompt"
                      {...register("contentPrompt")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imagePrompt">Image Prompt</Label>
                    <Textarea id="imagePrompt" {...register("imagePrompt")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hashtags">Hashtags</Label>
                    <Input
                      id="hashtags"
                      onChange={(e) =>
                        setValue(
                          "hashtags",
                          e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter((t) => t.length > 0)
                        )
                      }
                      value={getValues("hashtags")?.join(", ") || ""}
                    />
                  </div>
                  <Button type="submit" disabled={updateSchedule.isPending}>
                    {updateSchedule.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Posts</CardTitle>
                <CardDescription>
                  Generate and manage all posts for this schedule
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
                          {dates.map((d) => format(d, "PPP")).join(", ")}
                        </li>
                        <li>
                          <strong>Time Slots:</strong>{" "}
                          {schedule.timeSlots.join(", ")}
                        </li>
                        <li>
                          <strong>Posts per Slot:</strong>{" "}
                          {schedule.postsPerSlot}
                        </li>
                      </ul>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                        Provide a detailed prompt below to generate content,
                        images, and hashtags for all posts.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulk-prompt">Content Prompt</Label>
                      <Textarea
                        id="bulk-prompt"
                        value={bulkPrompt}
                        onChange={(e) => setBulkPrompt(e.target.value)}
                        rows={6}
                        placeholder="Enter a detailed prompt for generating all posts (e.g., 'Create engaging posts about sustainable fashion for young professionals, including vibrant images and relevant hashtags')"
                      />
                    </div>
                    <Button
                      onClick={handleGenerateBulkPosts}
                      disabled={generateBulkPosts.isPending}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {generateBulkPosts.isPending
                        ? "Generating Posts..."
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
                        <TableHead>Action</TableHead>
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
                                alt="Post image"
                                className="w-16 h-16 object-cover rounded"
                              />
                            ) : (
                              "No image"
                            )}
                          </TableCell>
                          <TableCell>
                            {post.hashtags.map((tag) => `#${tag}`).join(", ")}
                          </TableCell>
                          <TableCell>
                            <Badge>{post.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/workspace/${workspaceId}/schedule/${scheduleId}/post/${post.id}`
                                )
                              }
                              disabled={post.status === PostStatus.APPROVED}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
