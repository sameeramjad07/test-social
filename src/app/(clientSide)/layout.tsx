import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main
        className={`flex-1 bg-gradient-to-br from-slate-50 to-slate-100 px-4 pt-16`}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
