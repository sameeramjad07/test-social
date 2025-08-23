// src/components/calendar/post-entry.tsx
"use client";

import {
  Instagram,
  Facebook,
  Linkedin,
  ImageIcon,
  Video,
  FileText,
} from "lucide-react";

interface PostEntryProps {
  post: any;
  onClick: (e: React.MouseEvent) => void;
}

const platforms = [
  { name: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { name: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
];

export function PostEntry({ post, onClick }: PostEntryProps) {
  const platform = platforms.find((p) => p.name === post.platform);

  return (
    <div
      className={`text-xs p-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
        platform?.color || "bg-gray-500"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 mb-1">
        {platform && <platform.icon className="w-3 h-3" />}
        <div className="flex items-center gap-1">
          {post.type === "image" && <ImageIcon className="w-3 h-3" />}
          {post.type === "video" && <Video className="w-3 h-3" />}
          {post.type === "text" && <FileText className="w-3 h-3" />}
        </div>
      </div>
      <div className="font-medium truncate">{post.title}</div>
      <div className="text-xs opacity-90">
        {post.date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}
