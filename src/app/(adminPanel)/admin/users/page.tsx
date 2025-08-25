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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MoreHorizontal,
  UserX,
  Trash2,
  RefreshCw,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  workspace: string;
  workspaceId: string;
  status: "active" | "suspended";
  role: string;
  joinedAt: string;
  lastActive: string;
  avatar?: string;
}

interface Workspace {
  id: string;
  name: string;
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newWorkspaceId, setNewWorkspaceId] = useState("");

  const {
    data: users,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = api.admin.getUsers.useQuery();
  const { data: availableWorkspaces, isLoading: workspacesLoading } =
    api.admin.getWorkspaces.useQuery();

  const toggleUserStatus = api.admin.toggleUserStatus.useMutation({
    onSuccess: () => {
      toast.success("User status updated");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const reassignUserMutation = api.admin.reassignUser.useMutation({
    onSuccess: () => {
      toast.success("User reassigned successfully");
      setSelectedUser(null);
      setNewWorkspaceId("");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteUser = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetchUsers();
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredUsers = (users || []).filter((user: User) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    const matchesWorkspace =
      workspaceFilter === "all" || user.workspaceId === workspaceFilter;
    return matchesSearch && matchesStatus && matchesWorkspace;
  });

  const handleToggleUserStatus = (userId: string) => {
    toggleUserStatus.mutate({ userId });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUser.mutate({ userId });
  };

  const handleReassignWorkspace = () => {
    if (!selectedUser || !newWorkspaceId) return;
    reassignUserMutation.mutate({
      userId: selectedUser.id,
      workspaceId: newWorkspaceId,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (usersLoading || workspacesLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Manage all users across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <Mail className="mr-2 h-4 w-4" />
            Send Invite
          </Button>
        </div>
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
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {(availableWorkspaces || []).map((workspace: Workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            All users registered on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {user.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.workspace}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getRoleBadgeVariant(user.role)}
                      className="capitalize"
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active" ? "default" : "secondary"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastActive}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setNewWorkspaceId(user.workspaceId);
                          }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reassign Workspace
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleUserStatus(user.id)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
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

      {/* Reassign Workspace Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign User to Workspace</DialogTitle>
            <DialogDescription>
              Move {selectedUser?.name} to a different workspace. This will
              change their role to member.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Current Workspace</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {selectedUser.workspace}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-workspace">New Workspace</Label>
                <Select
                  value={newWorkspaceId}
                  onValueChange={setNewWorkspaceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableWorkspaces || [])
                      .filter(
                        (ws: Workspace) => ws.id !== selectedUser.workspaceId
                      )
                      .map((workspace: Workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReassignWorkspace}
              disabled={
                !newWorkspaceId ||
                newWorkspaceId === selectedUser?.workspaceId ||
                reassignUserMutation.status === "pending"
              }
            >
              Reassign User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
