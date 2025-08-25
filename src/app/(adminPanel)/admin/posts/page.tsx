// "use client";

// import { useState } from "react";
// import { api } from "@/trpc/react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Calendar } from "@/components/ui/calendar";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   Search,
//   CalendarIcon,
//   List,
//   MoreHorizontal,
//   Pause,
//   Play,
//   Trash2,
//   Eye,
//   Clock,
//   ImageIcon,
//   FileText,
// } from "lucide-react";
// import { toast } from "sonner";

// interface ScheduledPost {
//   id: string;
//   workspace: {
//     name: string;
//     id: string;
//   };
//   user: {
//     name: string | null;
//     email: string | null;
//     avatar?: string;
//   };
//   content: string;
//   caption?: string;
//   socialAccounts: {
//     platform: "INSTAGRAM" | "FACEBOOK" | "LINKEDIN" | "TWITTER" | "TIKTOK";
//   }[];
//   images: { url: string }[];
//   scheduledAt: string;
//   status:
//     | "DRAFT"
//     | "CONTENT_PENDING_APPROVAL"
//     | "CONTENT_APPROVED"
//     | "IMAGE_GENERATION_PENDING"
//     | "IMAGE_PENDING_APPROVAL"
//     | "IMAGE_APPROVED"
//     | "APPROVED"
//     | "SCHEDULED"
//     | "PUBLISHING"
//     | "PUBLISHED"
//     | "FAILED";
//   createdAt: string;
//   generatedBy: "AI" | "MANUAL";
// }

// interface Workspace {
//   id: string;
//   name: string;
// }

// interface Permission {
//   id: string;
//   resource: string;
//   action: string;
// }

// export default function PostsScheduling() {
//   const [searchTerm, setSearchTerm] = useState("");
//   const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");
//   const [statusFilter, setStatusFilter] = useState<string>("all");
//   const [platformFilter, setPlatformFilter] = useState<string>("all");
//   const [selectedDate, setSelectedDate] = useState<Date | undefined>();
//   const [viewingPost, setViewingPost] = useState<ScheduledPost | null>(null);
//   const [activeTab, setActiveTab] = useState("list");

//   const {
//     data: posts,
//     isLoading: postsLoading,
//     refetch: refetchPosts,
//   } = api.admin.getPosts.useQuery();
//   const { data: workspaces, isLoading: workspacesLoading } =
//     api.admin.getWorkspaces.useQuery();
//   const { data: userPermissions, isLoading: permissionsLoading } =
//     api.admin.getUserPermissions.useQuery();

//   const togglePostStatus = api.admin.togglePostStatus.useMutation({
//     onSuccess: () => {
//       toast.success("Post status updated");
//       refetchPosts();
//     },
//     onError: (error) => toast.error(error.message),
//   });

//   const deletePost = api.admin.deletePost.useMutation({
//     onSuccess: () => {
//       toast.success("Post deleted");
//       refetchPosts();
//     },
//     onError: (error) => toast.error(error.message),
//   });

//   const formatDate = (
//     dateString: string,
//     formatType: "full" | "short" | "time" | "date" = "short"
//   ) => {
//     const date = new Date(dateString);
//     switch (formatType) {
//       case "full":
//         return date.toLocaleString("en-US", {
//           year: "numeric",
//           month: "short",
//           day: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//           timeZone: "UTC",
//         });
//       case "time":
//         return date.toLocaleTimeString("en-US", {
//           hour: "2-digit",
//           minute: "2-digit",
//           hour12: false,
//           timeZone: "UTC",
//         });
//       case "date":
//         return date.toLocaleDateString("en-US", {
//           year: "numeric",
//           month: "short",
//           day: "numeric",
//           timeZone: "UTC",
//         });
//       default:
//         return date.toLocaleString("en-US", {
//           month: "short",
//           day: "2-digit",
//           hour: "2-digit",
//           minute: "2-digit",
//           hour12: false,
//           timeZone: "UTC",
//         });
//     }
//   };

