"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function CalendarRedirect() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    const storedId = localStorage.getItem("currentWorkspaceId");
    if (storedId && session.user.workspaces?.some((ws) => ws.id === storedId)) {
      router.push(`/workspace/${storedId}/calendar`);
    } else if (session.user.workspaces && session.user.workspaces.length > 0) {
      const defaultId = session.user.workspaces[0]!.id;
      localStorage.setItem("currentWorkspaceId", defaultId);
      router.push(`/workspace/${defaultId}/calendar`);
    } else {
      router.push("/workspaces");
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="ml-2 text-slate-600 dark:text-slate-400">
        Loading Calendar...
      </p>
    </div>
  );
}
