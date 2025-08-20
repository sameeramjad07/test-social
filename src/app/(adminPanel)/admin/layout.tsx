import type React from "react"
import AdminSidebar from "./admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import AdminHeader from "./admin-header"
import { getUserServerSide } from "@/server/auth/helpers"
import { redirect } from "next/navigation"

interface AdminLayoutProps {
  children: React.ReactNode
}
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getUserServerSide()
  if (!user?.isSuperAdmin) {
    redirect('/unauthorized')
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar user={user} />
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