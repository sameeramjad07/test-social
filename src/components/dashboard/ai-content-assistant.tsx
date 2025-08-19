"use client";

import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Play, FileText } from "lucide-react";
import { ScheduleCard } from "./schedule-card";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  platforms: string[];
  duration: number | null;
  durationType: "days" | "weeks" | "months";
  frequency: string;
  isActive: boolean;
  createdAt: Date;
  postsGenerated: number;
  totalPosts: number;
  description?: string | null;
}

interface AIContentAssistantProps {
  workspaceId: string;
  onCreateSchedule: () => void;
  onEditSchedule: (scheduleId: string) => void;
}

export function AIContentAssistant({
  workspaceId,
  onCreateSchedule,
  onEditSchedule,
}: AIContentAssistantProps) {
  const { data: schedules, refetch } = api.schedules.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  const updateMutation = api.schedules.update.useMutation({
    onSuccess: (_, { isActive }) => {
      toast.success(`Schedule ${isActive ? "activated" : "saved as draft"}`);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = api.schedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const draftSchedules: Schedule[] =
    schedules
      ?.filter((s) => !s.isActive)
      .map((s) => ({
        ...s,
        durationType: s.durationType as "days" | "weeks" | "months",
      })) || [];

  const activeSchedules: Schedule[] =
    schedules
      ?.filter((s) => s.isActive)
      .map((s) => ({
        ...s,
        durationType: s.durationType as "days" | "weeks" | "months",
      })) || [];

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
              onDelete={(id) =>
                deleteMutation.mutate({ scheduleId: id, workspaceId })
              }
              onToggleActive={(id, isActive) =>
                updateMutation.mutate({
                  scheduleId: id,
                  workspaceId,
                  isActive,
                })
              }
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
          <ScheduleSection
            title="Draft Schedules"
            schedules={draftSchedules}
            icon={FileText}
            emptyMessage="No draft schedules yet"
            emptyAction={onCreateSchedule}
          />
          <ScheduleSection
            title="Active Schedules"
            schedules={activeSchedules}
            icon={Play}
            emptyMessage="No active schedules running"
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
