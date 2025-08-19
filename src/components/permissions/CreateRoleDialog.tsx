"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CreateRoleDialogProps {
  workspaceId: string;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    description: string | null;
  }>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  newRole: { name: string; description: string; permissions: string[] };
  setNewRole: (role: {
    name: string;
    description: string;
    permissions: string[];
  }) => void;
}

export function CreateRoleDialog({
  workspaceId,
  permissions,
  isOpen,
  setIsOpen,
  newRole,
  setNewRole,
}: CreateRoleDialogProps) {
  const { mutate: createRole, isPending } =
    api.workspaces.createRole.useMutation({
      onSuccess: () => {
        toast.success("Role created");
        setNewRole({ name: "", description: "", permissions: [] });
        setIsOpen(false);
      },
      onError: (error) => toast.error(error.message),
    });

  const handlePermissionToggle = (permissionId: string) => {
    setNewRole({
      ...newRole,
      permissions: newRole.permissions.includes(permissionId)
        ? newRole.permissions.filter((id) => id !== permissionId)
        : [...newRole.permissions, permissionId],
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Role</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Label htmlFor="role-name">Role Name</Label>
        <Input
          id="role-name"
          value={newRole.name}
          onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
          placeholder="Enter role name"
        />
        <Label htmlFor="role-description">Description</Label>
        <Input
          id="role-description"
          value={newRole.description}
          onChange={(e) =>
            setNewRole({ ...newRole, description: e.target.value })
          }
          placeholder="Enter role description (optional)"
        />
        <Label>Permissions</Label>
        <div className="grid grid-cols-2 gap-2">
          {permissions.map((perm) => (
            <div key={perm.id} className="flex items-center space-x-2">
              <Checkbox
                checked={newRole.permissions.includes(perm.id)}
                onCheckedChange={() => handlePermissionToggle(perm.id)}
              />
              <span>{`${perm.resource}:${perm.action}`}</span>
            </div>
          ))}
        </div>
        <Button
          onClick={() =>
            createRole({
              workspaceId,
              name: newRole.name,
              description: newRole.description || undefined,
              permissionIds: newRole.permissions,
            })
          }
          disabled={isPending || !newRole.name}
        >
          {isPending ? "Creating..." : "Create Role"}
        </Button>
      </div>
    </DialogContent>
  );
}
