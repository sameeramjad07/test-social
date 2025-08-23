"use client";

import { useState, useEffect } from "react";
import type { Post, Schedule } from "@/types/calendar";

export function useCalendarData() {
  // Sample scheduled posts data
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([
    {
      id: 1,
      title: "Product Launch Announcement",
      content: "Excited to announce our latest AI-powered feature! 🚀",
      platform: "Instagram",
      date: new Date(2025, 7, 2, 10, 0),
      status: "SCHEDULED",
      type: "image",
      engagement: { likes: 0, comments: 0, shares: 0 },
      scheduleId: "schedule-1",
      scheduleName: "Product Launch Campaign",
    },
    {
      id: 2,
      title: "Behind the Scenes",
      content: "Take a look behind the scenes of our development process",
      platform: "Twitter",
      date: new Date(2025, 7, 6, 14, 30),
      status: "SCHEDULED",
      type: "video",
      engagement: { likes: 0, comments: 0, shares: 0 },
      scheduleId: "schedule-1",
      scheduleName: "Product Launch Campaign",
    },
    {
      id: 3,
      title: "Industry Insights",
      content: "5 trends shaping the future of social media marketing",
      platform: "LinkedIn",
      date: new Date(2025, 7, 10, 9, 0),
      status: "SCHEDULED",
      type: "text",
      engagement: { likes: 0, comments: 0, shares: 0 },
      scheduleId: "schedule-2",
      scheduleName: "Industry Trends Series",
    },
    {
      id: 4,
      title: "Customer Success Story",
      content: "How @customer increased their engagement by 300%",
      platform: "Facebook",
      date: new Date(2025, 7, 11, 16, 0),
      status: "PUBLISHED",
      type: "image",
      engagement: { likes: 124, comments: 23, shares: 45 },
      scheduleId: "schedule-2",
      scheduleName: "Industry Trends Series",
    },
    {
      id: 5,
      title: "Weekly Tips",
      content: "3 ways to improve your social media strategy this week",
      platform: "Instagram",
      date: new Date(2025, 7, 18, 12, 0),
      status: "SCHEDULED",
      type: "image",
      engagement: { likes: 0, comments: 0, shares: 0 },
      scheduleId: "schedule-3",
      scheduleName: "Weekly Content Series",
    },
    {
      id: 6,
      title: "Product Feature Spotlight",
      content: "Discover how our AI assistant can save you hours every week",
      platform: "LinkedIn",
      date: new Date(2025, 7, 19, 10, 0),
      status: "SCHEDULED",
      type: "text",
      engagement: { likes: 0, comments: 0, shares: 0 },
      scheduleId: "schedule-1",
      scheduleName: "Product Launch Campaign",
    },
    {
      id: 7,
      title: "User Testimonial",
      content:
        '"This tool has completely transformed our social media workflow" - Jane D.',
      platform: "Twitter",
      date: new Date(2025, 7, 25, 15, 0),
      status: "SCHEDULED",
      type: "image",
      engagement: { likes: 0, comments: 0, shares: 0 },
      scheduleId: "schedule-3",
      scheduleName: "Weekly Content Series",
    },
  ]);

  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // Group posts by schedule
  useEffect(() => {
    const scheduleMap = new Map<string, Schedule>();

    scheduledPosts.forEach((post) => {
      if (post.scheduleId && post.scheduleName) {
        if (!scheduleMap.has(post.scheduleId)) {
          scheduleMap.set(post.scheduleId, {
            id: post.scheduleId,
            name: post.scheduleName,
            posts: [],
            status: "active",
          });
        }

        const schedule = scheduleMap.get(post.scheduleId);
        if (schedule) {
          schedule.posts.push(post);
        }
      }
    });

    setSchedules(Array.from(scheduleMap.values()));
  }, [scheduledPosts]);

  const addPost = (postData: Omit<Post, "id">) => {
    const newPost: Post = {
      ...postData,
      id: Date.now(),
    };
    setScheduledPosts([...scheduledPosts, newPost]);
  };

  const updatePost = (updatedPost: Post) => {
    setScheduledPosts((posts) =>
      posts.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
  };

  const deletePost = (postId: number) => {
    setScheduledPosts((posts) => posts.filter((post) => post.id !== postId));
  };

  const deleteSchedule = (scheduleId: string) => {
    setScheduledPosts((posts) =>
      posts.filter((post) => post.scheduleId !== scheduleId)
    );
  };

  return {
    scheduledPosts,
    schedules,
    addPost,
    updatePost,
    deletePost,
    deleteSchedule,
  };
}
