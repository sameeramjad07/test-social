"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import { Platform, ScheduleFrequency } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const scheduleFormSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  platforms: z.array(z.nativeEnum(Platform)).min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  frequency: z.nativeEnum(ScheduleFrequency),
  weekDays: z.array(z.number().min(0).max(6)).optional(),
  monthDays: z.array(z.number().min(1).max(31)).optional(),
  timeSlots: z.array(z.string()).min(1),
  postsPerSlot: z.number().min(1),
});

type ScheduleForm = z.infer<typeof scheduleFormSchema>;

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: any; // Replace with proper type from your Prisma schema
  workspaceId: string;
  scheduleId: string;
}

export default function EditScheduleDialog({
  open,
  onOpenChange,
  schedule,
  workspaceId,
  scheduleId,
}: EditScheduleDialogProps) {
  const { data: socialAccounts } = api.socialAccounts.list.useQuery({
    workspaceId,
  });

  const updateSchedule = api.schedules.update.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const { register, handleSubmit, setValue, getValues, reset, control } =
    useForm<ScheduleForm>({
      resolver: zodResolver(scheduleFormSchema),
      defaultValues: {
        name: "",
        platforms: [],
        startDate: "",
        frequency: ScheduleFrequency.DAILY,
        timeSlots: ["12:00"],
        postsPerSlot: 1,
      },
    });

  useEffect(() => {
    if (schedule) {
      reset({
        name: schedule.name,
        description: schedule.description || "",
        platforms: schedule.platforms,
        startDate: format(schedule.startDate, "yyyy-MM-dd"),
        endDate: schedule.endDate ? format(schedule.endDate, "yyyy-MM-dd") : "",
        frequency: schedule.frequency,
        weekDays: schedule.weekDays || [],
        monthDays: schedule.monthDays || [],
        timeSlots: schedule.timeSlots,
        postsPerSlot: schedule.postsPerSlot,
      });
    }
  }, [schedule, reset]);

  const onSubmit = (data: ScheduleForm) => {
    updateSchedule.mutate({
      scheduleId,
      workspaceId,
      ...data,
      endDate: data.endDate ? data.endDate : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
        <DialogHeader>
          <DialogTitle>Edit Schedule Details</DialogTitle>
          <DialogDescription>
            Update the configuration for {schedule.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label>Platforms</Label>
            <div className="grid grid-cols-2 gap-2">
              {socialAccounts?.map((account) => (
                <div key={account.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={getValues("platforms")?.includes(account.platform)}
                    onCheckedChange={(checked) => {
                      const platforms = getValues("platforms") || [];
                      setValue(
                        "platforms",
                        checked
                          ? [...platforms, account.platform]
                          : platforms.filter((p) => p !== account.platform)
                      );
                    }}
                  />
                  <Label>{account.platform}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              onValueChange={(value) =>
                setValue("frequency", value as ScheduleFrequency)
              }
              value={getValues("frequency")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ScheduleFrequency).map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {freq}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(getValues("frequency") === "WEEKLY" ||
            getValues("frequency") === "CUSTOM") && (
            <div className="space-y-2">
              <Label>Week Days</Label>
              <div className="flex gap-2 flex-wrap">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      <Checkbox
                        checked={getValues("weekDays")?.includes(index)}
                        onCheckedChange={(checked) => {
                          const weekDays = getValues("weekDays") || [];
                          setValue(
                            "weekDays",
                            checked
                              ? [...weekDays, index]
                              : weekDays.filter((d) => d !== index)
                          );
                        }}
                      />
                      <span className="text-sm">{day}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          {(getValues("frequency") === "MONTHLY" ||
            getValues("frequency") === "CUSTOM") && (
            <div className="space-y-2">
              <Label>Month Days</Label>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <div key={day} className="flex items-center space-x-1">
                    <Checkbox
                      checked={getValues("monthDays")?.includes(day)}
                      onCheckedChange={(checked) => {
                        const monthDays = getValues("monthDays") || [];
                        setValue(
                          "monthDays",
                          checked
                            ? [...monthDays, day]
                            : monthDays.filter((d) => d !== day)
                        );
                      }}
                    />
                    <span className="text-sm">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Time Slots</Label>
            <div className="space-y-2">
              {getValues("timeSlots").map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="timeSlots"
                    render={({ field }) => (
                      <Input
                        type="time"
                        value={slot}
                        onChange={(e) => {
                          const newTimeSlots = [...field.value];
                          newTimeSlots[index] = e.target.value;
                          field.onChange(newTimeSlots);
                        }}
                      />
                    )}
                  />
                  {getValues("timeSlots").length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newTimeSlots = getValues("timeSlots").filter(
                          (_, i) => i !== index
                        );
                        setValue("timeSlots", newTimeSlots);
                      }}
                      className="h-9"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setValue("timeSlots", [...getValues("timeSlots"), "12:00"])
                }
              >
                <Plus className="w-4 h-4 mr-2" /> Add Time Slot
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="postsPerSlot">Posts per Slot</Label>
            <Input
              id="postsPerSlot"
              type="number"
              {...register("postsPerSlot", { valueAsNumber: true })}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateSchedule.isPending}>
              {updateSchedule.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
