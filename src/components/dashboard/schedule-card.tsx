// src/components/dashboard/schedule-card.tsx
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  FileText,
  Edit,
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  Instagram,
  Facebook,
  Linkedin,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  platforms: string[];
  duration: number | null;
  durationType: string;
  frequency: string;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: Date;
  postsGenerated: number;
  totalPosts: number;
  description?: string | null;
}

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
  onPause: (scheduleId: string) => void;
  onResume: (scheduleId: string) => void;
  index: number;
}

const platformIcons = {
  Instagram: { icon: Instagram, color: "bg-pink-500" },
  Facebook: { icon: Facebook, color: "bg-blue-600" },
  LinkedIn: { icon: Linkedin, color: "bg-blue-700" },
};

export function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onPause,
  onResume,
  index,
}: ScheduleCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  const handleDelete = () => {
    onDelete(schedule.id);
    setShowDeleteDialog(false);
    toast.success("Schedule deleted successfully!");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    {schedule.name}
                  </h3>
                  <Badge className={getStatusColor(schedule.status)}>
                    {schedule.status}
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
                  {schedule.status === "active" && (
                    <DropdownMenuItem onClick={() => onPause(schedule.id)}>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Schedule
                    </DropdownMenuItem>
                  )}
                  {schedule.status === "paused" && (
                    <DropdownMenuItem onClick={() => onResume(schedule.id)}>
                      <Play className="w-4 h-4 mr-2" />
                      Resume Schedule
                    </DropdownMenuItem>
                  )}
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

              {schedule.status !== "completed" && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">
                      Progress
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {Math.round(
                        (schedule.postsGenerated / schedule.totalPosts) * 100
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      (schedule.postsGenerated / schedule.totalPosts) * 100
                    }
                    className="h-2"
                  />
                </div>
              )}

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
      </motion.div>

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
