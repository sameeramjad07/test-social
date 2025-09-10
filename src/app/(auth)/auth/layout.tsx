"use client";

import type React from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Back to Home Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 left-6 z-10"
      >
        <Link href="/">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </motion.div>

      {/* Logo in top right */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute top-6 right-6 z-10"
      >
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <img src="/promowaves.ico" alt="" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Social Manager
          </span>
        </div>
      </motion.div>

      {children}
    </div>
  );
}
