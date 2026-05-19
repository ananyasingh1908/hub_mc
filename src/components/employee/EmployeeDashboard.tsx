import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  Trophy, Users, Megaphone, Calendar, Activity, Clock,
  UserPlus, ArrowRight, LoaderCircle,
} from "lucide-react";

type DashboardStats = {
  totalTournaments: number;
  upcomingTournaments: number;
  liveTournaments: number;
  totalRegistrations: number;
  totalPlayers: number;
  activeNotifications: number;
  recentRegistrations: Array<{ id: string; minecraftUsername: string; tournamentTitle: string; createdAt: string }>;
};

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/employee/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sections = [
    {
      title: "Tournament Management",
      description: "Create, edit, start, and end tournaments. Manage registrations.",
      icon: Trophy,
      color: "text-[var(--hub-orange)]",
      bg: "bg-[rgba(255,138,42,0.12)]",
      stats: [
        { label: "Total", value: stats?.totalTournaments ?? 0 },
        { label: "Upcoming", value: stats?.upcomingTournaments ?? 0 },
        { label: "Live Now", value: stats?.liveTournaments ?? 0 },
      ],
      link: "/employee/tournaments",
    },
    {
      title: "Registered Players",
      description: "Search, filter, and manage tournament players and registrations.",
      icon: Users,
      color: "text-[var(--hub-blue)]",
      bg: "bg-[rgba(62,162,255,0.12)]",
      stats: [
        { label: "Total Registrations", value: stats?.totalRegistrations ?? 0 },
        { label: "Total Players", value: stats?.totalPlayers ?? 0 },
      ],
      link: "/employee/players",
    },
    {
      title: "Notifications & Announcements",
      description: "Send site-wide notifications and tournament announcements.",
      icon: Megaphone,
      color: "text-purple-400",
      bg: "bg-[rgba(168,85,247,0.12)]",
      stats: [
        { label: "Active", value: stats?.activeNotifications ?? 0 },
      ],
      link: "/employee/notifications",
    },
    {
      title: "Player & Rank Management",
      description: "View profiles, assign ranks, manage bans, and moderation notes.",
      icon: Activity,
      color: "text-green-400",
      bg: "bg-[rgba(34,197,94,0.12)]",
      stats: [
        { label: "Players", value: stats?.totalPlayers ?? 0 },
      ],
      link: "/employee/players",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-black text-white">Employee Dashboard</h1>
      <p className="mt-2 text-white/56">Full tournament management, player oversight, and staff tools.</p>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
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
                  <div className="mt-4 flex flex-wrap gap-3">
                    {section.stats.map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-white/5 px-3 py-1.5">
                        <span className="text-lg font-black text-white">{stat.value}</span>
                        <span className="ml-1.5 text-xs text-white/40">{stat.label}</span>
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
            <Clock className="h-5 w-5 text-[var(--hub-blue)]" />
            Recent Registrations
          </h2>
          {stats?.recentRegistrations && stats.recentRegistrations.length > 0 ? (
            <div className="mt-4 space-y-2">
              {stats.recentRegistrations.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-2.5">
                  <div>
                    <span className="text-sm font-medium text-white">{r.minecraftUsername}</span>
                    <span className="ml-2 text-xs text-white/40">{r.tournamentTitle}</span>
                  </div>
                  <span className="text-[11px] text-white/30">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-white/30">No recent registrations.</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--hub-orange)]" />
            Quick Actions
          </h2>
          <div className="mt-4 space-y-3">
            <button onClick={() => navigate({ to: "/employee/tournaments" })} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08]">
              <Trophy className="h-4 w-4 text-[var(--hub-orange)]" /> Manage Tournaments
            </button>
            <button onClick={() => navigate({ to: "/employee/players" })} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08]">
              <Users className="h-4 w-4 text-[var(--hub-blue)]" /> Search Players
            </button>
            <button onClick={() => navigate({ to: "/employee/notifications" })} className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08]">
              <Megaphone className="h-4 w-4 text-purple-400" /> Send Notification
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
