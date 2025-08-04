"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDay } from "./calendar-day";
import { PostDetailsDialog } from "./post-details-dialog";
import { ScheduleDetailsDialog } from "./schedule-details-dialog";
import type { Post, Schedule } from "@/types/calendar";

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  scheduledPosts: Post[];
  schedules: Schedule[];
  navigateMonth: (direction: "prev" | "next") => void;
  onUpdatePost: (post: Post) => void;
  onDeletePost: (postId: number) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

export function CalendarGrid({
  currentDate,
  selectedDate,
  setSelectedDate,
  scheduledPosts,
  schedules,
  navigateMonth,
  onUpdatePost,
  onDeletePost,
  onDeleteSchedule,
}: CalendarGridProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter(
      (post) => post.date.toDateString() === date.toDateString()
    );
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsPostDialogOpen(true);
  };

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsScheduleDialogOpen(true);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((date, index) => {
              if (!date) {
                return <div key={index} className="p-2 h-32" />;
              }

              const posts = getPostsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected =
                selectedDate?.toDateString() === date.toDateString();

              return (
                <CalendarDay
                  key={date.toISOString()}
                  date={date}
                  posts={posts}
                  schedules={schedules}
                  isToday={isToday}
                  isSelected={isSelected}
                  onDateClick={setSelectedDate}
                  onPostClick={handlePostClick}
                  onScheduleClick={handleScheduleClick}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Post Details Dialog */}
      <PostDetailsDialog
        isOpen={isPostDialogOpen}
        onClose={() => setIsPostDialogOpen(false)}
        post={selectedPost}
        schedules={schedules}
        onUpdatePost={onUpdatePost}
        onDeletePost={onDeletePost}
      />

      {/* Schedule Details Dialog */}
      <ScheduleDetailsDialog
        isOpen={isScheduleDialogOpen}
        onClose={() => setIsScheduleDialogOpen(false)}
        schedule={selectedSchedule}
        onDeleteSchedule={onDeleteSchedule}
      />
    </>
  );
}
