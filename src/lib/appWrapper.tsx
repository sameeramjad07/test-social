"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { usePathname } from "next/navigation";

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");

  return (
    <SessionProvider>
      <TRPCReactProvider>
        <div className="flex flex-col min-h-screen">
          {!isAuthRoute && <Navbar />}
          <main className={`flex-1 ${!isAuthRoute ? "pt-16" : ""}`}>
            {children}
          </main>
          {!isAuthRoute && <Footer />}
        </div>
        <Toaster />
      </TRPCReactProvider>
    </SessionProvider>
  );
}
