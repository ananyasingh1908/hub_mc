import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Calendar, Clock, Users, Award, Trophy, Sword, Gamepad2,
  Server, ExternalLink, ArrowLeft, CheckCircle, AlertCircle,
  LoaderCircle, MessageSquare, User, ChevronDown, ChevronUp,
  Swords, Medal, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthSession } from "@/lib/auth/client";
import { devlog, devwarn } from "@/lib/dev-log";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { JsonLd } from "@/components/JsonLd";
import { eventSchema, breadcrumbSchema } from "@/lib/json-ld";

type TournamentDetail = {
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
  rules: string;
  serverIp: string | null;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  registrationsCount: number;
};

type RegistrationInfo = {
  id: string;
  minecraftUsername: string;
  discordUsername: string;
  teamName: string | null;
  email: string;
  region: string;
  createdAt: string;
};

type BracketEntry = {
  id: string;
  minecraftUsername: string;
  teamName: string | null;
  teamMembers: string | null;
  discordUsername: string;
  createdAt: string;
};

type MatchPlayer = { id: string; minecraftUsername: string; teamName: string | null };
type MatchEntry = {
  id: string; round: number; matchIndex: number;
  player1: MatchPlayer | null; player2: MatchPlayer | null;
  winner: MatchPlayer | null;
  score1: number | null; score2: number | null;
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
};

type LeaderboardEntry = {
  registrationId: string; username: string; teamName: string | null;
  wins: number; losses: number; matches: number;
};

