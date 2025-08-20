"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AIGeneration {
  id: string
  user: {
    name: string
    email: string
    avatar?: string
  }
  workspace: {
    name: string
    id: string
  }
  type: "text" | "image"
  prompt: string
  model: string
  tokens?: number
  imageSize?: string
  timestamp: string
  duration: number
  status: "completed" | "failed" | "processing"
  cost: number
}

const mockGenerations: AIGeneration[] = [
  {
    id: "gen_001",
    user: { name: "Sarah Johnson", email: "sarah@marketingteam.com" },
    workspace: { name: "Marketing Team", id: "ws_001" },
    type: "text",
    prompt: "Create a social media post about our new product launch",
    model: "GPT-4",
    tokens: 150,
    timestamp: "2024-02-20T14:30:00Z",
    duration: 2.3,
    status: "completed",
    cost: 0.045,
  },
  {
    id: "gen_002",
    user: { name: "Mike Chen", email: "mike@ecommerce.com" },
    workspace: { name: "E-commerce Store", id: "ws_002" },
    type: "image",
    prompt: "Product showcase image for winter collection",
    model: "DALL-E 3",
    imageSize: "1024x1024",
    timestamp: "2024-02-20T14:25:00Z",
    duration: 8.7,
    status: "completed",
    cost: 0.12,
  },
  {
    id: "gen_003",
    user: { name: "Emily Davis", email: "emily@techstartup.com" },
    workspace: { name: "Tech Startup", id: "ws_003" },
    type: "text",
    prompt: "Write a blog post about AI trends in 2024",
    model: "GPT-4",
    tokens: 800,
    timestamp: "2024-02-20T14:20:00Z",
    duration: 5.1,
    status: "completed",
    cost: 0.24,
  },
  {
    id: "gen_004",
    user: { name: "Alex Rodriguez", email: "alex@creative.com" },
    workspace: { name: "Creative Agency", id: "ws_004" },
    type: "image",
    prompt: "Abstract background for client presentation",
    model: "Midjourney",
    imageSize: "1920x1080",
    timestamp: "2024-02-20T14:15:00Z",
    duration: 12.4,
    status: "failed",
    cost: 0.0,
  },
  {
    id: "gen_005",
    user: { name: "Lisa Wang", email: "lisa@foodblog.com" },
    workspace: { name: "Food Blog", id: "ws_005" },
    type: "text",
    prompt: "Recipe description for chocolate cake",
    model: "GPT-3.5",
    tokens: 200,
    timestamp: "2024-02-20T14:10:00Z",
    duration: 1.8,
    status: "completed",
    cost: 0.02,
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

export default function AIUsageLogs() {
  const [generations, setGenerations] = useState<AIGeneration[]>(mockGenerations)
  const [searchTerm, setSearchTerm] = useState("")
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredGenerations = generations.filter((generation) => {
    const matchesSearch =
      generation.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generation.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generation.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generation.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesWorkspace = workspaceFilter === "all" || generation.workspace.id === workspaceFilter
    const matchesType = typeFilter === "all" || generation.type === typeFilter
    const matchesStatus = statusFilter === "all" || generation.status === statusFilter

    const generationDate = new Date(generation.timestamp)
    const matchesDateFrom = !dateFrom || generationDate >= dateFrom
    const matchesDateTo = !dateTo || generationDate <= dateTo

    return matchesSearch && matchesWorkspace && matchesType && matchesStatus && matchesDateFrom && matchesDateTo
  })

  const totalPages = Math.ceil(filteredGenerations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedGenerations = filteredGenerations.slice(startIndex, startIndex + itemsPerPage)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "failed":
        return "destructive"
      case "processing":
        return "secondary"
      default:
        return "outline"
    }
  }

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(3)}`
  }

  const formatDate = (dateString: string, formatType: "full" | "short" = "short") => {
    const date = new Date(dateString)
    if (formatType === "full") {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const exportLogs = () => {
    // In a real app, this would generate and download a CSV/Excel file
    console.log("Exporting logs...", filteredGenerations)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Usage Logs</h2>
          <p className="text-muted-foreground">Track all AI generations across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="mr-2 h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredGenerations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Text Generations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredGenerations.filter((g) => g.type === "text").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Image Generations</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredGenerations.filter((g) => g.type === "image").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(filteredGenerations.reduce((sum, g) => sum + g.cost, 0))}
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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
                {availableWorkspaces.map((workspace) => (
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
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? formatDate(dateFrom.toISOString(), "full") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
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
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGenerations.map((generation) => (
                <TableRow key={generation.id}>
                  <TableCell className="font-mono text-sm">{generation.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={generation.user.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-xs">{getInitials(generation.user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{generation.user.name}</div>
                        <div className="text-xs text-muted-foreground">{generation.user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{generation.workspace.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {generation.type === "text" ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      <span className="capitalize">{generation.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{generation.model}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate text-sm" title={generation.prompt}>
                      {generation.prompt}
                    </div>
                    {generation.tokens && (
                      <div className="text-xs text-muted-foreground">{generation.tokens} tokens</div>
                    )}
                    {generation.imageSize && (
                      <div className="text-xs text-muted-foreground">{generation.imageSize}</div>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(generation.duration)}</TableCell>
                  <TableCell>{formatCost(generation.cost)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(generation.status)}>{generation.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(generation.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredGenerations.length)} of{" "}
              {filteredGenerations.length} entries
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
  )
}
