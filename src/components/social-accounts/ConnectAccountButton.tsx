"use client";

import { useState } from "react";
import { Platform } from "@prisma/client";
import { Instagram, Facebook, Linkedin, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "../ui/button";

interface ConnectAccountButtonProps {
  platform: Platform;
  workspaceId: string;
  onSuccess?: () => void;
}

const platformConfig = {
  [Platform.INSTAGRAM]: {
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
  [Platform.FACEBOOK]: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-blue-600",
  },
  [Platform.LINKEDIN]: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-700",
  },
} as any;

export function ConnectAccountButton({
  platform,
  workspaceId,
  onSuccess,
}: ConnectAccountButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const { mutate: getAuthUrl } = api.socialAccounts.getAuthUrl.useMutation({
    onSuccess: (data) => {
      console.log(`[${platform}] Auth URL:`, data.authUrl); // Debug log
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      setIsConnecting(false);
      toast.error(
        `Failed to connect ${platformConfig[platform].name}: ${error.message}`
      );
      console.error(`[${platform}] Connection error:`, error);
    },
  });

  const handleConnect = () => {
    setIsConnecting(true);
    getAuthUrl({ platform, workspaceId });
  };

  const config = platformConfig[platform];
  const Icon = config.icon;

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`${config.color} text-white hover:opacity-90`}
    >
      {isConnecting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}
      Connect {config.name}
    </Button>
  );
}
