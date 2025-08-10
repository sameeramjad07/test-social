"use client";

import { useState } from "react";
import { Platform } from "@prisma/client";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Sparkles,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ScheduleCreationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function ScheduleCreationDialog({
  isOpen,
  onOpenChange,
  workspaceId,
}: ScheduleCreationDialogProps) {
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    description: "",
    platforms: [] as Platform[],
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    frequency: "DAILY" as "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM",
    weekDays: [] as number[],
    monthDays: [] as number[],
    timeSlots: ["12:00"],
    postsPerSlot: 1,
    contentPrompt: "",
    imagePrompt: "",
    hashtags: [] as string[],
  });

  const { data: socialAccounts } = api.socialAccounts.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  const createMutation = api.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule created successfully!");
      onOpenChange(false);
      setNewSchedule({
        name: "",
        description: "",
        platforms: [],
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: "",
        frequency: "DAILY",
        weekDays: [],
        monthDays: [],
        timeSlots: ["12:00"],
        postsPerSlot: 1,
        contentPrompt: "",
        imagePrompt: "",
        hashtags: [],
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const platformIcons = {
    INSTAGRAM: { icon: Instagram, color: "bg-pink-500" },
    FACEBOOK: { icon: Facebook, color: "bg-blue-600" },
    LINKEDIN: { icon: Linkedin, color: "bg-blue-700" },
  };

  const frequencyOptions = [
    { value: "DAILY", label: "Daily" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "CUSTOM", label: "Custom" },
  ];

  const handlePlatformToggle = (platform: Platform) => {
    setNewSchedule((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const handleWeekDayToggle = (day: number) => {
    setNewSchedule((prev) => ({
      ...prev,
      weekDays: prev.weekDays.includes(day)
        ? prev.weekDays.filter((d) => d !== day)
        : [...prev.weekDays, day],
    }));
  };

  const handleMonthDayToggle = (day: number) => {
    setNewSchedule((prev) => ({
      ...prev,
      monthDays: prev.monthDays.includes(day)
        ? prev.monthDays.filter((d) => d !== day)
        : [...prev.monthDays, day],
    }));
  };

  const handleAddTimeSlot = () => {
    setNewSchedule((prev) => ({
      ...prev,
      timeSlots: [...prev.timeSlots, "12:00"],
    }));
  };

  const handleTimeSlotChange = (index: number, value: string) => {
    setNewSchedule((prev) => {
      const newTimeSlots = [...prev.timeSlots];
      newTimeSlots[index] = value;
      return { ...prev, timeSlots: newTimeSlots };
    });
  };

  const handleCreateSchedule = () => {
    if (!newSchedule.name || newSchedule.platforms.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      workspaceId,
      ...newSchedule,
      startDate: newSchedule.startDate,
      endDate: newSchedule.endDate || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Create AI Content Schedule
          </DialogTitle>
          <DialogDescription>
            Set up a new AI-powered content schedule for your social media
            platforms
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Schedule Name */}
          <div className="space-y-2">
            <Label htmlFor="schedule-name">Schedule Name *</Label>
            <Input
              id="schedule-name"
              value={newSchedule.name}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, name: e.target.value })
              }
              placeholder="e.g., Product Launch Campaign"
            />
          </div>

          {/* Platform Selection */}
          <div className="space-y-3">
            <Label>Select Platforms *</Label>
            <div className="grid grid-cols-2 gap-3">
              {socialAccounts?.map((account) => {
                const { icon: Icon, color } = platformIcons[
                  account.platform as keyof typeof platformIcons
                ] || {
                  icon: Sparkles,
                  color: "bg-gray-500",
                };

                return (
                  <div
                    key={account.platform}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      newSchedule.platforms.includes(account.platform)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => handlePlatformToggle(account.platform)}
                  >
                    <Checkbox
                      checked={newSchedule.platforms.includes(account.platform)}
                      onCheckedChange={() =>
                        handlePlatformToggle(account.platform)
                      }
                    />
                    <div
                      className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {account.accountName || account.platform}
                      </p>
                      <p className="text-xs text-slate-500">
                        Expires:{" "}
                        {account.expiresAt
                          ? new Date(account.expiresAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule Timing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={newSchedule.startDate}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date (Optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={newSchedule.endDate}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, endDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Frequency and Time Slots */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Posting Frequency *</Label>
            <Select
              value={newSchedule.frequency}
              onValueChange={(
                value: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"
              ) => setNewSchedule({ ...newSchedule, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(newSchedule.frequency === "WEEKLY" ||
            newSchedule.frequency === "CUSTOM") && (
            <div className="space-y-2">
              <Label>Week Days</Label>
              <div className="flex gap-2 flex-wrap">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        checked={newSchedule.weekDays.includes(index)}
                        onChange={() => handleWeekDayToggle(index)}
                      />
                      <span>{day}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {(newSchedule.frequency === "MONTHLY" ||
            newSchedule.frequency === "CUSTOM") && (
            <div className="space-y-2">
              <Label>Month Days</Label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      checked={newSchedule.monthDays.includes(day)}
                      onChange={() => handleMonthDayToggle(day)}
                    />
                    <span>{day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Time Slots *</Label>
            {newSchedule.timeSlots.map((slot, index) => (
              <Input
                key={index}
                type="time"
                value={slot}
                onChange={(e) => handleTimeSlotChange(index, e.target.value)}
                className="mb-2"
              />
            ))}
            <Button
              variant="outline"
              onClick={handleAddTimeSlot}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Time Slot
            </Button>
          </div>

          {/* AI Prompts */}
          <div className="space-y-2">
            <Label htmlFor="content-prompt">Content Prompt (Optional)</Label>
            <Textarea
              id="content-prompt"
              value={newSchedule.contentPrompt}
              onChange={(e) =>
                setNewSchedule({
                  ...newSchedule,
                  contentPrompt: e.target.value,
                })
              }
              placeholder="e.g., Write engaging posts about our new AI features..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image-prompt">Image Prompt (Optional)</Label>
            <Textarea
              id="image-prompt"
              value={newSchedule.imagePrompt}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, imagePrompt: e.target.value })
              }
              placeholder="e.g., Generate images of futuristic tech interfaces..."
              rows={3}
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags (Optional)</Label>
            <Input
              id="hashtags"
              value={newSchedule.hashtags.join(", ")}
              onChange={(e) =>
                setNewSchedule({
                  ...newSchedule,
                  hashtags: e.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              placeholder="e.g., #AI, #SocialMedia, #Marketing"
            />
          </div>

          {/* Preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h4 className="font-medium mb-2">Schedule Preview</h4>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p>
                <strong>Platforms:</strong>{" "}
                {newSchedule.platforms.join(", ") || "None selected"}
              </p>
              <p>
                <strong>Start Date:</strong> {newSchedule.startDate}
              </p>
              <p>
                <strong>End Date:</strong>{" "}
                {newSchedule.endDate || "Not specified"}
              </p>
              <p>
                <strong>Frequency:</strong>{" "}
                {frequencyOptions.find((f) => f.value === newSchedule.frequency)
                  ?.label || newSchedule.frequency}
              </p>
              <p>
                <strong>Time Slots:</strong> {newSchedule.timeSlots.join(", ")}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateSchedule}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
