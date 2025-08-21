"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { motion } from "framer-motion";
import { Plus, Edit, Trash, Settings } from "lucide-react";

export default function WorkspacesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editWorkspaceId, setEditWorkspaceId] = useState<string | null>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const { data: workspaces, refetch } =
    api.workspaces.getUserWorkspaces.useQuery(undefined, {
      enabled: !!session,
    });

  const createMutation = api.workspaces.create.useMutation({
    onSuccess: () => {
      toast.success("Workspace created");
      refetch();
      setIsCreateOpen(false);
      setNewWorkspaceName("");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = api.workspaces.update.useMutation({
    onSuccess: () => {
      toast.success("Workspace updated");
      refetch();
      setIsEditOpen(false);
      setEditWorkspaceId(null);
      setEditWorkspaceName("");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = api.workspaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Workspace deleted");
      refetch();
      const storedId = localStorage.getItem("currentWorkspaceId");
      if (storedId === editWorkspaceId) {
        localStorage.removeItem("currentWorkspaceId");
        router.push("/dashboard");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  const handleCreate = () => {
    if (!newWorkspaceName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    createMutation.mutate({ name: newWorkspaceName });
  };

  const handleUpdate = () => {
    if (!editWorkspaceName.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    if (editWorkspaceId) {
      updateMutation.mutate({
        workspaceId: editWorkspaceId,
        name: editWorkspaceName,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header + Create Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              My Workspaces
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your business accounts and their social media integrations
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="mr-2 h-4 w-4" /> Create New Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
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
                  className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Workspaces Grid */}
        <div className="pt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces?.map((ws) => (
            <motion.div
              key={ws.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.03 }}
            >
              <Card className="h-full border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{ws.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    <p>Members: {ws.stats.members}</p>
                    <p>Posts: {ws.stats.posts}</p>
                    <p>Social Accounts: {ws.stats.socialAccounts}</p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() =>
                        router.push(`/workspace/${ws.id}/dashboard`)
                      }
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Dashboard
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        router.push(`/workspace/${ws.id}/settings`)
                      }
                    >
                      <Settings className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditWorkspaceId(ws.id);
                        setEditWorkspaceName(ws.name);
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        deleteMutation.mutate({ workspaceId: ws.id })
                      }
                    >
                      <Trash className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle>Edit Workspace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Label htmlFor="edit-name">Workspace Name</Label>
              <Input
                id="edit-name"
                value={editWorkspaceName}
                onChange={(e) => setEditWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