export default function TournamentDetailPage({ tournamentId }: { tournamentId: string }) {
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [userRegistration, setUserRegistration] = useState<RegistrationInfo | null>(null);
  const [brackets, setBrackets] = useState<BracketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrackets, setShowBrackets] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "brackets" | "leaderboard" | "rules">("overview");

  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const [form, setForm] = useState({
    discordUsername: "",
    discordId: "",
    teamName: "",
    teamMembers: "",
    email: "",
    region: "",
    age: "",
    agreedToRules: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  const { data: session } = useAuthSession();

  useEffect(() => {
    devlog("[TournamentDetailPage] Loading tournament:", tournamentId);
    fetch(`/api/tournaments/detail?id=${tournamentId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        devlog("[TournamentDetailPage] Loaded:", d.tournament?.title, "registered:", !!d.userRegistration);
        setTournament(d.tournament);
        setUserRegistration(d.userRegistration);

        if (d.tournament) {
          trackEvent(AnalyticsEvents.VIEW_TOURNAMENT, {
            tournament_id: d.tournament.id,
            tournament_title: d.tournament.title,
            tournament_type: d.tournament.type,
          });
        }
      })
      .catch((err) => {
        devwarn("[TournamentDetailPage] Failed to load tournament:", err);
        setTournament(null);
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  useEffect(() => {
    if (userRegistration) {
      setForm((prev) => ({
        ...prev,
        discordUsername: userRegistration.discordUsername,
        discordId: "",
        email: userRegistration.email,
        region: userRegistration.region,
      }));
    }
  }, [userRegistration]);

  const loadBrackets = async () => {
    try {
      const res = await fetch(`/api/tournaments/brackets?tournamentId=${tournamentId}`);
      const d = await res.json();
      if (d.registrations) setBrackets(d.registrations);
    } catch {}
  };

  const loadMatches = async () => {
    setMatchesLoading(true);
    try {
      const res = await fetch(`/api/tournaments/matches?tournamentId=${tournamentId}`);
      const d = await res.json();
      if (d.matches) setMatches(d.matches);
    } catch {}
    setMatchesLoading(false);
  };

  const loadLeaderboard = async () => {
    try {
      const res = await fetch(`/api/tournaments/leaderboard?tournamentId=${tournamentId}`);
      const d = await res.json();
      if (d.leaderboard) setLeaderboard(d.leaderboard);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === "brackets" && matches.length === 0) loadMatches();
    if (activeTab === "leaderboard" && leaderboard.length === 0) loadLeaderboard();
  }, [activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.minecraftUsername) {
      toast.error("Please log in with your Minecraft account first.");
      return;
    }
    if (!form.agreedToRules) {
      toast.error("You must agree to the tournament rules.");
      return;
    }
    setSubmitting(true);
    devlog("[TournamentDetailPage] Submitting registration for tournament:", tournamentId);
    try {
      const res = await fetch("/api/tournaments/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tournamentId,
          discordUsername: form.discordUsername,
          discordId: form.discordId || undefined,
          teamName: form.teamName || undefined,
          teamMembers: form.teamMembers || undefined,
          email: form.email,
          region: form.region,
          age: form.age ? parseInt(form.age) : undefined,
          agreedToRules: true,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        trackEvent(AnalyticsEvents.TOURNAMENT_REGISTRATION, {
          tournament_id: tournamentId,
          tournament_title: tournament?.title ?? "",
        });
        toast.success("Successfully registered for the tournament!");
        const full = await fetch(`/api/tournaments/detail?id=${tournamentId}`).then((r) => r.json());
        if (full.userRegistration) setUserRegistration(full.userRegistration);
        loadBrackets();
      } else {
        devwarn("[TournamentDetailPage] Registration rejected:", d.error);
        toast.error(d.error || "Registration failed.");
      }
    } catch (err) {
      devwarn("[TournamentDetailPage] Registration error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoaderCircle className="h-10 w-10 animate-spin text-[var(--hub-blue)]" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-2xl font-bold text-white">Tournament Not Found</h2>
        <p className="mt-2 text-white/50">This tournament does not exist or has been removed.</p>
        <Link to="/tournaments" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" /> Back to Tournaments
        </Link>
      </div>
    );
  }

  const isOpen = tournament.status === "UPCOMING" && (!tournament.registrationDeadline || new Date() < new Date(tournament.registrationDeadline));
  const slotsLeft = tournament.maxParticipants - tournament.registrationsCount;
  const isTeamTournament = tournament.type === "DUO" || tournament.type === "SQUAD";

  const regions = [
    "Asia", "Europe", "North America", "South America", "Africa", "Australia/Oceania",
  ];

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Trophy },
    { id: "brackets" as const, label: "Brackets", icon: Swords },
    { id: "leaderboard" as const, label: "Leaderboard", icon: Medal },
    { id: "rules" as const, label: "Rules", icon: BookOpen },
  ];

  const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  const eventJsonLd = tournament ? eventSchema({
    id: tournament.id,
    name: tournament.title,
    description: `${tournament.type} ${tournament.gameMode} tournament on HUBMC. ${tournament.rules?.slice(0, 160) || ""}`,
    startDate: tournament.dateTime,
    status: tournament.status,
    type: tournament.type,
    maxParticipants: tournament.maxParticipants,
    registrationsCount: tournament.registrationsCount,
    entryFee: tournament.entryFee,
    prizePool: tournament.prizePool,
    image: tournament.bannerUrl ?? undefined,
    location: tournament.serverIp || "play.hubmc.in",
  }) : null;

  const detailBreadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Tournaments", url: "/tournaments" },
    { name: tournament?.title ?? "Tournament", url: `/tournaments/${tournamentId}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {eventJsonLd && <JsonLd data={eventJsonLd} />}
      <JsonLd data={breadcrumbSchema(detailBreadcrumbItems)} />
      <Link to="/tournaments" className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All Tournaments
      </Link>

      {tournament.bannerUrl && (
        <div className="mt-4 aspect-[21/9] w-full overflow-hidden rounded-2xl">
          <img src={tournament.bannerUrl} alt={tournament.title} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
          tournament.status === "LIVE"
            ? "bg-green-500/20 text-green-400"
            : tournament.status === "UPCOMING"
            ? "bg-[var(--hub-blue)]/20 text-[var(--hub-blue)]"
            : "bg-white/10 text-white/40"
        }`}>
          {tournament.status}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
          <Gamepad2 className="h-3.5 w-3.5" />{tournament.gameMode}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
          <Sword className="h-3.5 w-3.5" />{tournament.type}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--hub-orange)]/10 px-3 py-1 text-xs text-[var(--hub-orange)]">
          <Users className="h-3.5 w-3.5" />{tournament.registrationsCount}/{tournament.maxParticipants} Players
        </span>
        {tournament.prizePool && (
          <span className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-3 py-1 text-xs text-yellow-400">
            <Award className="h-3.5 w-3.5" />{tournament.prizePool}
          </span>
        )}
      </div>

      <h1 className="mt-4 text-3xl font-black text-white">{tournament.title}</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-3">
          <Calendar className="h-4 w-4 text-[var(--hub-blue)]" />
          <p className="mt-1 text-xs text-white/40">Date</p>
          <p className="text-sm font-medium text-white">
            {new Date(tournament.dateTime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-3">
          <Clock className="h-4 w-4 text-[var(--hub-blue)]" />
          <p className="mt-1 text-xs text-white/40">Time</p>
          <p className="text-sm font-medium text-white">
            {new Date(tournament.dateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-3">
          <Users className="h-4 w-4 text-[var(--hub-orange)]" />
          <p className="mt-1 text-xs text-white/40">Players</p>
          <p className="text-sm font-medium text-white">
            {tournament.registrationsCount}/{tournament.maxParticipants}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-3">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <p className="mt-1 text-xs text-white/40">Entry Fee</p>
          <p className={`text-sm font-medium ${tournament.entryFee && tournament.entryFee > 0 ? "text-white" : "text-green-400"}`}>
            {tournament.entryFee && tournament.entryFee > 0 ? `₹${tournament.entryFee}` : "Free"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--hub-orange)] text-black shadow-[0_0_12px_rgba(255,138,42,0.2)]"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-6">
                <h3 className="text-lg font-bold text-white">About This Tournament</h3>
                <p className="mt-3 text-sm text-white/60 leading-relaxed">
                  {tournament.type === "SOLO" ? "Solo" : tournament.type === "DUO" ? "Duo" : "Squad"} {tournament.gameMode} tournament.
                  {tournament.status === "LIVE" && " The battle is currently underway!"}
                  {tournament.status === "UPCOMING" && " Get ready to compete!"}
                  {tournament.status === "COMPLETED" && " This tournament has concluded. Check the brackets and leaderboard for results."}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="text-2xl font-black text-[var(--hub-orange)]">{tournament.registrationsCount}</p>
                    <p className="text-xs text-white/40 mt-0.5">Participants</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="text-2xl font-black text-green-400">
                      {matches.filter((m) => m.status === "COMPLETED").length}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">Matches Played</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3 text-center">
                    <p className="text-2xl font-black text-yellow-400">
                      {tournament.prizePool || "TBD"}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">Prize Pool</p>
                  </div>
                </div>
              </div>

              {(tournament.serverIp || tournament.discordLink) && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {tournament.serverIp && (
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] px-4 py-2.5">
                      <Server className="h-4 w-4 text-[var(--hub-blue)]" />
                      <span className="text-sm text-white/60">Server IP:</span>
                      <code className="text-sm font-bold text-white">{tournament.serverIp}</code>
                    </div>
                  )}
                  {tournament.discordLink && (
                    <a
                      href={tournament.discordLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2]/20 px-4 py-2.5 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/30"
                    >
                      <MessageSquare className="h-4 w-4" /> Join Discord <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => { setShowBrackets(!showBrackets); if (!showBrackets && brackets.length === 0) loadBrackets(); }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Users className="h-4 w-4" />
                  Participants ({tournament.registrationsCount})
                  {showBrackets ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showBrackets && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)]">
                    {brackets.length === 0 ? (
                      <div className="p-6 text-center text-sm text-white/40">Loading participants...</div>
                    ) : (
                      <div className="divide-y divide-white/10">
                        {brackets.map((entry, i) => (
                          <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-white/20 w-5">{i + 1}</span>
                              <User className="h-4 w-4 text-[var(--hub-blue)]" />
                              <div>
                                <span className="text-sm font-medium text-white">{entry.minecraftUsername}</span>
                                {entry.teamName && <span className="ml-2 text-xs text-white/40">[{entry.teamName}]</span>}
                              </div>
                            </div>
                            <span className="text-xs text-white/30">{entry.discordUsername}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Brackets Tab */}
          {activeTab === "brackets" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Tournament Bracket</h3>
                {matches.length > 0 && (
                  <span className="text-xs text-white/40">{matches.length} matches across {maxRound} round{maxRound > 1 ? "s" : ""}</span>
                )}
              </div>

              {matchesLoading ? (
                <div className="mt-6 flex justify-center py-12">
                  <LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" />
                </div>
              ) : matches.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
                  <Swords className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-3 text-white/40">No bracket matches have been created yet.</p>
                  <p className="mt-1 text-xs text-white/20">Check back once the tournament starts.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-8">
                  {rounds.map((round) => {
                    const roundMatches = matches.filter((m) => m.round === round);
                    return (
                      <div key={round}>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-bold text-white/80">
                            {round === 1 ? "Round 1" : round === maxRound ? "Final" : `Round ${round}`}
                          </h4>
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">{roundMatches.length} match{roundMatches.length > 1 ? "es" : ""}</span>
                        </div>
                        <div className="grid gap-3">
                          {roundMatches.map((match) => {
                            const p1Won = match.winner && match.player1 && match.winner.id === match.player1.id;
                            const p2Won = match.winner && match.player2 && match.winner.id === match.player2.id;
                            return (
                              <div key={match.id} className="rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] overflow-hidden">
                                <div className={`flex items-center justify-between px-4 py-2.5 ${match.status === "COMPLETED" ? (match.winner ? "border-l-2 border-green-500" : "border-l-2 border-red-500/50") : match.status === "LIVE" ? "border-l-2 border-yellow-500" : "border-l-2 border-white/10"}`}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                      <span className={`text-sm font-medium ${p1Won ? "text-green-400" : match.status === "COMPLETED" ? "text-white/40" : "text-white"}`}>
                                        {match.player1 ? (
                                          <>{match.player1.minecraftUsername}{match.player1.teamName ? <span className="text-white/30 ml-1">[{match.player1.teamName}]</span> : null}</>
                                        ) : (
                                          <span className="text-white/20 italic">TBD</span>
                                        )}
                                      </span>
                                      <span className="text-xs text-white/30">vs</span>
                                      <span className={`text-sm font-medium ${p2Won ? "text-green-400" : match.status === "COMPLETED" ? "text-white/40" : "text-white"}`}>
                                        {match.player2 ? (
                                          <>{match.player2.minecraftUsername}{match.player2.teamName ? <span className="text-white/30 ml-1">[{match.player2.teamName}]</span> : null}</>
                                        ) : (
                                          <span className="text-white/20 italic">TBD</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0 ml-4">
                                    {(match.score1 !== null || match.score2 !== null) && (
                                      <span className="text-sm font-bold text-white">
                                        {match.score1} - {match.score2}
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                      match.status === "COMPLETED" ? "bg-green-500/15 text-green-400" :
                                      match.status === "LIVE" ? "bg-yellow-500/15 text-yellow-400" :
                                      "bg-white/5 text-white/30"
                                    }`}>{match.status}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {matches.some((m) => m.status === "COMPLETED" && !m.winner) && (
                    <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4 text-center">
                      <p className="text-sm text-yellow-400/80">Some matches need winners declared. Staff can update match results.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Leaderboard</h3>
                {leaderboard.length > 0 && (
                  <span className="text-xs text-white/40">{leaderboard.filter((e) => e.wins > 0 || e.losses > 0).length} players with match history</span>
                )}
              </div>

              {leaderboard.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
                  <Medal className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-3 text-white/40">No match results yet.</p>
                  <p className="mt-1 text-xs text-white/20">Leaderboard will populate once matches are played.</p>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                    <Medal className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs font-medium text-white/50">Standings</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {leaderboard.map((entry, i) => {
                      const medal = i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-white/20";
                      return (
                        <div key={entry.registrationId} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02]">
                          <span className={`w-6 text-center text-sm font-black ${medal}`}>{i + 1}</span>
                          <User className="h-4 w-4 text-[var(--hub-blue)] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-white">{entry.username}</span>
                            {entry.teamName && <span className="ml-2 text-xs text-white/40">[{entry.teamName}]</span>}
                          </div>
                          <div className="flex items-center gap-4 text-xs shrink-0">
                            <span className="text-green-400">{entry.wins}W</span>
                            <span className="text-red-400">{entry.losses}L</span>
                            <span className={`font-bold ${entry.wins > entry.losses ? "text-green-400" : entry.wins < entry.losses ? "text-red-400" : "text-white/50"}`}>
                              {entry.matches > 0 ? `${Math.round((entry.wins / entry.matches) * 100)}%` : "-"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Rules Tab */}
          {activeTab === "rules" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-6">
                <h3 className="text-lg font-bold text-white">Tournament Rules</h3>
                <div className="mt-4 whitespace-pre-wrap text-sm text-white/60 leading-relaxed">
                  {tournament.rules || "No specific rules have been set for this tournament."}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right sidebar - Registration / Status */}
        <div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="sticky top-24 space-y-4"
          >
            {/* Participant Count & Prize Pool Summary Card */}
            <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="h-4 w-4 text-[var(--hub-orange)]" />
                    <span className="text-2xl font-black text-white">{tournament.registrationsCount}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">Registered</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span className="text-2xl font-black text-yellow-400">{tournament.prizePool || "—"}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">Prize Pool</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Max Slots</span>
                  <span className="text-white/60 font-medium">{tournament.maxParticipants}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--hub-orange)] to-yellow-500 transition-all"
                    style={{ width: `${Math.min(100, (tournament.registrationsCount / tournament.maxParticipants) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Registration / Status Card */}
            {userRegistration ? (
              <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                  <div>
                    <h3 className="font-bold text-white">Registered!</h3>
                    <p className="text-xs text-white/50">You are signed up for this tournament.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/60">
                  <p>Discord: {userRegistration.discordUsername}</p>
                  <p>Email: {userRegistration.email}</p>
                  <p>Region: {userRegistration.region}</p>
                </div>
              </div>
            ) : isOpen ? (
              <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <div className="flex items-center gap-2">
                  {slotsLeft > 0 ? (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-400 uppercase">Open</span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase">Full</span>
                  )}
                  <h3 className="text-lg font-bold text-white">Register Now</h3>
                </div>
                {slotsLeft > 0 ? (
                  <p className="mt-1 text-sm text-[var(--hub-orange)]">
                    {slotsLeft} slot{slotsLeft !== 1 ? "s" : ""} remaining
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-red-400">Tournament is full!</p>
                )}

                {!session?.user?.minecraftUsername ? (
                  <div className="mt-4 rounded-xl bg-white/5 p-4 text-center">
                    <AlertCircle className="mx-auto h-6 w-6 text-[var(--hub-orange)]" />
                    <p className="mt-2 text-sm text-white/60">
                      Please <Link to="/login" className="text-[var(--hub-blue)] underline">log in</Link> with your Minecraft account to register.
                    </p>
                  </div>
                ) : slotsLeft > 0 ? (
                  <form onSubmit={handleRegister} className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-white/50">Your Minecraft Username</label>
                      <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        <User className="h-4 w-4 text-[var(--hub-blue)]" />
                        <span className="text-sm text-white">{session.user.minecraftUsername}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50">Discord Username *</label>
                      <input
                        type="text"
                        name="discordUsername"
                        value={form.discordUsername}
                        onChange={handleInputChange}
                        required
                        placeholder="username#0000"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--hub-blue)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50">Discord ID (optional)</label>
                      <input
                        type="text"
                        name="discordId"
                        value={form.discordId}
                        onChange={handleInputChange}
                        placeholder="123456789012345678"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--hub-blue)]"
                      />
                    </div>
                    {isTeamTournament && (
                      <>
                        <div>
                          <label className="text-xs font-medium text-white/50">Team Name {tournament.type === "SQUAD" ? "(required)" : ""}</label>
                          <input
                            type="text"
                            name="teamName"
                            value={form.teamName}
                            onChange={handleInputChange}
                            required={tournament.type === "SQUAD"}
                            placeholder={tournament.type === "SQUAD" ? "Enter your squad name" : "Optional team name"}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--hub-blue)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-white/50">
                            Team Members {tournament.type === "SQUAD" ? "(comma separated usernames)" : "(optional)"}
                          </label>
                          <input
                            type="text"
                            name="teamMembers"
                            value={form.teamMembers}
                            onChange={handleInputChange}
                            placeholder="Player1, Player2, Player3"
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--hub-blue)]"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="text-xs font-medium text-white/50">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleInputChange}
                        required
                        placeholder="you@example.com"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--hub-blue)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50">Region *</label>
                      <select
                        name="region"
                        value={form.region}
                        onChange={handleInputChange}
                        required
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[var(--hub-blue)]"
                      >
                        <option value="">Select your region</option>
                        {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-white/50">Age (optional)</label>
                      <input
                        type="number"
                        name="age"
                        value={form.age}
                        onChange={handleInputChange}
                        min="5"
                        max="120"
                        placeholder="Your age"
                        className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--hub-blue)]"
                      />
                    </div>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        name="agreedToRules"
                        checked={form.agreedToRules}
                        onChange={handleInputChange}
                        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-[var(--hub-blue)]"
                      />
                      <span className="text-xs text-white/50">
                        I have read and agree to the tournament rules *
                      </span>
                    </label>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-[var(--hub-orange)] px-4 py-3 text-sm font-bold text-black transition-all hover:bg-[var(--hub-orange)]/90 hover:shadow-[0_0_20px_rgba(255,138,42,0.35)] disabled:opacity-50"
                    >
                      {submitting ? (
                        <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                      ) : (
                        "Register for Tournament"
                      )}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6 text-center">
                {tournament.status === "LIVE" ? (
                  <>
                    <AlertCircle className="mx-auto h-8 w-8 text-green-400" />
                    <h3 className="mt-3 font-bold text-white">Tournament is Live!</h3>
                    <p className="mt-1 text-sm text-white/50">Registration is closed.</p>
                    {tournament.serverIp && (
                      <div className="mt-4 rounded-xl bg-white/5 px-4 py-3">
                        <p className="text-xs text-white/40">Server IP</p>
                        <code className="text-sm font-bold text-[var(--hub-blue)]">{tournament.serverIp}</code>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Clock className="mx-auto h-8 w-8 text-white/30" />
                    <h3 className="mt-3 font-bold text-white">Registration Closed</h3>
                    <p className="mt-1 text-sm text-white/50">This tournament has ended or registration is no longer open.</p>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
