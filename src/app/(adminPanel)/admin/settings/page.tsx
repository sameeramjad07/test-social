"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SettingsIcon, Shield, Users, Bell, Database, Download, Upload, Save, AlertTriangle } from "lucide-react"

interface RolePermission {
  id: string
  name: string
  description: string
  permissions: {
    canCreatePosts: boolean
    canEditPosts: boolean
    canDeletePosts: boolean
    canManageUsers: boolean
    canViewAnalytics: boolean
    canManageWorkspace: boolean
  }
}

interface SystemSettings {
  platform: {
    maintenanceMode: boolean
    allowNewRegistrations: boolean
    requireEmailVerification: boolean
    maxWorkspacesPerUser: number
    maxUsersPerWorkspace: number
  }
  ai: {
    dailyGenerationLimit: number
    monthlyGenerationLimit: number
    enableImageGeneration: boolean
    enableTextGeneration: boolean
    defaultModel: string
  }
  security: {
    sessionTimeout: number
    requireTwoFactor: boolean
    passwordMinLength: number
    allowPasswordReset: boolean
  }
  notifications: {
    emailNotifications: boolean
    systemAlerts: boolean
    usageWarnings: boolean
    maintenanceNotices: boolean
  }
}

const defaultRoles: RolePermission[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full access to workspace and billing",
    permissions: {
      canCreatePosts: true,
      canEditPosts: true,
      canDeletePosts: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canManageWorkspace: true,
    },
  },
  {
    id: "admin",
    name: "Admin",
    description: "Manage users and content, no billing access",
    permissions: {
      canCreatePosts: true,
      canEditPosts: true,
      canDeletePosts: true,
      canManageUsers: true,
      canViewAnalytics: true,
      canManageWorkspace: false,
    },
  },
  {
    id: "member",
    name: "Member",
    description: "Create and edit own content only",
    permissions: {
      canCreatePosts: true,
      canEditPosts: true,
      canDeletePosts: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canManageWorkspace: false,
    },
  },
]

const defaultSettings: SystemSettings = {
  platform: {
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    maxWorkspacesPerUser: 5,
    maxUsersPerWorkspace: 50,
  },
  ai: {
    dailyGenerationLimit: 100,
    monthlyGenerationLimit: 2000,
    enableImageGeneration: true,
    enableTextGeneration: true,
    defaultModel: "gpt-4",
  },
  security: {
    sessionTimeout: 24,
    requireTwoFactor: false,
    passwordMinLength: 8,
    allowPasswordReset: true,
  },
  notifications: {
    emailNotifications: true,
    systemAlerts: true,
    usageWarnings: true,
    maintenanceNotices: true,
  },
}

