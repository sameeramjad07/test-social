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
  scheduleName?: string;
}

const platforms = [
  { name: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { name: "Facebook", icon: Facebook, color: "bg-blue-600" },
  { name: "LinkedIn", icon: Linkedin, color: "bg-blue-700" },
];

export function PostEntry({ post, onClick, scheduleName }: PostEntryProps) {
  const platform = platforms.find((p) =>
    post.socialAccounts.some((acc: any) => acc.platform === p.name)
  );

  const TypeIcon =
    post.type === "image"
      ? ImageIcon
      : post.type === "video"
      ? Video
      : FileText;

  return (
    <div
      className={`text-xs p-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
        platform?.color || "bg-gray-500"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 mb-1">
        {platform && <platform.icon className="w-3 h-3" />}
        <TypeIcon className="w-3 h-3" />
      </div>
      <div className="font-medium truncate">
        {post.content?.slice(0, 20) || "Untitled"}
      </div>
      {scheduleName && (
        <div className="text-xs opacity-90 truncate">{scheduleName}</div>
      )}
      <div className="text-xs opacity-90">
        {post.scheduledAt
          ? new Date(post.scheduledAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "No time"}
      </div>
    </div>
  );
}
