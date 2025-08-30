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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  SettingsIcon,
  Shield,
  Users,
  Bell,
  Database,
  Download,
  Upload,
  Save,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
}

interface SystemSettings {
  platform: {
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
    requireEmailVerification: boolean;
    maxWorkspacesPerUser: number;
    maxUsersPerWorkspace: number;
  };
  ai: {
    dailyGenerationLimit: number;
    monthlyGenerationLimit: number;
    enableImageGeneration: boolean;
    enableTextGeneration: boolean;
    defaultModel: string;
  };
  security: {
    sessionTimeout: number;
    requireTwoFactor: boolean;
    passwordMinLength: number;
    allowPasswordReset: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    systemAlerts: boolean;
    usageWarnings: boolean;
    maintenanceNotices: boolean;
  };
}

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
    defaultModel: "text-davinci-003", // Updated to a realistic model
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
};

export default function Settings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  });

  const {
    data: roles,
    isLoading: rolesLoading,
    refetch: refetchRoles,
  } = api.admin.getRoles.useQuery();
  const { data: permissions, isLoading: permissionsLoading } =
    api.admin.getPermissions.useQuery();

  const createRole = api.admin.createRole.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully");
      setNewRole({ name: "", description: "", permissionIds: [] });
      setIsCreateRoleOpen(false);
      refetchRoles();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRole = api.admin.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      setEditingRole(null);
      refetchRoles();
    },
    onError: (error) => toast.error(error.message),
  });

  const saveSettings = api.admin.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const exportData = api.admin.exportData.useMutation({
    onSuccess: () => {
      toast.success("Data export initiated");
    },
    onError: (error) => toast.error(error.message),
  });

  const importData = api.admin.importData.useMutation({
    onSuccess: () => {
      toast.success("Data import initiated");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSaveSettings = () => {
    saveSettings.mutate(settings);
  };

  const handleCreateRole = () => {
    createRole.mutate({
      name: newRole.name,
      description: newRole.description,
      permissionIds: newRole.permissionIds,
    });
  };

  const handleUpdateRole = () => {
    if (!editingRole) return;
    updateRole.mutate({
      id: editingRole.id,
      name: editingRole.name,
      description: editingRole.description,
      permissionIds: editingRole.permissions.map((p) => p.id),
    });
  };

  const handleTogglePermission = (permissionId: string, isNewRole: boolean) => {
    if (isNewRole) {
      setNewRole({
        ...newRole,
        permissionIds: newRole.permissionIds.includes(permissionId)
          ? newRole.permissionIds.filter((id) => id !== permissionId)
          : [...newRole.permissionIds, permissionId],
      });
    } else if (editingRole) {
      setEditingRole({
        ...editingRole,
        permissions: editingRole.permissions.some((p) => p.id === permissionId)
          ? editingRole.permissions.filter((p) => p.id !== permissionId)
          : [
              ...editingRole.permissions,
              permissions?.find((p) => p.id === permissionId) || {
                id: permissionId,
                resource: "",
                action: "",
                description: "",
              },
            ],
      });
    }
  };

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-slate-600 dark:text-slate-400">
          Loading Settings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage platform settings and permissions
          </p>
        </div>
        <Button
          onClick={handleSaveSettings}
          disabled={saveSettings.status === "pending"}
        >
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

        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Role Management</h3>
              <p className="text-sm text-muted-foreground">
                Configure user roles and permissions
              </p>
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
                  <DialogDescription>
                    Define a new user role with specific permissions
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="role-name">Role Name</Label>
                    <Input
                      id="role-name"
                      value={newRole.name}
                      onChange={(e) =>
                        setNewRole({ ...newRole, name: e.target.value })
                      }
                      placeholder="e.g., Editor"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      value={newRole.description}
                      onChange={(e) =>
                        setNewRole({ ...newRole, description: e.target.value })
                      }
                      placeholder="Describe this role's purpose"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Permissions</Label>
                    {permissions?.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between"
                      >
                        <Label
                          htmlFor={perm.id}
                          className="text-sm font-normal"
                        >
                          {perm.resource}.{perm.action}{" "}
                          {perm.description ? `(${perm.description})` : ""}
                        </Label>
                        <Switch
                          id={perm.id}
                          checked={newRole.permissionIds.includes(perm.id)}
                          onCheckedChange={() =>
                            handleTogglePermission(perm.id, true)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateRoleOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateRole}
                    disabled={!newRole.name || createRole.status === "pending"}
                  >
                    Create Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles?.map((role) => (
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
                    {role.permissions.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {perm.resource}.{perm.action}
                        </span>
                        <Badge variant="default">Yes</Badge>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 bg-transparent"
                    onClick={() => setEditingRole(role)}
                    disabled={role.isSystem}
                  >
                    Edit Role
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="platform" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Platform Configuration
              </CardTitle>
              <CardDescription>
                General platform settings and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable platform access
                  </p>
                </div>
                <Switch
                  checked={settings.platform.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platform: {
                        ...settings.platform,
                        maintenanceMode: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable new user sign-ups
                  </p>
                </div>
                <Switch
                  checked={settings.platform.allowNewRegistrations}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platform: {
                        ...settings.platform,
                        allowNewRegistrations: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify email before access
                  </p>
                </div>
                <Switch
                  checked={settings.platform.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      platform: {
                        ...settings.platform,
                        requireEmailVerification: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-workspaces">
                    Max Workspaces per User
                  </Label>
                  <Input
                    id="max-workspaces"
                    type="number"
                    value={settings.platform.maxWorkspacesPerUser}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platform: {
                          ...settings.platform,
                          maxWorkspacesPerUser: Number.parseInt(e.target.value),
                        },
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
                        platform: {
                          ...settings.platform,
                          maxUsersPerWorkspace: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure AI generation limits and models
              </CardDescription>
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
                        ai: {
                          ...settings.ai,
                          dailyGenerationLimit: Number.parseInt(e.target.value),
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-limit">
                    Monthly Generation Limit
                  </Label>
                  <Input
                    id="monthly-limit"
                    type="number"
                    value={settings.ai.monthlyGenerationLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ai: {
                          ...settings.ai,
                          monthlyGenerationLimit: Number.parseInt(
                            e.target.value
                          ),
                        },
                      })
                    }
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Image Generation</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI image creation
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Allow AI text creation
                  </p>
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
                    <SelectItem value="text-davinci-003">
                      Text-Davinci-003
                    </SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="dall-e-2">DALL-E 2</SelectItem>
                    <SelectItem value="stable-diffusion">
                      Stable Diffusion
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Configuration
              </CardTitle>
              <CardDescription>
                Platform security and authentication settings
              </CardDescription>
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
                      security: {
                        ...settings.security,
                        sessionTimeout: Number.parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Mandatory 2FA for all users
                  </p>
                </div>
                <Switch
                  checked={settings.security.requireTwoFactor}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        requireTwoFactor: checked,
                      },
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
                      security: {
                        ...settings.security,
                        passwordMinLength: Number.parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Password Reset</Label>
                  <p className="text-sm text-muted-foreground">
                    Users can reset passwords via email
                  </p>
                </div>
                <Switch
                  checked={settings.security.allowPasswordReset}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        allowPasswordReset: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure system notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications via email
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        emailNotifications: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>System Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Critical system notifications
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.systemAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        systemAlerts: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Usage Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when approaching limits
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.usageWarnings}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        usageWarnings: checked,
                      },
                    })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Notices</Label>
                  <p className="text-sm text-muted-foreground">
                    Scheduled maintenance notifications
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.maintenanceNotices}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        maintenanceNotices: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                    <p className="text-sm text-muted-foreground">
                      Download platform data for backup or analysis
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => exportData.mutate()}
                      className="w-full"
                      disabled={exportData.status === "pending"}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export All Data
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Includes users, workspaces, posts, and usage logs
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Import Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Restore data from backup file
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => importData.mutate()}
                      variant="outline"
                      className="w-full bg-transparent"
                      disabled={importData.status === "pending"}
                    >
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

      <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role: {editingRole?.name}</DialogTitle>
            <DialogDescription>
              Modify role permissions and settings
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-role-name">Role Name</Label>
                <Input
                  id="edit-role-name"
                  value={editingRole.name}
                  onChange={(e) =>
                    setEditingRole({ ...editingRole, name: e.target.value })
                  }
                  disabled={editingRole.isSystem}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role-description">Description</Label>
                <Textarea
                  id="edit-role-description"
                  value={editingRole.description}
                  onChange={(e) =>
                    setEditingRole({
                      ...editingRole,
                      description: e.target.value,
                    })
                  }
                  disabled={editingRole.isSystem}
                />
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>
                {permissions?.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between"
                  >
                    <Label
                      htmlFor={`edit-${perm.id}`}
                      className="text-sm font-normal"
                    >
                      {perm.resource}.{perm.action}{" "}
                      {perm.description ? `(${perm.description})` : ""}
                    </Label>
                    <Switch
                      id={`edit-${perm.id}`}
                      checked={editingRole.permissions.some(
                        (p) => p.id === perm.id
                      )}
                      onCheckedChange={() =>
                        handleTogglePermission(perm.id, false)
                      }
                      disabled={editingRole.isSystem}
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
            <Button
              onClick={handleUpdateRole}
              disabled={
                editingRole?.isSystem || updateRole.status === "pending"
              }
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
