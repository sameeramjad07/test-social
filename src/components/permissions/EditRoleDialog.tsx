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

interface EditRoleDialogProps {
  workspaceId: string;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    description: string | null;
  }>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editRole: {
    id: string;
    name: string;
    description: string;
    permissions: string[];
  } | null;
  setEditRole: (
    role: {
      id: string;
      name: string;
      description: string;
      permissions: string[];
    } | null
  ) => void;
}

export function EditRoleDialog({
  workspaceId,
  permissions,
  isOpen,
  setIsOpen,
  editRole,
  setEditRole,
}: EditRoleDialogProps) {
  const { mutate: updateRole, isPending } =
    api.workspaces.updateRole.useMutation({
      onSuccess: () => {
        toast.success("Role updated");
        setEditRole(null);
        setIsOpen(false);
      },
      onError: (error) => toast.error(error.message),
    });

  const handlePermissionToggle = (permissionId: string) => {
    if (editRole) {
      setEditRole({
        ...editRole,
        permissions: editRole.permissions.includes(permissionId)
          ? editRole.permissions.filter((id) => id !== permissionId)
          : [...editRole.permissions, permissionId],
      });
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Role</DialogTitle>
      </DialogHeader>
      {editRole && (
        <div className="space-y-4 py-4">
          <Label htmlFor="edit-role-name">Role Name</Label>
          <Input
            id="edit-role-name"
            value={editRole.name}
            onChange={(e) => setEditRole({ ...editRole, name: e.target.value })}
            placeholder="Enter role name"
          />
          <Label htmlFor="edit-role-description">Description</Label>
          <Input
            id="edit-role-description"
            value={editRole.description}
            onChange={(e) =>
              setEditRole({ ...editRole, description: e.target.value })
            }
            placeholder="Enter role description (optional)"
          />
          <Label>Permissions</Label>
          <div className="grid grid-cols-2 gap-2">
            {permissions.map((perm) => (
              <div key={perm.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={editRole.permissions.includes(perm.id)}
                  onCheckedChange={() => handlePermissionToggle(perm.id)}
                />
                <span>{`${perm.resource}:${perm.action}`}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={() =>
              updateRole({
                workspaceId,
                roleId: editRole.id,
                name: editRole.name,
                description: editRole.description || undefined,
                permissionIds: editRole.permissions,
              })
            }
            disabled={isPending || !editRole.name}
          >
            {isPending ? "Updating..." : "Update Role"}
          </Button>
        </div>
      )}
    </DialogContent>
  );
}
