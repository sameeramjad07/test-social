"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { PostEntry } from "./post-entry";
import type { Post, Schedule } from "@/types/calendar";

interface CalendarDayProps {
  date: Date;
  posts: Post[];
  schedules: Schedule[];
  isToday: boolean;
  isSelected: boolean;
  onDateClick: (date: Date) => void;
  onPostClick: (post: Post) => void;
  onScheduleClick: (schedule: Schedule) => void;
}

export function CalendarDay({
  date,
  posts,
  schedules,
  isToday,
  isSelected,
  onDateClick,
  onPostClick,
  onScheduleClick,
}: CalendarDayProps) {
  // Group posts by schedule
  const postsBySchedule = posts.reduce((acc, post) => {
    const key = post.scheduleId || "individual";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(post);
    return acc;
  }, {} as Record<string, Post[]>);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-2 h-32 border rounded-lg cursor-pointer transition-all overflow-hidden ${
        isToday
          ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
          : isSelected
          ? "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800"
          : "hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
      onClick={() => onDateClick(date)}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`text-sm font-medium ${isToday ? "text-blue-600" : ""}`}
        >
          {date.getDate()}
        </span>
        {posts.length > 0 && (
          <Badge variant="secondary" className="text-xs px-1 py-0">
            {posts.length}
          </Badge>
        )}
      </div>

      <div className="space-y-1 overflow-y-auto max-h-20">
        {Object.entries(postsBySchedule).map(([scheduleKey, schedulePosts]) => {
          if (scheduleKey === "individual") {
            // Show individual posts
            return schedulePosts.map((post) => (
              <PostEntry
                key={post.id}
                post={post}
                onClick={(e) => {
                  e.stopPropagation();
                  onPostClick(post);
                }}
              />
            ));
          } else {
            // Show schedule entries
            const schedule = schedules.find((s) => s.id === scheduleKey);
            if (!schedule) return null;

            return (
              <div
                key={scheduleKey}
                className="text-xs p-1 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onScheduleClick(schedule);
                }}
              >
                <div className="font-medium truncate">{schedule.name}</div>
                <div className="text-xs opacity-90">
                  {schedulePosts.length} posts
                </div>
              </div>
            );
          }
        })}
      </div>
    </motion.div>
  );
}
