"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { CreatePostDialog } from "@/components/calendar/create-post-dialog";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";

export default function CalendarPage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const [currentDate, setCurrentDate] = useState(new Date(2025, 7, 11)); // August 11, 2025 (month index 7)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: activeSchedules } = api.schedules.activeList.useQuery(
    {
      workspaceId,
      isActive: true,
    },
    {
      select: (data) => data.filter((s) => s.isActive),
    }
  );

  const { data: scheduledPosts } = api.posts.list.useQuery({
    workspaceId,
    scheduled: true,
    status: "SCHEDULED",
  });

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  Content Calendar
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Schedule and manage your social media posts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={viewMode}
                onValueChange={(value: "month" | "week" | "day") =>
                  setViewMode(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Post
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar Grid */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <CalendarGrid
              currentDate={currentDate}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              scheduledPosts={(scheduledPosts || []).map((post) => ({
                ...post,
                storeName: post.storeName ?? null,
                storeUrl: post.storeUrl ?? null,
                scheduleId: post.scheduleId ?? null,
              }))}
              schedules={activeSchedules || []}
              navigateMonth={navigateMonth}
            />
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <CalendarSidebar
              scheduledPosts={scheduledPosts || []}
              selectedDate={selectedDate}
            />
          </motion.div>
        </div>

        {/* Create Post Dialog */}
        <CreatePostDialog
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  );
}
