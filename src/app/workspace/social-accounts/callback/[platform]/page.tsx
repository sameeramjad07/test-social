'use client'

import { useEffect, useState } from "react";
import { Platform } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export default function SocialAccountCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const { mutate: handleCallback } = api.socialAccounts.handleCallback.useMutation({
    onSuccess: (data) => {
      toast.success("Account connected");
      router.push(`/workspace/${data.stateData.workspaceId}/settings/social-accounts`);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  useEffect(() => {
    const platform = searchParams.get("platform");
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError(oauthError);
      return;
    }

    if (platform && code && state) {
      handleCallback({
        platform: platform.toUpperCase() as Platform,
        code: code,
        state: state,
      });
    }
  }, [searchParams, handleCallback]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">
            Connection Failed
          </h1>
          <p className="text-muted-foreground max-w-md">
            {error}
          </p>
          <button
            onClick={() => {
                router.push(`/`);
            }}
            className="text-primary hover:underline"
          >
            Go back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <h1 className="text-xl font-semibold">Connecting your account...</h1>
      <p className="text-muted-foreground mt-2">
        Please wait while we complete the connection.
      </p>
    </div>
  );
}