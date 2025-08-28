"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  Brain,
  Calendar,
  Settings,
  ChevronUp,
  User2,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@prisma/client";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Workspaces",
    href: "/admin/workspaces",
    icon: Building2,
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "AI Usage Logs",
    href: "/admin/ai-logs",
    icon: Brain,
  },
  {
    name: "Posts & Scheduling",
    href: "/admin/posts",
    icon: Calendar,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export default function AdminSidebar({ user }: { user: User }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="flex items-center gap-2 data-[state=collapsed]:justify-center"
              >
                <a href="/admin">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
                    <Brain className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none transition-opacity duration-200 ease-in-out data-[state=collapsed]:opacity-0 data-[state=collapsed]:w-0 data-[state=collapsed]:overflow-hidden">
                    <span className="font-semibold">Super Admin</span>
                    <span className="text-xs text-muted-foreground">
                      Control Panel
                    </span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => router.push(item.href)}
                          isActive={pathname === item.href}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="flex items-center gap-4 data-[state=collapsed]:block"
                      >
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=collapsed]:justify-center"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
                      <AvatarFallback>
                        {user.name?.slice(0, 2)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 leading-none transition-opacity duration-200 ease-in-out data-[state=collapsed]:opacity-0 data-[state=collapsed]:w-0 data-[state=collapsed]:overflow-hidden">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto h-4 w-4 data-[state=collapsed]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem
                    onClick={() => router.push("/admin/profile")}
                  >
                    <User2 className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/admin/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/logout")}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}