//   const isSameDay = (date1: Date, date2: Date) => {
//     return (
//       date1.getFullYear() === date2.getFullYear() &&
//       date1.getMonth() === date2.getMonth() &&
//       date1.getDate() === date2.getDate()
//     );
//   };

//   const parseISO = (dateString: string) => {
//     return new Date(dateString);
//   };

//   const filteredPosts = (posts || []).filter((post: ScheduledPost) => {
//     const matchesSearch =
//       (post.caption || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (post.user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
//       post.workspace.name.toLowerCase().includes(searchTerm.toLowerCase());

//     const matchesWorkspace =
//       workspaceFilter === "all" || post.workspace.id === workspaceFilter;
//     const matchesStatus =
//       statusFilter === "all" || post.status === statusFilter;
//     const matchesPlatform =
//       platformFilter === "all" ||
//       post.socialAccounts.some(
//         (account) => account.platform === platformFilter
//       );
//     const matchesDate =
//       !selectedDate || isSameDay(parseISO(post.scheduledAt), selectedDate);

//     return (
//       matchesSearch &&
//       matchesWorkspace &&
//       matchesStatus &&
//       matchesPlatform &&
//       matchesDate
//     );
//   });

//   const handleTogglePostStatus = (postId: string, currentStatus: string) => {
//     if (
//       !userPermissions?.some(
//         (p: Permission) => p.resource === "posts" && p.action === "update"
//       )
//     ) {
//       toast.error("You lack permission to update posts");
//       return;
//     }
//     togglePostStatus.mutate({
//       postId,
//       status: currentStatus === "SCHEDULED" ? "PAUSED" : "SCHEDULED",
//     });
//   };

//   const handleDeletePost = (postId: string) => {
//     if (
//       !userPermissions?.some(
//         (p: Permission) => p.resource === "posts" && p.action === "delete"
//       )
//     ) {
//       toast.error("You lack permission to delete posts");
//       return;
//     }
//     deletePost.mutate({ postId });
//   };

//   const getInitials = (name: string | null) => {
//     return name
//       ? name
//           .split(" ")
//           .map((n) => n[0])
//           .join("")
//           .toUpperCase()
//       : "N/A";
//   };

//   const getStatusBadgeVariant = (status: string) => {
//     switch (status) {
//       case "SCHEDULED":
//         return "default";
//       case "PAUSED":
//         return "secondary";
//       case "PUBLISHED":
//         return "outline";
//       case "FAILED":
//         return "destructive";
//       case "DRAFT":
//         return "outline";
//       case "CONTENT_PENDING_APPROVAL":
//         return "secondary";
//       case "CONTENT_APPROVED":
//         return "default";
//       case "IMAGE_GENERATION_PENDING":
//         return "secondary";
//       case "IMAGE_PENDING_APPROVAL":
//         return "secondary";
//       case "IMAGE_APPROVED":
//         return "default";
//       case "APPROVED":
//         return "default";
//       case "PUBLISHING":
//         return "default";
//       default:
//         return "outline";
//     }
//   };

//   const getPlatformIcon = (platform: string) => {
//     return platform.charAt(0).toUpperCase();
//   };

//   const getPostsForDate = (date: Date) => {
//     return (posts || []).filter((post: ScheduledPost) =>
//       isSameDay(parseISO(post.scheduledAt), date)
//     );
//   };

//   if (postsLoading || workspacesLoading || permissionsLoading) {
//     return <div>Loading posts...</div>;
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
//         <div>
//           <h2 className="text-2xl font-bold tracking-tight">
//             Posts & Scheduling
//           </h2>
//           <p className="text-muted-foreground">
//             Manage scheduled posts across all workspaces
//           </p>
//         </div>
//       </div>

