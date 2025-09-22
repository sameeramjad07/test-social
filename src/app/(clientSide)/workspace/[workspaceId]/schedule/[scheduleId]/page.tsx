"use client";
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
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Edit,
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isAfter, addDays } from "date-fns";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  SAMEER_PROMOWAVES_NEON_ID,
  PROMOWAVES_WORKSPACE_ID,
} from "@/lib/constants";

function EnlargableImage({ src, alt }: { src?: string | null; alt?: string }) {
  const FALLBACK = "/no-image.jpg";
  const [imgSrc, setImgSrc] = useState<string>(src || FALLBACK);

  useEffect(() => {
    setImgSrc(src || FALLBACK);
  }, [src]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          src={imgSrc}
          alt={alt ?? "Post preview"}
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (imgSrc !== FALLBACK) setImgSrc(FALLBACK);
          }}
          className="w-36 h-36 object-cover rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition"
        />
      </DialogTrigger>
      <DialogContent className="p-0 max-w-4xl">
        <VisuallyHidden>
          <DialogTitle>{alt ?? "Full image preview"}</DialogTitle>
        </VisuallyHidden>
        <img
          src={imgSrc}
          alt={alt ?? "Full preview"}
          className="w-full h-auto rounded-md"
        />
      </DialogContent>
    </Dialog>
  );
}

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

export default function ScheduleViewPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.scheduleId as string;
  const workspaceId = params.workspaceId as string;
  const isPromowaves = workspaceId === PROMOWAVES_WORKSPACE_ID; // update here

  const { data: schedule, isLoading } = api.schedules.getSchedule.useQuery(
    { scheduleId, workspaceId },
    { enabled: !!scheduleId && !!workspaceId }
  );

  const calculateTotalPosts = () => {
    if (!schedule) return 0;
    let datesCount = 0;
    let current = new Date(schedule.startDate || new Date());
    const end = schedule.endDate
      ? new Date(schedule.endDate)
      : new Date(current.getTime() + 30 * 24 * 60 * 60 * 1000);

    while (!isAfter(current, end)) {
      let include = false;
      const dayOfWeek = current.getDay();
      const dayOfMonth = current.getDate();
      switch (schedule.frequency) {
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
      (schedule.postsPerSlot || 1) *
      (schedule.timeSlots.length || 1) *
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
              <Button
                variant="outline"
                onClick={() =>
                  router.push(
                    `/workspace/${workspaceId}/schedule/${scheduleId}/edit`
                  )
                }
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Schedule
              </Button>
            </div>
          </div>
        </motion.div>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 mb-8 rounded-xl">
          <CardHeader>
            <CardTitle>Schedule Details</CardTitle>
            <CardDescription>
              {isPromowaves
                ? "View posts for Promowaves, using store data from the affiliate marketing platform."
                : "View posts for this schedule."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Schedule configuration details:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 mt-2">
                <li>
                  <strong>Platforms:</strong> {schedule.platforms.join(", ")}
                </li>
                <li>
                  <strong>Dates:</strong> {format(schedule.startDate, "PPP")} to{" "}
                  {schedule.endDate
                    ? format(schedule.endDate, "PPP")
                    : "30 days from start"}
                </li>
                <li>
                  <strong>Time Slots:</strong> {schedule.timeSlots.join(", ")}
                </li>
                <li>
                  <strong>Posts per Slot:</strong> {schedule.postsPerSlot}
                </li>
                <li>
                  <strong>Total Posts:</strong> {totalPosts}
                </li>
                <li>
                  <strong>Content Prompt:</strong>{" "}
                  {isPromowaves
                    ? schedule.contentPrompt ||
                      "Create engaging affiliate marketing posts for various stores, highlighting their products and including their display URL."
                    : schedule.contentPrompt || "None"}
                </li>
              </ul>
            </div>
            {schedule.posts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Posts</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-100 dark:bg-slate-800">
                        <TableHead className="w-32 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Scheduled Date
                        </TableHead>
                        <TableHead className="w-36 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Platforms
                        </TableHead>
                        <TableHead className="w-32 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Image
                        </TableHead>
                        <TableHead className="w-[500px] py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Content
                        </TableHead>
                        {isPromowaves && (
                          <>
                            <TableHead className="w-48 py-4 font-semibold text-slate-900 dark:text-slate-100">
                              Store Name
                            </TableHead>
                            <TableHead className="w-48 py-4 font-semibold text-slate-900 dark:text-slate-100">
                              Store URL
                            </TableHead>
                          </>
                        )}
                        <TableHead className="w-48 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Hashtags
                        </TableHead>
                        <TableHead className="w-32 py-4 font-semibold text-slate-900 dark:text-slate-100">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.posts.map((post) => (
                        <TableRow
                          key={post.id}
                          className="min-h-[100px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <TableCell className="py-6 align-top text-sm whitespace-nowrap">
                            {post.scheduledAt
                              ? format(post.scheduledAt, "MMM d, yyyy HH:mm")
                              : "Not scheduled"}
                          </TableCell>
                          <TableCell className="py-6 align-top text-sm">
                            {post.socialAccounts
                              .map((acc) => acc.platform)
                              .join(", ")}
                          </TableCell>
                          <TableCell className="py-6 align-top">
                            <div className="w-36 h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                              <EnlargableImage
                                src={post.images?.[0]?.url ?? null}
                                alt="Post preview"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-6 align-top text-sm whitespace-normal max-w-[500px]">
                            {post.content || "No content"}
                          </TableCell>
                          {isPromowaves && (
                            <>
                              <TableCell className="py-6 align-top text-sm">
                                {post.storeName || "N/A"}
                              </TableCell>
                              <TableCell className="py-6 align-top text-sm">
                                {post.storeUrl ? (
                                  <a
                                    href={post.storeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {post.storeUrl}
                                  </a>
                                ) : (
                                  "N/A"
                                )}
                              </TableCell>
                            </>
                          )}
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
