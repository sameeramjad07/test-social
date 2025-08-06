import { api } from "@/trpc/react";
import { Platform } from "@prisma/client";
import { toast } from "sonner";

export function useSocialAccounts(workspaceId: string) {
  const utils = api.useContext();
  
  const { data: accounts, isLoading } = api.socialAccounts.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  const connectAccount = api.socialAccounts.getAuthUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast.error("Connection failed");
    },
  });

  const disconnectAccount = api.socialAccounts.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Account disconnected");
      utils.socialAccounts.list.invalidate({ workspaceId });
    },
    onError: (error) => {
      toast.error("Disconnection failed");
    },
  });

  const refreshToken = api.socialAccounts.refreshToken.useMutation({
    onSuccess: () => {
      toast.success("Token refreshed");
      utils.socialAccounts.list.invalidate({ workspaceId });
    },
    onError: (error) => {
      toast.error("Refresh failed");
    },
  });

  const getConnectedPlatforms = (): Platform[] => {
    if (!accounts) return [];
    return accounts.map(account => account.platform);
  };

  const isAccountConnected = (platform: Platform): boolean => {
    if (!accounts) return false;
    return accounts.some(account => account.platform === platform);
  };

  return {
    accounts,
    isLoading,
    connectAccount: (platform: Platform) => 
      connectAccount.mutate({ platform, workspaceId }),
    disconnectAccount: (accountId: string) => 
      disconnectAccount.mutate({ accountId }),
    refreshToken: (accountId: string) => 
      refreshToken.mutate({ accountId }),
    getConnectedPlatforms,
    isAccountConnected,
  };
}