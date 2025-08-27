"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { PostEntry } from "./post-entry";
import type { Post, PostSchedule } from "@prisma/client";

interface CalendarDayProps {
  date: Date;
  posts: Post[];
  schedules: PostSchedule[];
  isToday: boolean;
  isSelected: boolean;
  onDateClick: (date: Date) => void;
  onPostClick: (post: Post) => void;
  onScheduleClick: (schedule: PostSchedule) => void;
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
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-2 h-32 border rounded-lg cursor-pointer transition-all overflow-y-auto ${
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

      <div className="space-y-1">
        {posts.map((post) => {
          const schedule = schedules.find((s) => s.id === post.scheduleId);
          return (
            <PostEntry
              key={post.id}
              post={post}
              onClick={(e) => {
                e.stopPropagation();
                onPostClick(post);
              }}
              scheduleName={schedule?.name}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
