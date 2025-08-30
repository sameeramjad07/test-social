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
import { Loader2, FileText, Play, Plus, Sparkles } from "lucide-react";
import { ScheduleCard } from "./schedule-card";
import { toast } from "sonner";
import { Platform, PostStatus } from "@prisma/client";

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
  approvedPosts: number;
  totalPosts: number;
  description?: string | null;
  posts: {
    id: string;
    content: string;
    status: PostStatus;
    images: { url: string }[];
  }[];
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
  const {
    data: schedules,
    isLoading,
    refetch,
  } = api.schedules.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId, initialData: [] }
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

  // Type assertion to ensure schedules match the Schedule interface
  const draftSchedules: Schedule[] = (schedules as Schedule[]).filter(
    (s) => !s.isActive
  );
  const activeSchedules: Schedule[] = (schedules as Schedule[]).filter(
    (s) => s.isActive
  );

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
      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-500">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
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
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 cursor-pointer"
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
  );
}
