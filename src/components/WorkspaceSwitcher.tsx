// New File: src/components/WorkspaceSwitcher.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronDown, Plus, SwitchCamera } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "./ui/badge";

export function WorkspaceSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(
    null
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  // Fetch workspaces from TRPC (fresh data)
  const { data: workspaces, refetch } =
    api.workspaces.getUserWorkspaces.useQuery(undefined, {
      enabled: !!session,
    });

  // Set current workspace from localStorage or default to first
  useEffect(() => {
    const storedId = localStorage.getItem("currentWorkspaceId");
    if (storedId && workspaces?.some((ws) => ws.id === storedId)) {
      setCurrentWorkspaceId(storedId);
    } else if (workspaces && workspaces.length > 0) {
      const defaultId = workspaces[0]!.id;
      setCurrentWorkspaceId(defaultId);
      localStorage.setItem("currentWorkspaceId", defaultId);
    }
  }, [workspaces]);

  const currentWorkspace = workspaces?.find(
    (ws) => ws.id === currentWorkspaceId
  );

  const createMutation = api.workspaces.create.useMutation({
    onSuccess: async (data) => {
      toast.success("Workspace created successfully");
      await refetch();
      setCurrentWorkspaceId(data.workspace.id);
      localStorage.setItem("currentWorkspaceId", data.workspace.id);
      setIsCreateOpen(false);
      setNewWorkspaceName("");
      // Update session
      await update();
      router.push(`/workspace/${data.workspace.id}/dashboard`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSwitch = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem("currentWorkspaceId", workspaceId);
    router.push(`/workspace/${workspaceId}/dashboard`);
  };

  const handleCreate = () => {
    if (!newWorkspaceName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    createMutation.mutate({ name: newWorkspaceName });
  };

  if (!session || !workspaces) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            {currentWorkspace ? currentWorkspace.name : "Select Workspace"}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((ws) => (
            <DropdownMenuItem key={ws.id} onClick={() => handleSwitch(ws.id)}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2"
              >
                {ws.name}
                {ws.id === currentWorkspaceId && (
                  <Badge variant="secondary" className="ml-auto">
                    Current
                  </Badge>
                )}
              </motion.div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Workspace
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                />
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
