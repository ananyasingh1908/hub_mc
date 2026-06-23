import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingCart, HeadphonesIcon, LogOut,
  Menu, X, ChevronRight, Store, LoaderCircle, Trophy, Megaphone,
  Users, MessageSquare,
} from "lucide-react";
import { useEmployeeSession, beginEmployeeSignOut, useInvalidateEmployeeSession } from "@/lib/auth/client";

const navItems = [
  { path: "/employee", label: "Dashboard", icon: LayoutDashboard },
  { path: "/employee/tournaments", label: "Tournaments", icon: Trophy },
  { path: "/employee/players", label: "Players", icon: Users },
  { path: "/employee/notifications", label: "Notifications", icon: Megaphone },
  { path: "/employee/products", label: "Products", icon: Package },
  { path: "/employee/orders", label: "Orders", icon: ShoppingCart },
  { path: "/employee/support", label: "Support", icon: HeadphonesIcon },
  { path: "/employee/forum", label: "Forum", icon: MessageSquare },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isPending } = useEmployeeSession();
  const invalidate = useInvalidateEmployeeSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isPending && (!session || !session.authenticated)) {
      navigate({ to: "/employee-login", replace: true });
    }
  }, [session, isPending, navigate]);

  const handleLogout = async () => {
    await beginEmployeeSignOut();
    await invalidate();
    await navigate({ to: "/employee-login" });
  };

  if (isPending || !session?.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex items-center gap-3 text-white/50">
          <LoaderCircle className="h-5 w-5 animate-spin text-[var(--hub-blue)]" />
          <span>Verifying access...</span>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 text-[var(--hub-orange)]" />
          <span className="text-sm font-black tracking-wider uppercase">HUBMC Staff</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { navigate({ to: item.path }); setSidebarOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-[rgba(62,162,255,0.12)] text-[var(--hub-blue)]"
                  : "text-white/60 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-[var(--hub-blue)]" />}
            </button>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-400/70 transition-all hover:bg-[rgba(239,68,68,0.1)] hover:text-red-400"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 lg:border-r lg:border-white/10 lg:bg-[rgba(8,8,8,0.98)]">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed left-0 top-0 z-50 h-full w-64 border-r border-white/10 bg-[rgba(8,8,8,0.98)] backdrop-blur-xl lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-white/10 bg-[rgba(8,8,8,0.95)] backdrop-blur-xl px-5">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white/60 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-white/50">Employee</span>
            <span className="font-semibold text-white">{session?.displayName ?? "Staff"}</span>
          </div>
        </header>
        <main className="flex-1 w-full max-w-7xl mx-auto p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
