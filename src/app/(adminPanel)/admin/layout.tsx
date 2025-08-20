// This is a Server Component - no "use client" directive
import type React from "react"
import AdminSidebar from "./admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import AdminHeader from "./admin-header"

interface AdminLayoutProps {
  children: React.ReactNode
}

// This layout component remains a Server Component
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="container py-6 mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}