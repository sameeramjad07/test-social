import { Platform } from "@prisma/client";
import { ConnectAccountButton } from "@/components/social-accounts/ConnectAccountButton";
import { SocialAccountsList } from "@/components/social-accounts/SocialAccountsList";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SocialAccountsPage() {
  const  workspaceId  = "cmdyj0qaz003f5d723h6lgisl"

  if (!workspaceId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Social Media Accounts</h1>
        <p className="text-muted-foreground mt-2">
          Connect and manage your social media accounts to publish content across platforms.
        </p>
      </div>

      <Tabs defaultValue="connected" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connected">Connected Accounts</TabsTrigger>
          <TabsTrigger value="add">Add New Account</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="space-y-4">
          <SocialAccountsList workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connect New Account</CardTitle>
              <CardDescription>
                Choose a platform to connect. You'll be redirected to authenticate 
                with your social media account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <ConnectAccountButton 
                  platform={Platform.INSTAGRAM} 
                  workspaceId={workspaceId}
                />
                <ConnectAccountButton 
                  platform={Platform.FACEBOOK} 
                  workspaceId={workspaceId}
                />
                <ConnectAccountButton 
                  platform={Platform.LINKEDIN} 
                  workspaceId={workspaceId}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Instagram</h4>
                <p className="text-sm text-muted-foreground">
                  Requires a Facebook Business account and Instagram Business/Creator profile.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Facebook</h4>
                <p className="text-sm text-muted-foreground">
                  You must be an admin of the Facebook Page you want to connect.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">LinkedIn</h4>
                <p className="text-sm text-muted-foreground">
                  Connect your personal LinkedIn profile to share posts.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
