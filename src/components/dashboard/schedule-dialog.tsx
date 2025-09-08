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
import {
  Instagram,
  Facebook,
  Linkedin,
  Sparkles,
  Plus,
  Trash,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, isAfter } from "date-fns";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const utils = api.useUtils();
  const [progress, setProgress] = useState<number>(0);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    description: "",
    platforms: [] as Platform[],
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addDays(new Date(), 10), "yyyy-MM-dd"),
    frequency: "DAILY" as ScheduleFrequency,
    weekDays: [] as number[],
    monthDays: [] as number[],
    timeSlots: ["12:00"] as string[],
    postsPerSlot: 1,
    contentPrompt: "",
    hashtags: [] as string[],
    isActive: false,
  });

  const { data: socialAccounts, isLoading } = api.socialAccounts.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  const createMutation = api.schedules.create.useMutation();
  const generateBulkPosts = api.posts.generateBulkPosts.useMutation();

  const handleSuccess = async (data: { id: string }) => {
    try {
      setProgress(30); // schedule created

      // Start generating posts
      setProgress(60);
      toast.success("Schedule created. Generating posts...");
      await generateBulkPosts.mutateAsync({
        scheduleId: data.id,
        workspaceId,
        prompt: newSchedule.contentPrompt,
      });

      setProgress(80); // posts generating (midway)
      await new Promise((resolve) => setTimeout(resolve, 500)); // simulate step delay
      setProgress(100); // done
      toast.success("Schedule and posts created successfully!");
      // Invalidate schedules list
      await utils.schedules.list.invalidate({ workspaceId });
      router.push(`/workspace/${workspaceId}/schedule/${data.id}`);
      onOpenChange(false);
      setNewSchedule({
        name: "",
        description: "",
        platforms: [],
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        frequency: "DAILY",
        weekDays: [],
        monthDays: [],
        timeSlots: ["12:00"],
        postsPerSlot: 1,
        contentPrompt: "",
        hashtags: [],
        isActive: false,
      });
      setTimeout(() => setProgress(0), 800); // hide bar after short delay
    } catch (error) {
      toast.error("Failed to generate posts: " + (error as Error).message);
    }
  };

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

  const calculateTotalPosts = () => {
    let datesCount = 0;
    let current = new Date(newSchedule.startDate);
    const end = new Date(newSchedule.endDate);
    while (!isAfter(current, end)) {
      let include = false;
      const dayOfWeek = current.getDay();
      const dayOfMonth = current.getDate();
      switch (newSchedule.frequency) {
        case "DAILY":
          include = true;
          break;
        case "WEEKLY":
          if (newSchedule.weekDays.includes(dayOfWeek)) include = true;
          break;
        case "MONTHLY":
          if (newSchedule.monthDays.includes(dayOfMonth)) include = true;
          break;
        case "CUSTOM":
          if (
            newSchedule.weekDays.includes(dayOfWeek) ||
            newSchedule.monthDays.includes(dayOfMonth)
          )
            include = true;
          break;
      }
      if (include) datesCount++;
      current = addDays(current, 1);
    }
    return newSchedule.postsPerSlot * newSchedule.timeSlots.length * datesCount;
  };

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

  const handleRemoveTimeSlot = (index: number) => {
    if (newSchedule.timeSlots.length > 1) {
      setNewSchedule((prev) => ({
        ...prev,
        timeSlots: prev.timeSlots.filter((_, i) => i !== index),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newSchedule.name ||
      newSchedule.platforms.length === 0 ||
      !newSchedule.contentPrompt ||
      !newSchedule.endDate
    ) {
      toast.error(
        "Please fill in all required fields (name, platforms, content prompt, end date)"
      );
      return;
    }
    if (
      (newSchedule.frequency === "WEEKLY" ||
        newSchedule.frequency === "CUSTOM") &&
      newSchedule.weekDays.length === 0
    ) {
      toast.error(
        "Please select at least one weekday for WEEKLY or CUSTOM frequency"
      );
      return;
    }
    if (
      (newSchedule.frequency === "MONTHLY" ||
        newSchedule.frequency === "CUSTOM") &&
      newSchedule.monthDays.length === 0
    ) {
      toast.error(
        "Please select at least one month day for MONTHLY or CUSTOM frequency"
      );
      return;
    }
    if (new Date(newSchedule.startDate) > new Date(newSchedule.endDate)) {
      toast.error("End date must be after start date");
      return;
    }
    setProgress(10); // Start progress
    createMutation.mutate(
      {
        workspaceId,
        name: newSchedule.name,
        description: newSchedule.description || undefined,
        platforms: newSchedule.platforms,
        startDate: newSchedule.startDate,
        endDate: format(new Date(newSchedule.endDate), "yyyy-MM-dd"),
        frequency: newSchedule.frequency,
        weekDays: newSchedule.weekDays,
        monthDays: newSchedule.monthDays,
        timeSlots: newSchedule.timeSlots,
        postsPerSlot: newSchedule.postsPerSlot,
        contentPrompt: newSchedule.contentPrompt,
        hashtags: newSchedule.hashtags,
      },
      {
        onSuccess: handleSuccess,
        onError: (error) => {
          toast.error(error.message);
          setProgress(0);
        },
      }
    );
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
                        className={`flex items-center space-x-2 p-2 border rounded-lg transition-all ${
                          newSchedule.platforms.includes(account.platform)
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Checkbox
                          checked={newSchedule.platforms.includes(
                            account.platform
                          )}
                          onCheckedChange={() =>
                            handlePlatformToggle(account.platform)
                          }
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
                  End Date *
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newSchedule.endDate}
                  onChange={(e) =>
                    setNewSchedule({ ...newSchedule, endDate: e.target.value })
                  }
                  className="text-sm"
                  required
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
                <Label className="text-sm">Week Days *</Label>
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
                <Label className="text-sm">Month Days *</Label>
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
                <div key={index} className="flex items-center gap-2 mb-1">
                  <Input
                    type="time"
                    value={slot}
                    onChange={(e) =>
                      handleTimeSlotChange(index, e.target.value)
                    }
                    className="mb-0 text-sm flex-1"
                    required
                  />
                  {newSchedule.timeSlots.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveTimeSlot(index)}
                      className="h-9"
                    >
                      <Trash className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
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

            <div className="space-y-1">
              <Label htmlFor="posts-per-slot" className="text-sm">
                Posts per Slot *
              </Label>
              <Input
                id="posts-per-slot"
                type="number"
                min="1"
                value={newSchedule.postsPerSlot}
                onChange={(e) =>
                  setNewSchedule((prev) => ({
                    ...prev,
                    postsPerSlot: parseInt(e.target.value) || 1,
                  }))
                }
                className="text-sm"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="content-prompt" className="text-sm">
                Content Prompt *
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
                rows={4}
                className="text-sm"
                required
              />
            </div>

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

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Schedule Preview</h4>
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <p>
                  <strong>Total Posts:</strong> {calculateTotalPosts()}
                </p>
                <p>
                  <strong>Platforms:</strong>{" "}
                  {newSchedule.platforms.join(", ") || "None selected"}
                </p>
                <p>
                  <strong>Start Date:</strong> {newSchedule.startDate}
                </p>
                <p>
                  <strong>End Date:</strong> {newSchedule.endDate}
                </p>
                <p>
                  <strong>Frequency:</strong>{" "}
                  {frequencyOptions.find(
                    (f) => f.value === newSchedule.frequency
                  )?.label || newSchedule.frequency}
                </p>
                <p>
                  <strong>Week Days:</strong>{" "}
                  {newSchedule.weekDays
                    .map(
                      (d) =>
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]
                    )
                    .join(", ") || "None"}
                </p>
                <p>
                  <strong>Month Days:</strong>{" "}
                  {newSchedule.monthDays.join(", ") || "None"}
                </p>
                <p>
                  <strong>Time Slots:</strong>{" "}
                  {newSchedule.timeSlots.join(", ")}
                </p>
                <p>
                  <strong>Posts per Slot:</strong> {newSchedule.postsPerSlot}
                </p>
                <p>
                  <strong>Content Prompt:</strong>{" "}
                  {newSchedule.contentPrompt || "Not specified"}
                </p>
              </div>
            </div>
          </div>
          {(createMutation.isPending ||
            generateBulkPosts.isPending ||
            progress > 0) && (
            <div className="w-full mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1 text-center">
                {progress}%
              </p>
            </div>
          )}
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
              disabled={
                createMutation.isPending ||
                isLoading ||
                generateBulkPosts.isPending
              }
            >
              {createMutation.isPending || generateBulkPosts.isPending
                ? "Creating..."
                : "Create Schedule and Generate Posts"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
