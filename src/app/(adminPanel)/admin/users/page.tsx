"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, MoreHorizontal, UserX, Trash2, RefreshCw, Mail } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  workspace: string
  workspaceId: string
  status: "active" | "suspended"
  role: "owner" | "admin" | "member"
  joinedAt: string
  lastActive: string
  avatar?: string
}

const mockUsers: User[] = [
  {
    id: "usr_001",
    name: "Sarah Johnson",
    email: "sarah@marketingteam.com",
    workspace: "Marketing Team",
    workspaceId: "ws_001",
    status: "active",
    role: "owner",
    joinedAt: "2024-01-15",
    lastActive: "2 hours ago",
  },
  {
    id: "usr_002",
    name: "Mike Chen",
    email: "mike@ecommerce.com",
    workspace: "E-commerce Store",
    workspaceId: "ws_002",
    status: "active",
    role: "admin",
    joinedAt: "2024-01-20",
    lastActive: "1 day ago",
  },
  {
    id: "usr_003",
    name: "Emily Davis",
    email: "emily@techstartup.com",
    workspace: "Tech Startup",
    workspaceId: "ws_003",
    status: "suspended",
    role: "member",
    joinedAt: "2024-02-01",
    lastActive: "1 week ago",
  },
  {
    id: "usr_004",
    name: "Alex Rodriguez",
    email: "alex@creative.com",
    workspace: "Creative Agency",
    workspaceId: "ws_004",
    status: "active",
    role: "admin",
    joinedAt: "2024-02-10",
    lastActive: "30 minutes ago",
  },
  {
    id: "usr_005",
    name: "Lisa Wang",
    email: "lisa@foodblog.com",
    workspace: "Food Blog",
    workspaceId: "ws_005",
    status: "active",
    role: "owner",
    joinedAt: "2024-02-15",
    lastActive: "5 hours ago",
  },
  {
    id: "usr_006",
    name: "David Brown",
    email: "david@fashion.com",
    workspace: "Fashion Brand",
    workspaceId: "ws_006",
    status: "active",
    role: "member",
    joinedAt: "2024-02-20",
    lastActive: "3 days ago",
  },
]

const availableWorkspaces = [
  { id: "ws_001", name: "Marketing Team" },
  { id: "ws_002", name: "E-commerce Store" },
  { id: "ws_003", name: "Tech Startup" },
  { id: "ws_004", name: "Creative Agency" },
  { id: "ws_005", name: "Food Blog" },
  { id: "ws_006", name: "Fashion Brand" },
]

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all")
  const [reassignUser, setReassignUser] = useState<User | null>(null)
  const [newWorkspaceId, setNewWorkspaceId] = useState("")

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesWorkspace = workspaceFilter === "all" || user.workspaceId === workspaceFilter
    return matchesSearch && matchesStatus && matchesWorkspace
  })

  const handleToggleUserStatus = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, status: user.status === "active" ? "suspended" : "active" } : user,
      ),
    )
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
  }

  const handleReassignWorkspace = () => {
    if (!reassignUser || !newWorkspaceId) return

    const newWorkspace = availableWorkspaces.find((ws) => ws.id === newWorkspaceId)
    if (!newWorkspace) return

    setUsers(
      users.map((user) =>
        user.id === reassignUser.id
          ? { ...user, workspaceId: newWorkspaceId, workspace: newWorkspace.name, role: "member" }
          : user,
      ),
    )
    setReassignUser(null)
    setNewWorkspaceId("")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default"
      case "admin":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage all users across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
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
                {availableWorkspaces.map((workspace) => (
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
          <CardDescription>All users registered on the platform</CardDescription>
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
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.workspace}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.lastActive}</TableCell>
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
                            setReassignUser(user)
                            setNewWorkspaceId(user.workspaceId)
                          }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reassign Workspace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleUserStatus(user.id)}>
                          <UserX className="mr-2 h-4 w-4" />
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-destructive">
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
      <Dialog open={!!reassignUser} onOpenChange={() => setReassignUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign User to Workspace</DialogTitle>
            <DialogDescription>
              Move {reassignUser?.name} to a different workspace. This will change their role to member.
            </DialogDescription>
          </DialogHeader>
          {reassignUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Current Workspace</Label>
                <div className="p-2 bg-muted rounded-md text-sm">{reassignUser.workspace}</div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-workspace">New Workspace</Label>
                <Select value={newWorkspaceId} onValueChange={setNewWorkspaceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkspaces
                      .filter((ws) => ws.id !== reassignUser.workspaceId)
                      .map((workspace) => (
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
            <Button variant="outline" onClick={() => setReassignUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReassignWorkspace}
              disabled={!newWorkspaceId || newWorkspaceId === reassignUser?.workspaceId}
            >
              Reassign User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
