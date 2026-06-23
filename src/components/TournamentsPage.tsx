import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Calendar, Clock, Users, Award, Trophy, Sword, Gamepad2,
  ChevronRight, LoaderCircle, Swords, Target, Zap, Shield,
} from "lucide-react";
import { devlog, devwarn } from "@/lib/dev-log";
import { JsonLd } from "@/components/JsonLd";
import { eventSchema, itemListSchema, breadcrumbSchema } from "@/lib/json-ld";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

type TournamentSummary = {
  id: string;
  title: string;
  bannerUrl: string | null;
  type: "SOLO" | "DUO" | "SQUAD";
  gameMode: string;
  dateTime: string;
  registrationDeadline: string;
  maxParticipants: number;
  entryFee: number | null;
  prizePool: string | null;
  discordLink: string | null;
  serverIp: string | null;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  registrationsCount: number;
};

export default function TournamentsPage() {
  const [upcoming, setUpcoming] = useState<TournamentSummary[]>([]);
  const [live, setLive] = useState<TournamentSummary[]>([]);
  const [past, setPast] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    devlog("[TournamentsPage] Fetching tournaments...");
    fetch("/api/tournaments/public")
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const liveData = d.live ?? [];
        const upcomingData = d.upcoming ?? [];
        const pastData = d.past ?? [];
        devlog("[TournamentsPage] Loaded:", { live: liveData.length, upcoming: upcomingData.length, past: pastData.length });
        setUpcoming(upcomingData);
        setLive(liveData);
        setPast(pastData);

        [...liveData, ...upcomingData, ...pastData].forEach((t: any) => {
          trackEvent(AnalyticsEvents.VIEW_TOURNAMENT, {
            tournament_id: t.id,
            tournament_title: t.title,
            tournament_type: t.type,
            status: t.status,
          });
        });
      })
      .catch((err) => {
        devwarn("[TournamentsPage] Failed to load tournaments:", err);
        setError("Failed to load tournaments. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, []);

  const renderSection = (title: string, icon: React.ReactNode, tournaments: TournamentSummary[], emptyText: string, accentColor: string) => (
    <section className="mb-12">
      <div className={`flex items-center gap-3 mb-6 border-l-4 ${accentColor} pl-4`}>
        {icon}
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <span className="text-sm text-white/40 ml-auto">({tournaments.length})</span>
      </div>
      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-8 text-center">
          <p className="text-white/40">{emptyText}</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to="/tournaments/$id"
                params={{ id: t.id }}
                className="group block overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] transition-all duration-300 hover:border-[var(--hub-blue)] hover:shadow-[0_0_24px_rgba(62,162,255,0.12)]"
              >
                {t.bannerUrl && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={t.bannerUrl}
                      alt={t.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      t.status === "LIVE"
                        ? "bg-green-500/20 text-green-400"
                        : t.status === "UPCOMING"
                        ? "bg-[var(--hub-blue)]/20 text-[var(--hub-blue)]"
                        : "bg-white/10 text-white/40"
                    }`}>
                      {t.status}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-white/40">
                      <Users className="h-3 w-3" />
                      {t.registrationsCount}/{t.maxParticipants}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white group-hover:text-[var(--hub-blue)] transition-colors">
                    {t.title}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                      <Gamepad2 className="h-3.5 w-3.5" />
                      {t.gameMode}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sword className="h-3.5 w-3.5" />
                      {t.type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(t.dateTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(t.dateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex items-center gap-3">
                      {t.prizePool && (
                        <span className="flex items-center gap-1 text-sm font-bold text-[var(--hub-orange)]">
                          <Award className="h-4 w-4" />
                          {t.prizePool}
                        </span>
                      )}
                      {t.entryFee && t.entryFee > 0 ? (
                        <span className="text-sm text-white/40">₹{t.entryFee}</span>
                      ) : (
                        <span className="text-sm text-green-400">Free</span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[var(--hub-blue)]" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );

  const allTournaments = useMemo(() => [...live, ...upcoming, ...past], [live, upcoming, past]);

  const eventSchemas = useMemo(() => {
    return allTournaments.map((t) => eventSchema({
      id: t.id,
      name: t.title,
      description: `${t.type} ${t.gameMode} tournament on HUBMC. ${t.prizePool ? `Prize pool: ${t.prizePool}.` : ""} Entry: ${t.entryFee && t.entryFee > 0 ? `₹${t.entryFee}` : "Free"}.`,
      startDate: t.dateTime,
      status: t.status,
      type: t.type,
      maxParticipants: t.maxParticipants,
      registrationsCount: t.registrationsCount,
      entryFee: t.entryFee,
      prizePool: t.prizePool,
      image: t.bannerUrl ?? undefined,
      location: "play.hubmc.in",
    }));
  }, [allTournaments]);

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Tournaments", url: "/tournaments" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {!loading && !error && eventSchemas.length > 0 && (
        <>
          <JsonLd data={itemListSchema(eventSchemas)} />
          {eventSchemas.map((s, i) => (
            <JsonLd key={allTournaments[i]?.id ?? i} data={s} />
          ))}
        </>
      )}
      <JsonLd data={breadcrumbSchema(breadcrumbItems)} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-2">
          <Trophy className="h-8 w-8 text-[var(--hub-orange)]" />
          <h1 className="text-4xl font-black text-white">HUBMC Tournaments</h1>
        </div>
        <p className="mt-2 text-white/56 max-w-2xl">
          Compete against the best Minecraft players in HUBMC tournaments. Join PvP events, win prizes, and climb the leaderboard. Register for upcoming tournaments, check live events, and view past results.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-5">
          <Swords className="h-6 w-6 text-[var(--hub-orange)]" />
          <h3 className="mt-3 font-bold text-white">Solo, Duo & Squad</h3>
          <p className="mt-1 text-xs text-white/40">Compete alone, with a partner, or as a full squad across multiple game modes.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-5">
          <Target className="h-6 w-6 text-[var(--hub-blue)]" />
          <h3 className="mt-3 font-bold text-white">Multiple Game Modes</h3>
          <p className="mt-1 text-xs text-white/40">Bedwars, Skywars, PvP, KitPvP, UHC, and more — find your specialty.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-5">
          <Award className="h-6 w-6 text-yellow-400" />
          <h3 className="mt-3 font-bold text-white">Prize Pools</h3>
          <p className="mt-1 text-xs text-white/40">Win prizes in our competitive tournaments. Both free and paid entry events available.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-5">
          <Zap className="h-6 w-6 text-green-400" />
          <h3 className="mt-3 font-bold text-white">Live Brackets</h3>
          <p className="mt-1 text-xs text-white/40">Real-time brackets, match tracking, and leaderboards for every tournament.</p>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-6">
        <h2 className="text-lg font-bold text-white">How to Register</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--hub-blue)]/20 text-xs font-bold text-[var(--hub-blue)]">1</span>
            <div>
              <p className="text-sm font-medium text-white">Create an Account</p>
              <p className="text-xs text-white/40">Sign up on HUBMC with your name and phone number.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--hub-blue)]/20 text-xs font-bold text-[var(--hub-blue)]">2</span>
            <div>
              <p className="text-sm font-medium text-white">Choose a Tournament</p>
              <p className="text-xs text-white/40">Browse upcoming events and pick one that suits your playstyle.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--hub-blue)]/20 text-xs font-bold text-[var(--hub-blue)]">3</span>
            <div>
              <p className="text-sm font-medium text-white">Register & Play</p>
              <p className="text-xs text-white/40">Fill in your Discord details, agree to rules, and you're in. Free tournaments register instantly; paid events require Discord payment confirmation.</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-12 flex items-center justify-center py-20">
          <LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" />
        </div>
      ) : !error ? (
        <div className="mt-10">
          {live.length > 0 && renderSection(
            "Live Now",
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>,
            live,
            "No live tournaments right now.",
            "border-green-500"
          )}
          {renderSection(
            "Upcoming",
            <Calendar className="h-5 w-5 text-[var(--hub-blue)]" />,
            upcoming,
            "No upcoming tournaments. Check back soon!",
            "border-[var(--hub-blue)]"
          )}
          {renderSection(
            "Past Tournaments",
            <Clock className="h-5 w-5 text-white/40" />,
            past,
            "No past tournaments yet.",
            "border-white/20"
          )}
        </div>
      ) : null}
    </div>
  );
}
