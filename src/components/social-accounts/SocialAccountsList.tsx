'use client'

import { Platform } from "@prisma/client";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Instagram, 
  Facebook, 
  Linkedin, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface SocialAccountsListProps {
  workspaceId: string;
}

const platformIcons = {
  [Platform.INSTAGRAM]: Instagram,
  [Platform.FACEBOOK]: Facebook,
  [Platform.LINKEDIN]: Linkedin,
} as any;

export function SocialAccountsList({ workspaceId }: SocialAccountsListProps) {
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  
  const { data: accounts, refetch } = api.socialAccounts.list.useQuery({ 
    workspaceId 
  });
  
  const { mutate: disconnect } = api.socialAccounts.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Account disconnected");
      refetch();
    },
    onError: (error) => {
      toast.error("Disconnection failed");
    },
  });

  const { mutate: refreshToken } = api.socialAccounts.refreshToken.useMutation({
    onSuccess: () => {
      toast.success("Token refreshed");
      refetch();
    },
    onError: (error) => {
      toast.error("Refresh failed");
    },
  });

  const handleDisconnect = (accountId: string) => {
    disconnect({ accountId });
    setAccountToDelete(null);
  };

  const isTokenExpiringSoon = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 7;
  };

  if (!accounts || accounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground mb-4">
            No social media accounts connected yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Connect your social media accounts to start creating and scheduling posts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const Icon = platformIcons[account.platform];
          const isExpiringSoon = isTokenExpiringSoon(account.expiresAt);
          
          return (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {account.accountName}
                      </CardTitle>
                      <CardDescription>
                        {account.platform}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={isExpiringSoon ? "destructive" : "default"}>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {account.accountImage && (
                    <img 
                      src={account.accountImage} 
                      alt={account.accountName}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    {/* Connected {formatDistanceToNow(account.createdAt, { addSuffix: true })} */}
                  </div>
                  
                  {account.expiresAt && (
                    <div className="text-sm">
                      {isExpiringSoon ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {/* Token expires {formatDistanceToNow(account.expiresAt, { addSuffix: true })} */}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Token valid until {new Date(account.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {isExpiringSoon && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refreshToken({ accountId: account.id })}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Refresh Token
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setAccountToDelete(account.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog 
        open={!!accountToDelete} 
        onOpenChange={() => setAccountToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect this social media account? 
              You'll need to reconnect it to publish posts to this platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => accountToDelete && handleDisconnect(accountToDelete)}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}