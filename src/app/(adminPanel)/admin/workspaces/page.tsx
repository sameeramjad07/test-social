"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Pause,
  Play,
} from "lucide-react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  status: "active" | "suspended";
  userCount: number;
  createdAt: string;
}

export default function WorkspacesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(
    null
  );
  const [newWorkspace, setNewWorkspace] = useState({ name: "" });

  const {
    data: workspaces,
    isLoading,
    refetch,
  } = api.admin.getWorkspaces.useQuery();

  const createWorkspace = api.admin.createWorkspace.useMutation({
    onSuccess: () => {
      toast.success("Workspace created successfully");
      setNewWorkspace({ name: "" });
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateWorkspace = api.admin.updateWorkspace.useMutation({
    onSuccess: () => {
      toast.success("Workspace updated successfully");
      setEditingWorkspace(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleWorkspaceStatus = api.admin.toggleWorkspaceStatus.useMutation({
    onSuccess: () => {
      toast.success("Workspace status updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteWorkspace = api.admin.deleteWorkspace.useMutation({
    onSuccess: () => {
      toast.success("Workspace deleted successfully");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredWorkspaces = (workspaces || []).filter(
    (workspace: Workspace) => {
      const matchesSearch = workspace.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || workspace.status === statusFilter;
      return matchesSearch && matchesStatus;
    }
  );

  const handleCreateWorkspace = () => {
    createWorkspace.mutate({
      name: newWorkspace.name,
    });
  };

  const handleUpdateWorkspace = () => {
    if (!editingWorkspace) return;
    updateWorkspace.mutate({
      id: editingWorkspace.id,
      name: editingWorkspace.name,
    });
  };

  const handleToggleStatus = (workspaceId: string) => {
    toggleWorkspaceStatus.mutate({ id: workspaceId });
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    deleteWorkspace.mutate({ id: workspaceId });
  };

  if (isLoading) {
    return <div>Loading workspaces...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Workspaces Management
          </h2>
          <p className="text-muted-foreground">
            Manage all workspaces across the platform
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Add a new workspace to the platform
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={newWorkspace.name}
                  onChange={(e) =>
                    setNewWorkspace({ ...newWorkspace, name: e.target.value })
                  }
                  placeholder="Enter workspace name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkspace}
                disabled={
                  !newWorkspace.name || createWorkspace.status === "pending"
                }
              >
                Create Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search workspaces..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workspaces Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workspaces ({filteredWorkspaces.length})</CardTitle>
          <CardDescription>
            All workspaces registered on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkspaces.map((workspace: Workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell className="font-mono text-sm">
                    {workspace.id}
                  </TableCell>
                  <TableCell className="font-medium">
                    {workspace.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        workspace.status === "active" ? "default" : "secondary"
                      }
                    >
                      {workspace.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{workspace.userCount}</TableCell>
                  <TableCell>{workspace.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingWorkspace(workspace)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(workspace.id)}
                        >
                          {workspace.status === "active" ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteWorkspace(workspace.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Workspace Dialog */}
      <Dialog
        open={!!editingWorkspace}
        onOpenChange={() => setEditingWorkspace(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>Update workspace information</DialogDescription>
          </DialogHeader>
          {editingWorkspace && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Workspace Name</Label>
                <Input
                  id="edit-name"
                  value={editingWorkspace.name}
                  onChange={(e) =>
                    setEditingWorkspace({
                      ...editingWorkspace,
                      name: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWorkspace(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateWorkspace}
              disabled={updateWorkspace.status === "pending"}
            >
              Update Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
