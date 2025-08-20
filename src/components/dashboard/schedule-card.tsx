"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  FileText,
  Edit,
  Play,
  Trash2,
  MoreHorizontal,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { Platform } from "@prisma/client";

interface Schedule {
  id: string;
  name: string;
  platforms: Platform[];
  duration: number | null;
  durationType: string;
  frequency: string;
  isActive: boolean;
  createdAt: Date;
  postsGenerated: number;
  totalPosts: number;
  description?: string | null;
}

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
  onToggleActive: (scheduleId: string, isActive: boolean) => void;
  index: number;
}

const platformIcons = {
  INSTAGRAM: { icon: Instagram, color: "bg-pink-500" },
  FACEBOOK: { icon: Facebook, color: "bg-blue-600" },
  LINKEDIN: { icon: Linkedin, color: "bg-blue-700" },
  TWITTER: { icon: Twitter, color: "bg-blue-500" },
  TIKTOK: { icon: Instagram, color: "bg-black" }, // Placeholder for TikTok
};

export function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggleActive,
}: ScheduleCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";
  };

  const handleDelete = () => {
    onDelete(schedule.id);
    setShowDeleteDialog(false);
    toast.success("Schedule deleted successfully!");
  };

  return (
    <>
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  {schedule.name}
                </h3>
                <Badge className={getStatusColor(schedule.isActive)}>
                  {schedule.isActive ? "Active" : "Draft"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {schedule.platforms.map((platform) => {
                  const platformInfo =
                    platformIcons[platform as keyof typeof platformIcons];
                  return (
                    platformInfo && (
                      <div
                        key={platform}
                        className={`w-6 h-6 ${platformInfo.color} rounded flex items-center justify-center`}
                      >
                        <platformInfo.icon className="w-3 h-3 text-white" />
                      </div>
                    )
                  );
                })}
              </div>
              {schedule.description && (
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                  {schedule.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(schedule.id)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Schedule
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onToggleActive(schedule.id, !schedule.isActive)
                  }
                >
                  {schedule.isActive ? (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Save as Draft
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Activate Schedule
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Schedule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>
                  {schedule.duration ?? "N/A"} {schedule.durationType}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>
                  {schedule.postsGenerated}/{schedule.totalPosts} posts
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  Progress
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  {Math.round(
                    (schedule.postsGenerated / (schedule.totalPosts || 1)) * 100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  (schedule.postsGenerated / (schedule.totalPosts || 1)) * 100
                }
                className="h-2"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Created {schedule.createdAt.toLocaleDateString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(schedule.id)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{schedule.name}"? This action
              cannot be undone and will remove all associated posts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
