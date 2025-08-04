"use client";

import { useState } from "react";
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
import { Sparkles, Instagram, Twitter, Facebook, Linkedin } from "lucide-react";
import { toast } from "sonner";

interface SocialAccount {
  platform: string;
  username: string;
  followers: string;
  connected: boolean;
  color: string;
  icon: any;
}

interface NewSchedule {
  name: string;
  platforms: string[];
  duration: number;
  durationType: "days" | "weeks" | "months";
  frequency: string;
  description: string;
}

interface ScheduleCreationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSchedule: (schedule: any) => void;
}

export function ScheduleCreationDialog({
  isOpen,
  onOpenChange,
  onCreateSchedule,
}: ScheduleCreationDialogProps) {
  const [newSchedule, setNewSchedule] = useState<NewSchedule>({
    name: "",
    platforms: [],
    duration: 1,
    durationType: "weeks",
    frequency: "daily",
    description: "",
  });

  const socialAccounts: SocialAccount[] = [
    {
      platform: "Instagram",
      username: "@yourhandle",
      followers: "12.5K",
      connected: true,
      color: "bg-pink-500",
      icon: Instagram,
    },
    {
      platform: "Twitter",
      username: "@yourhandle",
      followers: "8.2K",
      connected: true,
      color: "bg-blue-500",
      icon: Twitter,
    },
    {
      platform: "Facebook",
      username: "Your Page",
      followers: "15.8K",
      connected: true,
      color: "bg-blue-600",
      icon: Facebook,
    },
    {
      platform: "LinkedIn",
      username: "Your Profile",
      followers: "5.3K",
      connected: true,
      color: "bg-blue-700",
      icon: Linkedin,
    },
  ];

  const frequencyOptions = [
    { value: "daily", label: "Daily" },
    { value: "every-2-days", label: "Every 2 days" },
    { value: "every-3-days", label: "Every 3 days" },
    { value: "weekly", label: "Weekly" },
    { value: "twice-weekly", label: "Twice a week" },
    { value: "twice-daily", label: "Twice daily" },
  ];

  const handlePlatformToggle = (platform: string) => {
    setNewSchedule((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  const calculateTotalPosts = () => {
    const { duration, durationType, frequency } = newSchedule;
    let totalDays = duration;

    if (durationType === "weeks") totalDays = duration * 7;
    if (durationType === "months") totalDays = duration * 30;

    let postsPerDay = 1;
    if (frequency === "every-2-days") postsPerDay = 0.5;
    if (frequency === "every-3-days") postsPerDay = 0.33;
    if (frequency === "weekly") postsPerDay = 1 / 7;
    if (frequency === "twice-weekly") postsPerDay = 2 / 7;
    if (frequency === "twice-daily") postsPerDay = 2;

    return Math.ceil(totalDays * postsPerDay);
  };

  const handleCreateSchedule = () => {
    if (!newSchedule.name || newSchedule.platforms.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const totalPosts = calculateTotalPosts();
    const schedule = {
      id: Date.now().toString(),
      ...newSchedule,
      status: "draft",
      createdAt: new Date(),
      postsGenerated: 0,
      totalPosts,
    };

    onCreateSchedule(schedule);
    onOpenChange(false);
    setNewSchedule({
      name: "",
      platforms: [],
      duration: 1,
      durationType: "weeks",
      frequency: "daily",
      description: "",
    });
    toast.success("Schedule created successfully!");
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
              {socialAccounts
                .filter((account) => account.connected)
                .map((account) => (
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
                      onChange={() => handlePlatformToggle(account.platform)}
                    />
                    <div
                      className={`w-8 h-8 ${account.color} rounded-lg flex items-center justify-center`}
                    >
                      <account.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{account.platform}</p>
                      <p className="text-xs text-slate-500">
                        {account.followers} followers
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Duration and Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={newSchedule.duration}
                onChange={(e) =>
                  setNewSchedule({
                    ...newSchedule,
                    duration: Number.parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration-type">Duration Type *</Label>
              <Select
                value={newSchedule.durationType}
                onValueChange={(value: "days" | "weeks" | "months") =>
                  setNewSchedule({ ...newSchedule, durationType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Posting Frequency *</Label>
              <Select
                value={newSchedule.frequency}
                onValueChange={(value) =>
                  setNewSchedule({ ...newSchedule, frequency: value })
                }
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
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={newSchedule.description}
              onChange={(e) =>
                setNewSchedule({ ...newSchedule, description: e.target.value })
              }
              placeholder="Brief description of this schedule's purpose..."
              rows={3}
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
                <strong>Duration:</strong> {newSchedule.duration}{" "}
                {newSchedule.durationType}
              </p>
              <p>
                <strong>Frequency:</strong>{" "}
                {
                  frequencyOptions.find(
                    (f) => f.value === newSchedule.frequency
                  )?.label
                }
              </p>
              <p>
                <strong>Estimated Posts:</strong> {calculateTotalPosts()} posts
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
          >
            Create Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
