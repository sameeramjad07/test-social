export interface Post {
  id: number;
  title: string;
  content: string;
  platform: string;
  date: Date;
  status: "draft" | "scheduled" | "published" | "failed";
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
