"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Mail,
  Shield,
  CreditCard,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  CheckCircle,
  Crown,
  Zap,
  Bell,
  Trash2,
  Plus,
  SettingsIcon,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    bio: "",
    website: "",
    location: "",
    timezone: "UTC",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    marketing: false,
    analytics: true,
  });

  const socialAccounts = [
    {
      platform: "Instagram",
      icon: Instagram,
      connected: true,
      username: "@yourhandle",
      followers: "12.5K",
      color: "bg-pink-500",
    },
    {
      platform: "Twitter",
      icon: Twitter,
      connected: true,
      username: "@yourhandle",
      followers: "8.2K",
      color: "bg-blue-500",
    },
    {
      platform: "Facebook",
      icon: Facebook,
      connected: false,
      username: "",
      followers: "",
      color: "bg-blue-600",
    },
    {
      platform: "LinkedIn",
      icon: Linkedin,
      connected: false,
      username: "",
      followers: "",
      color: "bg-blue-700",
    },
  ];

  const handleProfileUpdate = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialConnect = (platform: string) => {
    toast.info(`Connecting to ${platform}...`);
    // Implement OAuth flow here
  };

  const handleSocialDisconnect = (platform: string) => {
    toast.success(`Disconnected from ${platform}`);
    // Implement disconnect logic here
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion initiated");
    // Implement account deletion logic
  };

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Settings
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your account settings and preferences
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Billing
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl">
                        {session.user.name?.charAt(0) ||
                          session.user.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button variant="outline">Change Avatar</Button>
                      <p className="text-sm text-slate-500">
                        JPG, GIF or PNG. 1MB max.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            name: e.target.value,
                          })
                        }
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            email: e.target.value,
                          })
                        }
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={profileData.website}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            website: e.target.value,
                          })
                        }
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={profileData.location}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            location: e.target.value,
                          })
                        }
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={profileData.timezone}
                        onValueChange={(value) =>
                          setProfileData({ ...profileData, timezone: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="EST">Eastern Time</SelectItem>
                          <SelectItem value="PST">Pacific Time</SelectItem>
                          <SelectItem value="GMT">
                            Greenwich Mean Time
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleProfileUpdate}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isLoading ? "Updating..." : "Update Profile"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {key} Notifications
                        </p>
                        <p className="text-sm text-slate-500">
                          {key === "email" && "Receive notifications via email"}
                          {key === "push" && "Receive push notifications"}
                          {key === "marketing" && "Receive marketing updates"}
                          {key === "analytics" && "Receive analytics reports"}
                        </p>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Security
                  </CardTitle>
                  <CardDescription>
                    Manage your account security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email Verification */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Email Verification</p>
                        <p className="text-sm text-slate-500">
                          Your email address is verified
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-slate-500">
                          Add an extra layer of security
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">Enable 2FA</Button>
                  </div>

                  {/* Password Change */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Change Password</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          Current Password
                        </Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input id="new-password" type="password" />
                      </div>
                    </div>
                    <Button variant="outline">Update Password</Button>
                  </div>

                  <Separator />

                  {/* Danger Zone */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-red-600">
                      Danger Zone
                    </h3>
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-200">
                            Delete Account
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Account
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete your account and remove all
                                your data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Social Media Integrations
                  </CardTitle>
                  <CardDescription>
                    Connect and manage your social media accounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {socialAccounts.map((account, index) => (
                    <motion.div
                      key={account.platform}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 ${account.color} rounded-lg flex items-center justify-center`}
                        >
                          <account.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{account.platform}</p>
                          {account.connected ? (
                            <p className="text-sm text-slate-500">
                              {account.username} • {account.followers} followers
                            </p>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Not connected
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.connected ? (
                          <>
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-700"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleSocialDisconnect(account.platform)
                              }
                            >
                              Disconnect
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleSocialConnect(account.platform)
                            }
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-600" />
                    Current Plan
                  </CardTitle>
                  <CardDescription>
                    Manage your subscription and billing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Plan */}
                  <div className="p-6 border-2 border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                          Professional Plan
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300">
                          $49/month
                        </p>
                      </div>
                      <Badge className="bg-blue-600 text-white">
                        Current Plan
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>10 Social accounts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>200 AI-generated posts/month</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Advanced analytics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Priority support</span>
                      </div>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Usage This Month</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>AI Posts Generated</span>
                          <span>142 / 200</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: "71%" }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Connected Accounts</span>
                          <span>2 / 10</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: "20%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing Actions */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Change Plan
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      View Billing History
                    </Button>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Update Payment Method
                    </Button>
                  </div>

                  {/* Next Billing */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Next billing date</p>
                        <p className="text-sm text-slate-500">
                          February 15, 2025
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">$49.00</p>
                        <p className="text-sm text-slate-500">Auto-renewal</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
