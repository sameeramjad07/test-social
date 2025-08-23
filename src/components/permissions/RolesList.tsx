"use client";

import { api } from "@/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { Edit, Trash, Plus } from "lucide-react";
import { toast } from "sonner";

interface RolesListProps {
  workspaceId: string;
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: Array<{
      permissionId: string;
      permission: { resource: string; action: string };
    }>;
  }>;
  setEditRole: (role: {
    id: string;
    name: string;
    description: string;
    permissions: string[];
  }) => void;
  setIsCreateRoleOpen: (open: boolean) => void;
  setIsEditRoleOpen: (open: boolean) => void;
}

export function RolesList({
  workspaceId,
  roles,
  setEditRole,
  setIsCreateRoleOpen,
  setIsEditRoleOpen,
}: RolesListProps) {
  const { mutate: deleteRole, isPending: isDeleting } =
    api.workspaces.deleteRole.useMutation({
      onSuccess: () => toast.success("Role deleted"),
      onError: (error) => toast.error(error.message),
    });

  return (
    <>
      <div className="flex justify-end mb-4">
        <DialogTrigger asChild>
          <Button
            onClick={() => setIsCreateRoleOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Role
          </Button>
        </DialogTrigger>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>{role.name}</TableCell>
              <TableCell>{role.description || "N/A"}</TableCell>
              <TableCell>
                {role.permissions
                  .map(
                    (rp) => `${rp.permission.resource}:${rp.permission.action}`
                  )
                  .join(", ")}
              </TableCell>
              <TableCell>
                {!role.isSystem && (
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditRole({
                          id: role.id,
                          name: role.name,
                          description: role.description || "",
                          permissions: role.permissions.map(
                            (rp) => rp.permissionId
                          ),
                        });
                        setIsEditRoleOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        deleteRole({
                          workspaceId,
                          roleId: role.id,
                        })
                      }
                      disabled={isDeleting}
                    >
                      <Trash className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
