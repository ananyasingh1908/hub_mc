import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  Trophy, Users, UserCog, Megaphone, Shield,
  ArrowRight, BarChart3,
} from "lucide-react";

type PlatformStats = {
  tournaments: { total: number; upcoming: number; live: number; completed: number };
  registrations: number;
  customers: number;
  employees: { total: number; active: number };
  orders: number;
  revenue: number;
  openTickets: number;
  activeNotifications: number;
  activeBans: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/admin/platform/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      title: "Tournament Control",
      description: "Full tournament lifecycle management. Create, monitor start/end, view all registrations.",
      icon: Trophy,
      color: "text-[var(--hub-orange)]",
      bg: "bg-[rgba(255,138,42,0.12)]",
      stats: [
        { label: "Total", value: stats?.tournaments.total ?? 0 },
        { label: "Live", value: stats?.tournaments.live ?? 0 },
        { label: "Upcoming", value: stats?.tournaments.upcoming ?? 0 },
        { label: "Completed", value: stats?.tournaments.completed ?? 0 },
      ],
      link: "/admin/tournaments",
    },
    {
      title: "Players & Ranks",
      description: "View all players, ranks, bans, tournament history, and purchases.",
      icon: Users,
      color: "text-[var(--hub-blue)]",
      bg: "bg-[rgba(62,162,255,0.12)]",
      stats: [
        { label: "Total Players", value: stats?.customers ?? 0 },
        { label: "Active Bans", value: stats?.activeBans ?? 0 },
        { label: "Registrations", value: stats?.registrations ?? 0 },
      ],
      link: "/admin/players",
    },
    {
      title: "Employee Monitor",
      description: "Track all employee actions, permission control, suspend/disable employees.",
      icon: UserCog,
      color: "text-purple-400",
      bg: "bg-[rgba(168,85,247,0.12)]",
      stats: [
        { label: "Total", value: stats?.employees.total ?? 0 },
        { label: "Active", value: stats?.employees.active ?? 0 },
      ],
      link: "/admin/employees-monitor",
    },
    {
      title: "Announcements & Notifications",
      description: "Send global announcements, tournament alerts, and maintenance notifications.",
      icon: Megaphone,
      color: "text-green-400",
      bg: "bg-[rgba(34,197,94,0.12)]",
      stats: [
        { label: "Active", value: stats?.activeNotifications ?? 0 },
      ],
      link: "/admin/notifications",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Super Admin Dashboard</h1>
          <p className="mt-2 text-white/56">Full platform monitoring — tournaments, players, employees, and logs.</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]" />)}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <button
                  onClick={() => navigate({ to: section.link as any })}
                  className="group w-full text-left rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6 transition-all duration-300 hover:border-[var(--hub-blue)]/30 hover:shadow-[0_0_24px_rgba(62,162,255,0.08)]"
                >
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl ${section.bg} p-3 ${section.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/20 transition-transform group-hover:translate-x-1 group-hover:text-[var(--hub-blue)]" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-white">{section.title}</h2>
                  <p className="mt-1 text-sm text-white/50">{section.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.stats.map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-white/5 px-3 py-1.5">
                        <span className="text-base font-black text-white">{stat.value}</span>
                        <span className="ml-1 text-[10px] text-white/40">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--hub-blue)]" />
            Platform Overview
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-2xl font-black text-white">₹{Number(stats?.revenue ?? 0).toLocaleString("en-IN")}</p>
              <p className="text-xs text-white/40 mt-1">Total Revenue</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-2xl font-black text-white">{stats?.orders ?? 0}</p>
              <p className="text-xs text-white/40 mt-1">Total Orders</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-2xl font-black text-white">{stats?.customers ?? 0}</p>
              <p className="text-xs text-white/40 mt-1">Registered Players</p>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-2xl font-black text-white">{stats?.registrations ?? 0}</p>
              <p className="text-xs text-white/40 mt-1">Tournament Registrations</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--hub-orange)]" />
            Quick Actions
          </h2>
          <div className="mt-4 space-y-3">
            <button onClick={() => navigate({ to: "/admin/tournaments" })} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08]">
              <Trophy className="h-4 w-4 text-[var(--hub-orange)]" /> Tournament Control
            </button>
            <button onClick={() => navigate({ to: "/admin/players" })} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08]">
              <Users className="h-4 w-4 text-[var(--hub-blue)]" /> Browse Players
            </button>
            <button onClick={() => navigate({ to: "/admin/employees-monitor" })} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08]">
              <UserCog className="h-4 w-4 text-purple-400" /> Employee Monitor
            </button>
            <button onClick={() => navigate({ to: "/admin/notifications" })} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08]">
              <Megaphone className="h-4 w-4 text-green-400" /> Send Notification
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
