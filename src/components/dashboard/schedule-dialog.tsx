"use client";

import { useState } from "react";
import { Platform, ScheduleFrequency } from "@prisma/client";
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
import { Instagram, Facebook, Linkedin, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

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
    frequency: "DAILY" as ScheduleFrequency,
    weekDays: [] as number[],
    monthDays: [] as number[],
    timeSlots: ["12:00"],
    postsPerSlot: 1,
    contentPrompt: "",
    imagePrompt: "",
    hashtags: [] as string[],
  });

  const { data: socialAccounts, isLoading } = api.socialAccounts.list.useQuery(
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Create AI Content Schedule
            </DialogTitle>
            <DialogDescription className="text-sm">
              Set up a new AI-powered content schedule for your social media
              platforms
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Schedule Name */}
            <div className="space-y-1">
              <Label htmlFor="schedule-name" className="text-sm">
                Schedule Name *
              </Label>
              <Input
                id="schedule-name"
                value={newSchedule.name}
                onChange={(e) =>
                  setNewSchedule({ ...newSchedule, name: e.target.value })
                }
                placeholder="e.g., Product Launch Campaign"
                className="text-sm"
                required
              />
            </div>

            {/* Platform Selection */}
            <div className="space-y-1">
              <Label className="text-sm">Select Platforms *</Label>
              {isLoading ? (
                <div className="text-sm text-slate-500">
                  Loading social accounts...
                </div>
              ) : socialAccounts?.length === 0 ? (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                  No social accounts linked.{" "}
                  <Link
                    href={`/workspace/${workspaceId}/settings`}
                    className="text-blue-600 hover:underline"
                  >
                    Connect an account
                  </Link>{" "}
                  to continue.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
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
                        className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-all ${
                          newSchedule.platforms.includes(account.platform)
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                        onClick={() => handlePlatformToggle(account.platform)}
                      >
                        <Checkbox
                          checked={newSchedule.platforms.includes(
                            account.platform
                          )}
                          onCheckedChange={() =>
                            handlePlatformToggle(account.platform)
                          }
                          required={newSchedule.platforms.length === 0}
                        />
                        <div
                          className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center`}
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
              )}
            </div>

            {/* Schedule Timing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start-date" className="text-sm">
                  Start Date *
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newSchedule.startDate}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      startDate: e.target.value,
                    })
                  }
                  className="text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end-date" className="text-sm">
                  End Date (Optional)
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newSchedule.endDate}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, endDate: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
            </div>

            {/* Frequency and Time Slots */}
            <div className="space-y-1">
              <Label htmlFor="frequency" className="text-sm">
                Posting Frequency *
              </Label>
              <Select
                value={newSchedule.frequency}
                onValueChange={(value: ScheduleFrequency) =>
                  setNewSchedule({ ...newSchedule, frequency: value })
                }
              >
                <SelectTrigger className="text-sm">
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
              <div className="space-y-1">
                <Label className="text-sm">Week Days</Label>
                <div className="flex gap-2 flex-wrap">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Checkbox
                          checked={newSchedule.weekDays.includes(index)}
                          onCheckedChange={() => handleWeekDayToggle(index)}
                        />
                        <span className="text-sm">{day}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {(newSchedule.frequency === "MONTHLY" ||
              newSchedule.frequency === "CUSTOM") && (
              <div className="space-y-1">
                <Label className="text-sm">Month Days</Label>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <div key={day} className="flex items-center space-x-1">
                      <Checkbox
                        checked={newSchedule.monthDays.includes(day)}
                        onCheckedChange={() => handleMonthDayToggle(day)}
                      />
                      <span className="text-sm">{day}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-sm">Time Slots *</Label>
              {newSchedule.timeSlots.map((slot, index) => (
                <Input
                  key={index}
                  type="time"
                  value={slot}
                  onChange={(e) => handleTimeSlotChange(index, e.target.value)}
                  className="mb-1 text-sm"
                  required
                />
              ))}
              <Button
                variant="outline"
                onClick={handleAddTimeSlot}
                className="w-full text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </div>

            {/* AI Prompts */}
            <div className="space-y-1">
              <Label htmlFor="content-prompt" className="text-sm">
                Content Prompt (Optional)
              </Label>
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
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="image-prompt" className="text-sm">
                Image Prompt (Optional)
              </Label>
              <Textarea
                id="image-prompt"
                value={newSchedule.imagePrompt}
                onChange={(e) =>
                  setNewSchedule({
                    ...newSchedule,
                    imagePrompt: e.target.value,
                  })
                }
                placeholder="e.g., Generate images of futuristic tech interfaces..."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-1">
              <Label htmlFor="hashtags" className="text-sm">
                Hashtags (Optional)
              </Label>
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
                className="text-sm"
              />
            </div>

            {/* Preview */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Schedule Preview</h4>
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
                  {frequencyOptions.find(
                    (f) => f.value === newSchedule.frequency
                  )?.label || newSchedule.frequency}
                </p>
                <p>
                  <strong>Time Slots:</strong>{" "}
                  {newSchedule.timeSlots.join(", ")}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-sm"
              type="button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm"
              disabled={createMutation.isPending || isLoading}
            >
              {createMutation.isPending ? "Creating..." : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
