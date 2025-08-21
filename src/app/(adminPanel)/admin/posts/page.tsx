"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search,
  CalendarIcon,
  List,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
  Eye,
  Clock,
  ImageIcon,
  FileText,
} from "lucide-react"

interface ScheduledPost {
  id: string
  workspace: {
    name: string
    id: string
  }
  user: {
    name: string
    email: string
    avatar?: string
  }
  content: {
    text: string
    image?: string
    platform: "twitter" | "linkedin" | "facebook" | "instagram"
  }
  scheduledFor: string
  status: "scheduled" | "paused" | "published" | "failed"
  createdAt: string
  generatedBy: "ai" | "manual"
}

const mockPosts: ScheduledPost[] = [
  {
    id: "post_001",
    workspace: { name: "Marketing Team", id: "ws_001" },
    user: { name: "Sarah Johnson", email: "sarah@marketingteam.com" },
    content: {
      text: "🚀 Excited to announce our new product launch! Revolutionary AI-powered social media management is here. #Innovation #AI #SocialMedia",
      image: "/product-launch.png",
      platform: "twitter",
    },
    scheduledFor: "2024-02-21T10:00:00Z",
    status: "scheduled",
    createdAt: "2024-02-20T14:30:00Z",
    generatedBy: "ai",
  },
  {
    id: "post_002",
    workspace: { name: "E-commerce Store", id: "ws_002" },
    user: { name: "Mike Chen", email: "mike@ecommerce.com" },
    content: {
      text: "Winter collection is now live! ❄️ Discover cozy styles that blend comfort with elegance. Shop now and get 20% off your first order.",
      image: "/winter-fashion-collection.png",
      platform: "instagram",
    },
    scheduledFor: "2024-02-21T15:30:00Z",
    status: "scheduled",
    createdAt: "2024-02-20T14:25:00Z",
    generatedBy: "ai",
  },
  {
    id: "post_003",
    workspace: { name: "Tech Startup", id: "ws_003" },
    user: { name: "Emily Davis", email: "emily@techstartup.com" },
    content: {
      text: "The future of AI is here, and it's transforming how we work. Our latest blog post explores the top trends shaping 2024. Read more on our website.",
      platform: "linkedin",
    },
    scheduledFor: "2024-02-22T09:00:00Z",
    status: "paused",
    createdAt: "2024-02-20T14:20:00Z",
    generatedBy: "ai",
  },
  {
    id: "post_004",
    workspace: { name: "Creative Agency", id: "ws_004" },
    user: { name: "Alex Rodriguez", email: "alex@creative.com" },
    content: {
      text: "Behind the scenes of our latest campaign! 🎨 Creativity meets strategy in everything we do. Swipe to see the process.",
      image: "/creative-agency-behind-the-scenes.png",
      platform: "instagram",
    },
    scheduledFor: "2024-02-22T14:00:00Z",
    status: "scheduled",
    createdAt: "2024-02-20T14:15:00Z",
    generatedBy: "manual",
  },
  {
    id: "post_005",
    workspace: { name: "Food Blog", id: "ws_005" },
    user: { name: "Lisa Wang", email: "lisa@foodblog.com" },
    content: {
      text: "Recipe of the day: Decadent chocolate cake that melts in your mouth! 🍰 Full recipe and tips on our blog. What's your favorite dessert?",
      image: "/chocolate-cake-recipe.png",
      platform: "facebook",
    },
    scheduledFor: "2024-02-23T12:00:00Z",
    status: "scheduled",
    createdAt: "2024-02-20T14:10:00Z",
    generatedBy: "ai",
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

export default function PostsScheduling() {
  const [posts, setPosts] = useState<ScheduledPost[]>(mockPosts)
  const [searchTerm, setSearchTerm] = useState("")
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [viewingPost, setViewingPost] = useState<ScheduledPost | null>(null)
  const [activeTab, setActiveTab] = useState("list")

  const formatDate = (dateString: string, formatType: "full" | "short" | "time" | "date" = "short") => {
    const date = new Date(dateString)
    switch (formatType) {
      case "full":
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      case "time":
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      case "date":
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      default:
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
    }
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const parseISO = (dateString: string) => {
    return new Date(dateString)
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.content.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.workspace.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesWorkspace = workspaceFilter === "all" || post.workspace.id === workspaceFilter
    const matchesStatus = statusFilter === "all" || post.status === statusFilter
    const matchesPlatform = platformFilter === "all" || post.content.platform === platformFilter

    const matchesDate = !selectedDate || isSameDay(parseISO(post.scheduledFor), selectedDate)

    return matchesSearch && matchesWorkspace && matchesStatus && matchesPlatform && matchesDate
  })

  const handleTogglePostStatus = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId ? { ...post, status: post.status === "scheduled" ? "paused" : "scheduled" } : post,
      ),
    )
  }

  const handleDeletePost = (postId: string) => {
    setPosts(posts.filter((post) => post.id !== postId))
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "scheduled":
        return "default"
      case "paused":
        return "secondary"
      case "published":
        return "outline"
      case "failed":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getPlatformIcon = (platform: string) => {
    // In a real app, you'd use actual platform icons
    return platform.charAt(0).toUpperCase()
  }

  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => isSameDay(parseISO(post.scheduledFor), date))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Posts & Scheduling</h2>
          <p className="text-muted-foreground">Manage scheduled posts across all workspaces</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.filter((p) => p.status === "scheduled").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.filter((p) => p.status === "paused").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.filter((p) => p.generatedBy === "ai").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Images</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posts.filter((p) => p.content.image).length}</div>
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
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setWorkspaceFilter("all")
                setStatusFilter("all")
                setPlatformFilter("all")
                setSelectedDate(undefined)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Posts ({filteredPosts.length})</CardTitle>
              <CardDescription>All scheduled posts across workspaces</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{getInitials(post.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{post.user.name}</span>
                          <Badge variant="outline">{post.workspace.name}</Badge>
                          <div className="flex items-center gap-1">
                            <div className="w-5 h-5 bg-primary rounded text-xs text-primary-foreground flex items-center justify-center">
                              {getPlatformIcon(post.content.platform)}
                            </div>
                            <span className="text-sm text-muted-foreground capitalize">{post.content.platform}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(post.status)}>{post.status}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingPost(post)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleTogglePostStatus(post.id)}>
                                {post.status === "scheduled" ? (
                                  <>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Resume
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">{post.content.text}</p>
                      {post.content.image && (
                        <div className="w-32 h-20 bg-muted rounded overflow-hidden">
                          <img
                            src={post.content.image || "/placeholder.svg"}
                            alt="Post preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Scheduled: {formatDate(post.scheduledFor, "full")}</span>
                        <span>Created: {formatDate(post.createdAt, "date")}</span>
                        <Badge variant="outline" className="text-xs">
                          {post.generatedBy === "ai" ? "AI Generated" : "Manual"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>Posts scheduled across all dates</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    hasPost: (date) => getPostsForDate(date).length > 0,
                  }}
                  modifiersStyles={{
                    hasPost: { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" },
                  }}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{selectedDate ? formatDate(selectedDate.toISOString(), "date") : "Select a date"}</CardTitle>
                <CardDescription>
                  {selectedDate
                    ? `${getPostsForDate(selectedDate).length} posts scheduled`
                    : "Click on a date to see scheduled posts"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDate && (
                  <div className="space-y-3">
                    {getPostsForDate(selectedDate).map((post) => (
                      <div key={post.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{post.user.name}</span>
                          <Badge variant={getStatusBadgeVariant(post.status)} className="text-xs">
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{post.content.text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground capitalize">{post.content.platform}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(post.scheduledFor, "time")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Post Details Dialog */}
      <Dialog open={!!viewingPost} onOpenChange={() => setViewingPost(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>Full post content and scheduling information</DialogDescription>
          </DialogHeader>
          {viewingPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={viewingPost.user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{getInitials(viewingPost.user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{viewingPost.user.name}</div>
                  <div className="text-sm text-muted-foreground">{viewingPost.workspace.name}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {viewingPost.content.platform}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(viewingPost.status)}>{viewingPost.status}</Badge>
                  <Badge variant="outline">{viewingPost.generatedBy === "ai" ? "AI Generated" : "Manual"}</Badge>
                </div>
                <p className="text-sm">{viewingPost.content.text}</p>
                {viewingPost.content.image && (
                  <div className="w-full max-w-md mx-auto">
                    <img
                      src={viewingPost.content.image || "/placeholder.svg"}
                      alt="Post content"
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled for:</span>
                  <span>{formatDate(viewingPost.scheduledFor, "full")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(viewingPost.createdAt, "full")}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingPost(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