//       {/* Stats Cards */}
//       <div className="grid gap-4 md:grid-cols-4">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">
//               Total Scheduled
//             </CardTitle>
//             <Clock className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {
//                 posts?.filter((p: ScheduledPost) => p.status === "SCHEDULED")
//                   .length
//               }
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">Paused</CardTitle>
//             <Pause className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {
//                 posts?.filter((p: ScheduledPost) => p.status === "PAUSED")
//                   .length
//               }
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">AI Generated</CardTitle>
//             <FileText className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {
//                 posts?.filter((p: ScheduledPost) => p.generatedBy === "AI")
//                   .length
//               }
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">With Images</CardTitle>
//             <ImageIcon className="h-4 w-4 text-muted-foreground" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {posts?.filter((p: ScheduledPost) => p.images.length > 0).length}
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Filters */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Filters</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
//             <div>
//               <div className="relative">
//                 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//                 <Input
//                   placeholder="Search posts..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-10"
//                 />
//               </div>
//             </div>
//             <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
//               <SelectTrigger>
//                 <SelectValue placeholder="Workspace" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Workspaces</SelectItem>
//                 {workspaces?.map((workspace: Workspace) => (
//                   <SelectItem key={workspace.id} value={workspace.id}>
//                     {workspace.name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//             <Select value={statusFilter} onValueChange={setStatusFilter}>
//               <SelectTrigger>
//                 <SelectValue placeholder="Status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Status</SelectItem>
//                 <SelectItem value="DRAFT">Draft</SelectItem>
//                 <SelectItem value="CONTENT_PENDING_APPROVAL">
//                   Pending Approval
//                 </SelectItem>
//                 <SelectItem value="CONTENT_APPROVED">Approved</SelectItem>
//                 <SelectItem value="IMAGE_GENERATION_PENDING">
//                   Image Generation Pending
//                 </SelectItem>
//                 <SelectItem value="IMAGE_PENDING_APPROVAL">
//                   Image Pending Approval
//                 </SelectItem>
//                 <SelectItem value="IMAGE_APPROVED">Image Approved</SelectItem>
//                 <SelectItem value="APPROVED">Approved</SelectItem>
//                 <SelectItem value="SCHEDULED">Scheduled</SelectItem>
//                 <SelectItem value="PUBLISHING">Publishing</SelectItem>
//                 <SelectItem value="PUBLISHED">Published</SelectItem>
//                 <SelectItem value="FAILED">Failed</SelectItem>
//               </SelectContent>
//             </Select>
//             <Select value={platformFilter} onValueChange={setPlatformFilter}>
//               <SelectTrigger>
//                 <SelectValue placeholder="Platform" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Platforms</SelectItem>
//                 <SelectItem value="TWITTER">Twitter</SelectItem>
//                 <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
//                 <SelectItem value="FACEBOOK">Facebook</SelectItem>
//                 <SelectItem value="INSTAGRAM">Instagram</SelectItem>
//                 <SelectItem value="TIKTOK">TikTok</SelectItem>
//               </SelectContent>
//             </Select>
//             <Button
//               variant="outline"
//               onClick={() => {
//                 setSearchTerm("");
//                 setWorkspaceFilter("all");
//                 setStatusFilter("all");
//                 setPlatformFilter("all");
//                 setSelectedDate(undefined);
//               }}
//             >
//               Clear Filters
//             </Button>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Main Content */}
//       <Tabs value={activeTab} onValueChange={setActiveTab}>
//         <TabsList>
//           <TabsTrigger value="list" className="flex items-center gap-2">
//             <List className="h-4 w-4" />
//             List View
//           </TabsTrigger>
//           <TabsTrigger value="calendar" className="flex items-center gap-2">
//             <CalendarIcon className="h-4 w-4" />
//             Calendar View
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="list" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>Scheduled Posts ({filteredPosts.length})</CardTitle>
//               <CardDescription>
//                 All scheduled posts across workspaces
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 {filteredPosts.map((post: ScheduledPost) => (
//                   <div
//                     key={post.id}
//                     className="flex items-start gap-4 p-4 border rounded-lg"
//                   >
//                     <Avatar className="h-10 w-10">
//                       <AvatarImage
//                         src={post.user.avatar || "/placeholder.svg"}
//                       />
//                       <AvatarFallback>
//                         {getInitials(post.user.name)}
//                       </AvatarFallback>
//                     </Avatar>
//                     <div className="flex-1 space-y-2">
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           <span className="font-medium">
//                             {post.user.name || "Unknown"}
//                           </span>
//                           <Badge variant="outline">{post.workspace.name}</Badge>
//                           <div className="flex items-center gap-1">
//                             <div className="w-5 h-5 bg-primary rounded text-xs text-primary-foreground flex items-center justify-center">
//                               {getPlatformIcon(
//                                 post.socialAccounts[0]?.platform || "Unknown"
//                               )}
//                             </div>
//                             <span className="text-sm text-muted-foreground capitalize">
//                               {post.socialAccounts
//                                 .map((sa) => sa.platform.toLowerCase())
//                                 .join(", ")}
//                             </span>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-2">
//                           <Badge variant={getStatusBadgeVariant(post.status)}>
//                             {post.status}
//                           </Badge>
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button
//                                 variant="ghost"
//                                 className="h-8 w-8 p-0"
//                                 disabled={
//                                   !userPermissions?.some(
//                                     (p: Permission) =>
//                                       p.resource === "posts" &&
//                                       ["update", "delete"].includes(p.action)
//                                   )
//                                 }
//                               >
//                                 <MoreHorizontal className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem
//                                 onClick={() => setViewingPost(post)}
//                               >
//                                 <Eye className="mr-2 h-4 w-4" />
//                                 View Details
//                               </DropdownMenuItem>
//                               {(post.status === "SCHEDULED" ||
//                                 post.status === "PAUSED") && (
//                                 <DropdownMenuItem
//                                   onClick={() =>
//                                     handleTogglePostStatus(post.id, post.status)
//                                   }
//                                 >
//                                   {post.status === "SCHEDULED" ? (
//                                     <>
//                                       <Pause className="mr-2 h-4 w-4" />
//                                       Pause
//                                     </>
//                                   ) : (
//                                     <>
//                                       <Play className="mr-2 h-4 w-4" />
//                                       Resume
//                                     </>
//                                   )}
//                                 </DropdownMenuItem>
//                               )}
//                               <DropdownMenuItem
//                                 onClick={() => handleDeletePost(post.id)}
//                                 className="text-destructive"
//                               >
//                                 <Trash2 className="mr-2 h-4 w-4" />
//                                 Delete
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </div>
//                       </div>
//                       <p className="text-sm text-foreground line-clamp-2">
//                         {post.caption || post.content}
//                       </p>
//                       {post.images.length > 0 && post.images[0] && (
//                         <div className="w-32 h-20 bg-muted rounded overflow-hidden">
//                           <img
//                             src={post.images[0].url || "/placeholder.svg"}
//                             alt="Post preview"
//                             className="w-full h-full object-cover"
//                           />
//                         </div>
//                       )}
//                       <div className="flex items-center gap-4 text-xs text-muted-foreground">
//                         <span>
//                           Scheduled: {formatDate(post.scheduledAt, "full")}
//                         </span>
//                         <span>
//                           Created: {formatDate(post.createdAt, "date")}
//                         </span>
//                         <Badge variant="outline" className="text-xs">
//                           {post.generatedBy === "AI"
//                             ? "AI Generated"
//                             : "Manual"}
//                         </Badge>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="calendar" className="space-y-4">
//           <div className="grid gap-4 md:grid-cols-3">
//             <Card className="md:col-span-2">
//               <CardHeader>
//                 <CardTitle>Calendar View</CardTitle>
//                 <CardDescription>
//                   Posts scheduled across all dates
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Calendar
//                   mode="single"
//                   selected={selectedDate}
//                   onSelect={setSelectedDate}
//                   className="rounded-md border"
//                   modifiers={{
//                     hasPost: (date: Date) => getPostsForDate(date).length > 0,
//                   }}
//                   modifiersStyles={{
//                     hasPost: {
//                       backgroundColor: "hsl(var(--primary))",
//                       color: "hsl(var(--primary-foreground))",
//                     },
//                   }}
//                 />
//               </CardContent>
//             </Card>
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   {selectedDate
//                     ? formatDate(selectedDate.toISOString(), "date")
//                     : "Select a date"}
//                 </CardTitle>
//                 <CardDescription>
//                   {selectedDate
//                     ? `${getPostsForDate(selectedDate).length} posts scheduled`
//                     : "Click on a date to see scheduled posts"}
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {selectedDate && (
//                   <div className="space-y-3">
//                     {getPostsForDate(selectedDate).map(
//                       (post: ScheduledPost) => (
//                         <div key={post.id} className="p-3 border rounded-lg">
//                           <div className="flex items-center justify-between mb-2">
//                             <span className="text-sm font-medium">
//                               {post.user.name || "Unknown"}
//                             </span>
//                             <Badge
//                               variant={getStatusBadgeVariant(post.status)}
//                               className="text-xs"
//                             >
//                               {post.status}
//                             </Badge>
//                           </div>
//                           <p className="text-xs text-muted-foreground line-clamp-2">
//                             {post.caption || post.content}
//                           </p>
//                           <div className="flex items-center justify-between mt-2">
//                             <span className="text-xs text-muted-foreground capitalize">
//                               {post.socialAccounts
//                                 .map((sa) => sa.platform.toLowerCase())
//                                 .join(", ")}
//                             </span>
//                             <span className="text-xs text-muted-foreground">
//                               {formatDate(post.scheduledAt, "time")}
//                             </span>
//                           </div>
//                         </div>
//                       )
//                     )}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>
//       </Tabs>

//       {/* Post Details Dialog */}
//       <Dialog open={!!viewingPost} onOpenChange={() => setViewingPost(null)}>
//         <DialogContent className="max-w-2xl">
//           <DialogHeader>
//             <DialogTitle>Post Details</DialogTitle>
//             <DialogDescription>
//               Full post content and scheduling information
//             </DialogDescription>
//           </DialogHeader>
//           {viewingPost && (
//             <div className="space-y-4">
//               <div className="flex items-center gap-3">
//                 <Avatar>
//                   <AvatarImage
//                     src={viewingPost.user.avatar || "/placeholder.svg"}
//                   />
//                   <AvatarFallback>
//                     {getInitials(viewingPost.user.name)}
//                   </AvatarFallback>
//                 </Avatar>
//                 <div>
//                   <div className="font-medium">
//                     {viewingPost.user.name || "Unknown"}
//                   </div>
//                   <div className="text-sm text-muted-foreground">
//                     {viewingPost.workspace.name}
//                   </div>
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <div className="flex items-center gap-2">
//                   <Badge variant="outline" className="capitalize">
//                     {viewingPost.socialAccounts
//                       .map((sa) => sa.platform.toLowerCase())
//                       .join(", ")}
//                   </Badge>
//                   <Badge variant={getStatusBadgeVariant(viewingPost.status)}>
//                     {viewingPost.status}
//                   </Badge>
//                   <Badge variant="outline">
//                     {viewingPost.generatedBy === "AI"
//                       ? "AI Generated"
//                       : "Manual"}
//                   </Badge>
//                 </div>
//                 <p className="text-sm">
//                   {viewingPost.caption || viewingPost.content}
//                 </p>
//                 {viewingPost.images.length > 0 && viewingPost.images[0] && (
//                   <div className="w-full max-w-md mx-auto">
//                     <img
//                       src={viewingPost.images[0].url || "/placeholder.svg"}
//                       alt="Post content"
//                       className="w-full rounded-lg border"
//                     />
//                   </div>
//                 )}
//               </div>
//               <div className="grid gap-2 text-sm">
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Scheduled for:</span>
//                   <span>{formatDate(viewingPost.scheduledAt, "full")}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span className="text-muted-foreground">Created:</span>
//                   <span>{formatDate(viewingPost.createdAt, "full")}</span>
//                 </div>
//               </div>
//             </div>
//           )}
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setViewingPost(null)}>
//               Close
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }
