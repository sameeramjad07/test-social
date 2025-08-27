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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Download,
  CalendarIcon,
  FileText,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Brain,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIGeneration {
  id: string;
  user: {
    name: string | null;
    email: string | null;
    avatar: string | null;
  };
  workspace: {
    name: string;
    id: string;
  };
  type: "TEXT" | "IMAGE";
  prompt: string;
  model: string;
  tokens: number | null;
  imageSize: string | null;
  createdAt: string;
  duration: number;
  status: "COMPLETED" | "FAILED" | "PROCESSING";
  cost: number;
}

interface Workspace {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
}

export default function AIUsageLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    data: generations,
    isLoading: logsLoading,
    error: logsError,
  } = api.admin.getAILogs.useQuery();
  const { data: workspaces, isLoading: workspacesLoading } =
    api.admin.getWorkspaces.useQuery();
  const { data: userPermissions, isLoading: permissionsLoading } =
    api.admin.getUserPermissions.useQuery();
  const exportLogsMutation = api.admin.exportAILogs.useMutation({
    onSuccess: (csvContent) => {
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai_logs_${new Date().toISOString()}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Logs exported successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredGenerations = (generations || []).filter(
    (generation: AIGeneration) => {
      const matchesSearch =
        (generation.user.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ??
          false) ||
        (generation.user.email
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ??
          false) ||
        generation.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        generation.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWorkspace =
        workspaceFilter === "all" ||
        generation.workspace.id === workspaceFilter;
      const matchesType =
        typeFilter === "all" || generation.type === typeFilter;
      const matchesStatus =
        statusFilter === "all" || generation.status === statusFilter;
      const generationDate = new Date(generation.createdAt);
      const matchesDateFrom = !dateFrom || generationDate >= dateFrom;

      return (
        matchesSearch &&
        matchesWorkspace &&
        matchesType &&
        matchesStatus &&
        matchesDateFrom
      );
    }
  );

  const totalPages = Math.ceil(filteredGenerations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGenerations = filteredGenerations.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "FAILED":
        return "destructive";
      case "PROCESSING":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(3)}`;
  };

  const formatDate = (
    dateString: string,
    formatType: "full" | "short" = "short"
  ) => {
    const date = new Date(dateString);
    if (formatType === "full") {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  };

  const exportLogs = () => {
    if (
      !userPermissions?.some(
        (p: Permission) => p.resource === "aiLogs" && p.action === "read"
      )
    ) {
      toast.error("You lack permission to export AI logs");
      return;
    }
    exportLogsMutation.mutate();
  };

  if (logsLoading || workspacesLoading) {
    return <div>Loading AI logs...</div>;
  }

  if (logsError) {
    return <div>Error loading AI logs: {logsError.message}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Usage Logs</h2>
          <p className="text-muted-foreground">
            Track all AI generations across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportLogs}
            disabled={
              !userPermissions?.some(
                (p: Permission) =>
                  p.resource === "aiLogs" && p.action === "read"
              ) || exportLogsMutation.status === "pending"
            }
          >
            <Download className="mr-2 h-4 w-4" />
            {exportLogsMutation.status === "pending"
              ? "Exporting..."
              : "Export Logs"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Generations
            </CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredGenerations.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Text Generations
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredGenerations.filter((g) => g.type === "TEXT").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Image Generations
            </CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredGenerations.filter((g) => g.type === "IMAGE").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(
                filteredGenerations.reduce((sum, g) => sum + g.cost, 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces?.map((workspace: Workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="TEXT">Text</SelectItem>
                <SelectItem value="IMAGE">Image</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom
                      ? formatDate(dateFrom.toISOString(), "full")
                      : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Logs ({filteredGenerations.length})</CardTitle>
          <CardDescription>Detailed logs of all AI generations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGenerations.map((generation: AIGeneration) => (
                <TableRow key={generation.id}>
                  <TableCell className="font-mono text-sm">
                    {generation.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage
                          src={generation.user.avatar ?? "/placeholder.svg"}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(generation.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {generation.user.name ?? "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {generation.user.email ?? "N/A"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{generation.workspace.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {generation.type === "TEXT" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      <span className="capitalize">
                        {generation.type.toLowerCase()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{generation.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <div
                      className="max-w-[200px] truncate text-sm"
                      title={generation.prompt}
                    >
                      {generation.prompt}
                    </div>
                    {generation.tokens && (
                      <div className="text-xs text-muted-foreground">
                        {generation.tokens} tokens
                      </div>
                    )}
                    {generation.imageSize && (
                      <div className="text-xs text-muted-foreground">
                        {generation.imageSize}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(generation.duration)}</TableCell>
                  <TableCell>{formatCost(generation.cost)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(generation.status)}>
                      {generation.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(generation.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + itemsPerPage, filteredGenerations.length)}{" "}
              of {filteredGenerations.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
