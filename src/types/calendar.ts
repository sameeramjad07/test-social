export interface Post {
  id: number;
  title: string;
  content: string;
  platform: string;
  date: Date;
  status:
    | "DRAFT"
    | "CONTENT_PENDING_APPROVAL"
    | "CONTENT_APPROVED"
    | "IMAGE_GENERATION_PENDING"
    | "IMAGE_PENDING_APPROVAL"
    | "APPROVED"
    | "SCHEDULED"
    | "PUBLISHING"
    | "PUBLISHED"
    | "FAILED";
  type: "image" | "video" | "text";
  engagement?: { likes: number; comments: number; shares: number };
  scheduleId?: string;
  scheduleName?: string;
}

export interface Schedule {
  id: string;
  name: string;
  posts: Post[];
  status: "draft" | "active" | "paused" | "completed";
}
