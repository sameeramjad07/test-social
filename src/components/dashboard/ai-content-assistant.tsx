"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Zap, FileText, Play, Pause } from "lucide-react";
import { ScheduleCard } from "./schedule-card";
import { motion } from "framer-motion";

interface Schedule {
  id: string;
  name: string;
  platforms: string[];
  duration: number;
  durationType: "days" | "weeks" | "months";
  frequency: string;
  status: "draft" | "active" | "paused" | "completed";
  createdAt: Date;
  postsGenerated: number;
  totalPosts: number;
  description?: string;
}

interface AIContentAssistantProps {
  schedules: Schedule[];
  onCreateSchedule: () => void;
  onEditSchedule: (scheduleId: string) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onPauseSchedule: (scheduleId: string) => void;
  onResumeSchedule: (scheduleId: string) => void;
}

export function AIContentAssistant({
  schedules,
  onCreateSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onPauseSchedule,
  onResumeSchedule,
}: AIContentAssistantProps) {
  const draftSchedules = schedules.filter((s) => s.status === "draft");
  const activeSchedules = schedules.filter((s) => s.status === "active");
  const pausedSchedules = schedules.filter((s) => s.status === "paused");
  const completedSchedules = schedules.filter((s) => s.status === "completed");

  const ScheduleSection = ({
    title,
    schedules,
    icon: Icon,
    emptyMessage,
    emptyAction,
  }: {
    title: string;
    schedules: Schedule[];
    icon: any;
    emptyMessage: string;
    emptyAction?: () => void;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {schedules.length}
          </Badge>
        </div>
      </div>
      {schedules.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
          <Icon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">{emptyMessage}</p>
          {emptyAction && (
            <Button onClick={emptyAction} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((schedule, index) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              onEdit={onEditSchedule}
              onDelete={onDeleteSchedule}
              onPause={onPauseSchedule}
              onResume={onResumeSchedule}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-8"
    >
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Content Assistant
              </CardTitle>
              <CardDescription>
                Manage your AI-powered content schedules
              </CardDescription>
            </div>
            <Button
              onClick={onCreateSchedule}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Draft Schedules */}
          <ScheduleSection
            title="Draft Schedules"
            schedules={draftSchedules}
            icon={FileText}
            emptyMessage="No draft schedules yet"
            emptyAction={onCreateSchedule}
          />

          {/* Active Schedules */}
          <ScheduleSection
            title="Active Schedules"
            schedules={activeSchedules}
            icon={Play}
            emptyMessage="No active schedules running"
          />

          {/* Paused Schedules */}
          {pausedSchedules.length > 0 && (
            <ScheduleSection
              title="Paused Schedules"
              schedules={pausedSchedules}
              icon={Pause}
              emptyMessage="No paused schedules"
            />
          )}

          {/* Completed Schedules */}
          {completedSchedules.length > 0 && (
            <ScheduleSection
              title="Completed Schedules"
              schedules={completedSchedules}
              icon={Zap}
              emptyMessage="No completed schedules"
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