export default function Settings() {
  const [roles, setRoles] = useState<RolePermission[]>(defaultRoles)
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [editingRole, setEditingRole] = useState<RolePermission | null>(null)
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: {
      canCreatePosts: false,
      canEditPosts: false,
      canDeletePosts: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canManageWorkspace: false,
    },
  })

  const handleSaveSettings = () => {
    // In a real app, this would save to backend
    console.log("Saving settings...", settings)
  }

  const handleCreateRole = () => {
    const role: RolePermission = {
      id: newRole.name.toLowerCase().replace(/\s+/g, "-"),
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
    }
    setRoles([...roles, role])
    setNewRole({
      name: "",
      description: "",
      permissions: {
        canCreatePosts: false,
        canEditPosts: false,
        canDeletePosts: false,
        canManageUsers: false,
        canViewAnalytics: false,
        canManageWorkspace: false,
      },
    })
    setIsCreateRoleOpen(false)
  }

  const handleUpdateRole = () => {
    if (!editingRole) return
    setRoles(roles.map((role) => (role.id === editingRole.id ? editingRole : role)))
    setEditingRole(null)
  }

  const exportData = () => {
    // In a real app, this would generate and download data export
    console.log("Exporting platform data...")
  }

  const importData = () => {
    // In a real app, this would handle data import
    console.log("Importing platform data...")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage platform settings and permissions</p>
        </div>
        <Button onClick={handleSaveSettings}>
          <Save className="mr-2 h-4 w-4" />
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* Roles & Permissions */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Role Management</h3>
              <p className="text-sm text-muted-foreground">Configure user roles and permissions</p>
            </div>
            <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Users className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                  <DialogDescription>Define a new user role with specific permissions</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                      placeholder="e.g., Editor"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      placeholder="Describe this role's purpose"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    {Object.entries(newRole.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-sm font-normal">
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </Label>
                        <Switch
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) =>
                            setNewRole({
                              ...newRole,
                              permissions: { ...newRole.permissions, [key]: checked },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRole} disabled={!newRole.name}>
                    Create Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <Badge variant="outline">{role.id}</Badge>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(role.permissions).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                        </span>
                        <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 bg-transparent"
                    onClick={() => setEditingRole(role)}
                    disabled={role.id === "owner"}
                  >
                    Edit Role
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Platform Settings */}
        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Platform Configuration
              </CardTitle>
              <CardDescription>General platform settings and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">Temporarily disable platform access</p>
                </div>
                <Switch
                  checked={settings.platform.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platform: { ...settings.platform, maintenanceMode: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">Enable new user sign-ups</p>
                </div>
                <Switch
                  checked={settings.platform.allowNewRegistrations}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platform: { ...settings.platform, allowNewRegistrations: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">Users must verify email before access</p>
                </div>
                <Switch
                  checked={settings.platform.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platform: { ...settings.platform, requireEmailVerification: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-workspaces">Max Workspaces per User</Label>
                  <Input
                    id="max-workspaces"
                    type="number"
                    value={settings.platform.maxWorkspacesPerUser}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platform: { ...settings.platform, maxWorkspacesPerUser: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-users">Max Users per Workspace</Label>
                  <Input
                    id="max-users"
                    type="number"
                    value={settings.platform.maxUsersPerWorkspace}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platform: { ...settings.platform, maxUsersPerWorkspace: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Configure AI generation limits and models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="daily-limit">Daily Generation Limit</Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    value={settings.ai.dailyGenerationLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ai: { ...settings.ai, dailyGenerationLimit: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-limit">Monthly Generation Limit</Label>
                  <Input
                    id="monthly-limit"
                    type="number"
                    value={settings.ai.monthlyGenerationLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ai: { ...settings.ai, monthlyGenerationLimit: Number.parseInt(e.target.value) },
                      })
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Image Generation</Label>
                  <p className="text-sm text-muted-foreground">Allow AI image creation</p>
                </div>
                <Switch
                  checked={settings.ai.enableImageGeneration}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, enableImageGeneration: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Text Generation</Label>
                  <p className="text-sm text-muted-foreground">Allow AI text creation</p>
                </div>
                <Switch
                  checked={settings.ai.enableTextGeneration}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, enableTextGeneration: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="default-model">Default AI Model</Label>
                <Select
                  value={settings.ai.defaultModel}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, defaultModel: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Configuration
              </CardTitle>
              <CardDescription>Platform security and authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, sessionTimeout: Number.parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Mandatory 2FA for all users</p>
                </div>
                <Switch
                  checked={settings.security.requireTwoFactor}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, requireTwoFactor: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="password-length">Minimum Password Length</Label>
                <Input
                  id="password-length"
                  type="number"
                  min="6"
                  max="32"
                  value={settings.security.passwordMinLength}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, passwordMinLength: Number.parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Password Reset</Label>
                  <p className="text-sm text-muted-foreground">Users can reset passwords via email</p>
                </div>
                <Switch
                  checked={settings.security.allowPasswordReset}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: { ...settings.security, allowPasswordReset: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure system notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send notifications via email</p>
                </div>
                <Switch
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailNotifications: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Alerts</Label>
                  <p className="text-sm text-muted-foreground">Critical system notifications</p>
                </div>
                <Switch
                  checked={settings.notifications.systemAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, systemAlerts: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Usage Warnings</Label>
                  <p className="text-sm text-muted-foreground">Notify when approaching limits</p>
                </div>
                <Switch
                  checked={settings.notifications.usageWarnings}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, usageWarnings: checked },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Notices</Label>
                  <p className="text-sm text-muted-foreground">Scheduled maintenance notifications</p>
                </div>
                <Switch
                  checked={settings.notifications.maintenanceNotices}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, maintenanceNotices: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>Export and import platform data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Export Data</h4>
                    <p className="text-sm text-muted-foreground">Download platform data for backup or analysis</p>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={exportData} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Export All Data
                    </Button>
                    <p className="text-xs text-muted-foreground">Includes users, workspaces, posts, and usage logs</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Import Data</h4>
                    <p className="text-sm text-muted-foreground">Restore data from backup file</p>
                  </div>
                  <div className="space-y-2">
                    <Button onClick={importData} variant="outline" className="w-full bg-transparent">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Data
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3" />
                      This will overwrite existing data
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role: {editingRole?.name}</DialogTitle>
            <DialogDescription>Modify role permissions and settings</DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-role-name">Role Name</Label>
                <Input
                  id="edit-role-name"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role-description">Description</Label>
                <Textarea
                  id="edit-role-description"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>
                {Object.entries(editingRole.permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={`edit-${key}`} className="text-sm font-normal">
                      {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                    </Label>
                    <Switch
                      id={`edit-${key}`}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setEditingRole({
                          ...editingRole,
                          permissions: { ...editingRole.permissions, [key]: checked },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
