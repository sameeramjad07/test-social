"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"

const navigation = [
  { name: "Dashboard", href: "/admin" },
  { name: "Workspaces", href: "/admin/workspaces" },
  { name: "Users", href: "/admin/users" },
  { name: "AI Usage Logs", href: "/admin/ai-logs" },
  { name: "Posts & Scheduling", href: "/admin/posts" },
  { name: "Settings", href: "/admin/settings" },
]

export default function AdminHeader() {
  const pathname = usePathname()
  
  // Get current page title
  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard"
    const item = navigation.find(nav => nav.href === pathname)
    return item?.name || "Dashboard"
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex flex-1 items-center gap-2">
        <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
      </div>
    </header>
  )
}