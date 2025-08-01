import "@/styles/globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AppWrapper } from "@/lib/appWrapper";

export const metadata: Metadata = {
  title: "Social Manager",
  description: "AI-powered social media management platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <AppWrapper>{children}</AppWrapper>
      </body>
    </html>
  );
}
