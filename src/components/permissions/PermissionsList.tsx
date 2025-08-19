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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash } from "lucide-react";

interface PermissionsListProps {
  workspaceId: string;
  members: Array<{
    id: string;
    user: { id: string; name: string | null; email: string | null };
    roleId: string;
    role: { id: string; name: string };
  }>;
  roles: Array<{ id: string; name: string }>;
}

export function PermissionsList({
  workspaceId,
  members,
  roles,
}: PermissionsListProps) {
  const { mutate: updateMemberRole, isPending: isUpdating } =
    api.workspaces.updateMemberRole.useMutation({
      onSuccess: () => toast.success("Member role updated"),
      onError: (error) => toast.error(error.message),
    });

  const { mutate: removeMember, isPending: isRemoving } =
    api.workspaces.removeMember.useMutation({
      onSuccess: () => toast.success("Member removed"),
      onError: (error) => toast.error(error.message),
    });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members?.map((member) => (
          <TableRow key={member.id}>
            <TableCell>{member.user.name || "N/A"}</TableCell>
            <TableCell>{member.user.email || "N/A"}</TableCell>
            <TableCell>
              <Select
                value={member.roleId}
                onValueChange={(roleId) =>
                  updateMemberRole({
                    workspaceId,
                    memberId: member.id,
                    roleId,
                  })
                }
                disabled={isUpdating || member.role.name === "owner"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              {member.role.name !== "owner" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    removeMember({
                      workspaceId,
                      memberId: member.id,
                    })
                  }
                  disabled={isRemoving}
                >
                  <Trash className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
