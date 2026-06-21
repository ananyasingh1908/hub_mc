import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Plus, Pencil, Trash2, Users, Calendar, Gamepad2,
  Sword, LoaderCircle, X, Award, Play, StopCircle, Search,
  Download, Megaphone, ChevronDown, ChevronUp,
  Swords, ArrowRight, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "@/components/ui/ImageUpload";

type Tournament = {
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

type Registration = {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  minecraftUsername: string;
  minecraftUuid: string | null;
  discordUsername: string;
  discordId: string | null;
  teamName: string | null;
  teamMembers: string | null;
  email: string;
  region: string;
  age: number | null;
  createdAt: string;
};

type Announcement = {
  id: string;
  tournamentId: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const emptyForm = {
  title: "", bannerUrl: "", type: "SOLO" as "SOLO" | "DUO" | "SQUAD", gameMode: "Bedwars",
  dateTime: "", registrationDeadline: "", maxParticipants: "50", entryFee: "",
  prizePool: "", discordLink: "", rules: "", serverIp: "",
};

const gameModes = ["Bedwars", "Skywars", "PvP", "Survival", "UHC", "KitPvP", "Practice", "MiniGames", "BuildBattle", "Parkour"];

export default function EmployeeTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTournament, setEditTournament] = useState<Tournament | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [expandedTournament, setExpandedTournament] = useState<string | null>(null);

  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceTournamentId, setAnnounceTournamentId] = useState("");
  const [announceForm, setAnnounceForm] = useState({ title: "", message: "", type: "INFO" });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announceLoading, setAnnounceLoading] = useState(false);

  const [showRegModal, setShowRegModal] = useState(false);
  const [regSearch, setRegSearch] = useState("");
  const [regFilter, setRegFilter] = useState({ region: "", teamType: "" });
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regPagination, setRegPagination] = useState<Pagination | null>(null);
  const [regPage, setRegPage] = useState(1);
  const [regLoading, setRegLoading] = useState(false);
  const [regTargetTournament, setRegTargetTournament] = useState("");

  const [showBracketModal, setShowBracketModal] = useState(false);
  const [bracketTournamentId, setBracketTournamentId] = useState("");
  const [bracketMatches, setBracketMatches] = useState<any[]>([]);
  const [bracketLoading, setBracketLoading] = useState(false);
  const [bracketRegistrations, setBracketRegistrations] = useState<Registration[]>([]);
  const [editingMatch, setEditingMatch] = useState<any>(null);
  const [editMatchForm, setEditMatchForm] = useState({ score1: "", score2: "", winnerId: "", status: "SCHEDULED", notes: "" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments/staff", { credentials: "include" });
      const d = await res.json();
      if (d.tournaments) setTournaments(d.tournaments);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTournament(null);
    const now = new Date();
    setForm({
      ...emptyForm,
      dateTime: new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 16),
      registrationDeadline: new Date(now.getTime() + 6 * 86400000).toISOString().slice(0, 16),
    });
    setShowModal(true);
  };

  const openEdit = (t: Tournament) => {
    setEditTournament(t);
    setForm({
      title: t.title,
      bannerUrl: t.bannerUrl || "",
      type: t.type,
      gameMode: t.gameMode,
      dateTime: new Date(t.dateTime).toISOString().slice(0, 16),
      registrationDeadline: new Date(t.registrationDeadline).toISOString().slice(0, 16),
      maxParticipants: String(t.maxParticipants),
      entryFee: t.entryFee ? String(t.entryFee) : "",
      prizePool: t.prizePool || "",
      discordLink: t.discordLink || "",
      rules: t.rules,
      serverIp: t.serverIp || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...form,
        maxParticipants: parseInt(form.maxParticipants),
        entryFee: form.entryFee ? parseFloat(form.entryFee) : null,
        dateTime: new Date(form.dateTime).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
      };
      const res = await fetch(
        editTournament ? "/api/tournaments/staff/update" : "/api/tournaments/staff/create",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify(editTournament ? { ...body, id: editTournament.id } : body),
        },
      );
      const d = await res.json();
      if (d.ok) {
        toast.success(editTournament ? "Tournament updated!" : "Tournament created!");
        setShowModal(false);
        load();
      } else toast.error(d.error || "Failed.");
    } catch { toast.error("Something went wrong."); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tournament? This cannot be undone.")) return;
    const res = await fetch("/api/tournaments/staff/delete", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });
    const d = await res.json();
    if (d.ok) { toast.success("Deleted."); load(); } else toast.error(d.error || "Failed.");
  };

  const handleToggleStatus = async (id: string, action: "start" | "end") => {
    const res = await fetch(`/api/tournaments/staff/${action}`, { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });
    const d = await res.json();
    if (d.ok) { toast.success(action === "start" ? "Tournament started!" : "Tournament ended."); load(); } else toast.error(d.error || "Failed.");
  };

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch("/api/tournaments/staff/update", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ id, status }) });
    const d = await res.json();
    if (d.ok) { toast.success(`Status set to ${status}`); load(); } else toast.error(d.error || "Failed.");
  };

  const openAnnouncements = async (tournamentId: string) => {
    if (expandedTournament === tournamentId) { setExpandedTournament(null); return; }
    setExpandedTournament(tournamentId);
    setAnnounceLoading(true);
    try {
      const res = await fetch(`/api/employee/announcements?tournamentId=${tournamentId}`, { credentials: "include" });
      const d = await res.json();
      if (d.announcements) setAnnouncements(d.announcements);
    } catch {}
    setAnnounceLoading(false);
  };

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employee/announcements/create", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...announceForm, tournamentId: announceTournamentId }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Announcement posted!"); setShowAnnounceModal(false); setAnnounceForm({ title: "", message: "", type: "INFO" }); openAnnouncements(announceTournamentId); }
    else toast.error(d.error || "Failed.");
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetch("/api/employee/announcements/delete", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });
    const d = await res.json();
    if (d.ok) { toast.success("Deleted."); if (expandedTournament) openAnnouncements(expandedTournament); }
    else toast.error(d.error || "Failed.");
  };

  const openRegSearch = (tournamentId: string) => {
    setRegTargetTournament(tournamentId);
    setRegistrations([]);
    setRegSearch("");
    setRegFilter({ region: "", teamType: "" });
    setRegPage(1);
    setRegPagination(null);
    setShowRegModal(true);
    searchRegistrations(tournamentId, "", { region: "", teamType: "" }, 1);
  };

  const searchRegistrations = async (tournamentId: string, search: string, filter: typeof regFilter, page: number) => {
    setRegLoading(true);
    try {
      const params = new URLSearchParams({ tournamentId, search, page: String(page), limit: "50" });
      if (filter.region) params.set("region", filter.region);
      if (filter.teamType) params.set("teamType", filter.teamType);
      const res = await fetch(`/api/tournaments/staff/search-registrations?${params}`, { credentials: "include" });
      const d = await res.json();
      if (d.registrations) setRegistrations(d.registrations);
      if (d.pagination) setRegPagination(d.pagination);
    } catch {}
    setRegLoading(false);
  };

  const exportRegistrations = async (tournamentId: string, format: string) => {
    const res = await fetch(`/api/tournaments/staff/export-registrations?tournamentId=${tournamentId}&format=${format}`, { credentials: "include" });
    if (!res.ok) { toast.error("Export failed."); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `registrations.${format}`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const openBracketModal = async (tournamentId: string) => {
    setBracketTournamentId(tournamentId);
    setEditingMatch(null);
    setBracketLoading(true);
    setShowBracketModal(true);
    try {
      const [mRes, rRes] = await Promise.all([
        fetch(`/api/tournaments/matches?tournamentId=${tournamentId}`, { credentials: "include" }),
        fetch(`/api/tournaments/registrations?tournamentId=${tournamentId}&limit=500`, { credentials: "include" }),
      ]);
      const mData = await mRes.json();
      const rData = await rRes.json();
      if (mData.matches) setBracketMatches(mData.matches);
      if (rData.registrations) setBracketRegistrations(rData.registrations);
    } catch {}
    setBracketLoading(false);
  };

  const generateBracket = async () => {
    if (!confirm("Generate a random bracket from all registrations? This will delete any existing bracket.")) return;
    const res = await fetch("/api/tournaments/staff/generate-bracket", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tournamentId: bracketTournamentId }),
    });
    const d = await res.json();
    if (d.ok) { toast.success(d.message); openBracketModal(bracketTournamentId); }
    else toast.error(d.error || "Failed to generate bracket.");
  };

  const createNextRound = async () => {
    const res = await fetch("/api/tournaments/staff/create-next-round", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tournamentId: bracketTournamentId }),
    });
    const d = await res.json();
    if (d.ok) { toast.success(d.message); openBracketModal(bracketTournamentId); }
    else toast.error(d.error || "Failed.");
  };

  const deleteAllMatches = async () => {
    if (!confirm("Delete ALL matches for this tournament?")) return;
    const res = await fetch("/api/tournaments/staff/delete-matches", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ tournamentId: bracketTournamentId }),
    });
    const d = await res.json();
    if (d.ok) { toast.success(d.message); openBracketModal(bracketTournamentId); }
    else toast.error(d.error || "Failed.");
  };

  const openEditMatch = (match: any) => {
    setEditingMatch(match);
    setEditMatchForm({
      score1: match.score1 !== null ? String(match.score1) : "",
      score2: match.score2 !== null ? String(match.score2) : "",
      winnerId: match.winnerId || "",
      status: match.status,
      notes: match.notes || "",
    });
  };

  const saveMatchResult = async () => {
    if (!editingMatch) return;
    const res = await fetch("/api/tournaments/staff/update-match", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        matchId: editingMatch.id,
        score1: editMatchForm.score1 ? parseInt(editMatchForm.score1) : null,
        score2: editMatchForm.score2 ? parseInt(editMatchForm.score2) : null,
        winnerId: editMatchForm.winnerId || null,
        status: editMatchForm.status,
        notes: editMatchForm.notes || null,
      }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Match updated!"); setEditingMatch(null); openBracketModal(bracketTournamentId); }
    else toast.error(d.error || "Failed to update match.");
  };

  const filtered = filter === "ALL" ? tournaments : tournaments.filter((t) => t.status === filter);
  const counts = { ALL: tournaments.length, UPCOMING: tournaments.filter((t) => t.status === "UPCOMING").length, LIVE: tournaments.filter((t) => t.status === "LIVE").length, COMPLETED: tournaments.filter((t) => t.status === "COMPLETED").length };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Tournament Management</h1>
          <p className="mt-1 text-sm text-white/50">Create, manage, and monitor all HUBMC tournaments.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_16px_rgba(255,138,42,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_20px_rgba(255,138,42,0.3)]">
          <Plus className="h-4 w-4" /> New Tournament
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["ALL", "UPCOMING", "LIVE", "COMPLETED"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === s ? "bg-[var(--hub-blue)]/20 text-[var(--hub-blue)]" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-3 text-white/40">No tournaments found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((t) => (
            <motion.div key={t.id} layout className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] overflow-hidden">
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white truncate">{t.title}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${t.status === "LIVE" ? "bg-green-500/20 text-green-400" : t.status === "UPCOMING" ? "bg-[var(--hub-blue)]/20 text-[var(--hub-blue)]" : "bg-white/10 text-white/40"}`}>{t.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                      <span className="flex items-center gap-1"><Gamepad2 className="h-3.5 w-3.5" />{t.gameMode}</span>
                      <span className="flex items-center gap-1"><Sword className="h-3.5 w-3.5" />{t.type}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(t.dateTime).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t.registrationsCount}/{t.maxParticipants}</span>
                      {t.prizePool && <span className="flex items-center gap-1 text-[var(--hub-orange)]"><Award className="h-3.5 w-3.5" />{t.prizePool}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.status === "UPCOMING" && (
                      <button onClick={() => handleToggleStatus(t.id, "start")} className="rounded-lg border border-green-500/30 p-1.5 text-green-400/70 transition-colors hover:bg-green-500/10 hover:text-green-400" title="Start Tournament">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {t.status === "LIVE" && (
                      <button onClick={() => handleToggleStatus(t.id, "end")} className="rounded-lg border border-red-500/30 p-1.5 text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400" title="End Tournament">
                        <StopCircle className="h-4 w-4" />
                      </button>
                    )}
                    <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none">
                      <option value="UPCOMING">Upcoming</option>
                      <option value="LIVE">Live</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                    <button onClick={() => openEdit(t)} className="rounded-lg border border-white/10 p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="rounded-lg border border-red-500/20 p-1.5 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => openRegSearch(t.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                    <Search className="h-3.5 w-3.5" /> Search Registrations ({t.registrationsCount})
                  </button>
                  <button onClick={() => { setAnnounceTournamentId(t.id); setShowAnnounceModal(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                    <Megaphone className="h-3.5 w-3.5" /> Announcement
                  </button>
                  <button onClick={() => exportRegistrations(t.id, "csv")} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                  <button onClick={() => openAnnouncements(t.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                    {expandedTournament === t.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />} Announcements
                  </button>
                  <button onClick={() => openBracketModal(t.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                    <Swords className="h-3.5 w-3.5" /> Bracket
                  </button>
                </div>

                {expandedTournament === t.id && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    {announceLoading ? (
                      <LoaderCircle className="h-5 w-5 animate-spin text-[var(--hub-blue)]" />
                    ) : announcements.length === 0 ? (
                      <p className="text-sm text-white/30">No announcements yet.</p>
                    ) : (
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {announcements.map((a) => (
                          <div key={a.id} className="flex items-start justify-between rounded-xl bg-white/5 px-3 py-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase ${a.type === "URGENT" ? "text-red-400" : a.type === "REMINDER" ? "text-yellow-400" : "text-[var(--hub-blue)]"}`}>{a.type}</span>
                                <span className="text-sm font-medium text-white">{a.title}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-white/50">{a.message}</p>
                            </div>
                            <button onClick={() => deleteAnnouncement(a.id)} className="rounded p-1 text-red-400/40 hover:text-red-400"><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Tournament Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{editTournament ? "Edit Tournament" : "Create Tournament"}</h2>
                <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Title *</label>
                    <input type="text" name="title" value={form.title} onChange={handleInputChange} required placeholder="HUBMC Summer Championship" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Game Mode *</label>
                    <select name="gameMode" value={form.gameMode} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                      {gameModes.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Type *</label>
                    <select name="type" value={form.type} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                      <option value="SOLO">Solo</option>
                      <option value="DUO">Duo</option>
                      <option value="SQUAD">Squad</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Date & Time *</label>
                    <input type="datetime-local" name="dateTime" value={form.dateTime} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Registration Deadline *</label>
                    <input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Max Participants *</label>
                    <input type="number" name="maxParticipants" value={form.maxParticipants} onChange={handleInputChange} required min="2" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Entry Fee (₹)</label>
                    <input type="number" name="entryFee" value={form.entryFee} onChange={handleInputChange} min="0" step="0.01" placeholder="0 = Free" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Prize Pool</label>
                    <input type="text" name="prizePool" value={form.prizePool} onChange={handleInputChange} placeholder="₹50,000" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageUpload value={form.bannerUrl} onChange={(url) => setForm({ ...form, bannerUrl: url ?? "" })} label="Banner Image" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Discord Link</label>
                    <input type="url" name="discordLink" value={form.discordLink} onChange={handleInputChange} placeholder="https://discord.gg/CwNVBCuSbj" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Server IP</label>
                    <input type="text" name="serverIp" value={form.serverIp} onChange={handleInputChange} placeholder="play.hubmc.in" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Rules *</label>
                    <textarea name="rules" value={form.rules} onChange={handleInputChange} required rows={5} placeholder="Write the tournament rules here..." className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] transition-all hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)] disabled:opacity-50">
                    {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : editTournament ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnounceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Post Announcement</h2>
                <button onClick={() => setShowAnnounceModal(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={createAnnouncement} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-white/50">Type</label>
                  <select value={announceForm.type} onChange={(e) => setAnnounceForm((prev) => ({ ...prev, type: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    <option value="INFO">Info</option>
                    <option value="URGENT">Urgent</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="UPDATE">Update</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Title *</label>
                  <input type="text" value={announceForm.title} onChange={(e) => setAnnounceForm((prev) => ({ ...prev, title: e.target.value }))} required placeholder="Match starting soon!" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Message *</label>
                  <textarea value={announceForm.message} onChange={(e) => setAnnounceForm((prev) => ({ ...prev, message: e.target.value }))} required rows={3} placeholder="Details..." className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAnnounceModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10">Cancel</button>
                  <button type="submit" className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]">Post</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Registration Search Modal */}
      <AnimatePresence>
        {showRegModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Registrations</h2>
                <button onClick={() => setShowRegModal(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input type="text" value={regSearch} onChange={(e) => { setRegSearch(e.target.value); searchRegistrations(regTargetTournament, e.target.value, regFilter, 1); }} placeholder="Search by username, discord, or email..." className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <select value={regFilter.region} onChange={(e) => { const nf = { ...regFilter, region: e.target.value }; setRegFilter(nf); searchRegistrations(regTargetTournament, regSearch, nf, 1); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none">
                  <option value="">All Regions</option>
                  {["Asia", "Europe", "North America", "South America", "Africa", "Australia/Oceania"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={regFilter.teamType} onChange={(e) => { const nf = { ...regFilter, teamType: e.target.value }; setRegFilter(nf); searchRegistrations(regTargetTournament, regSearch, nf, 1); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none">
                  <option value="">All Types</option>
                  <option value="solo">Solo</option>
                  <option value="team">Team</option>
                </select>
                <button onClick={() => exportRegistrations(regTargetTournament, "json")} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/10">
                  <Download className="h-4 w-4" /> Export
                </button>
              </div>

              {regLoading ? (
                <div className="flex justify-center py-10"><LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" /></div>
              ) : registrations.length === 0 ? (
                <div className="py-10 text-center text-white/40">No registrations match your search.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 px-3 text-white/40 font-medium">MC Username</th>
                        <th className="text-left py-2 px-3 text-white/40 font-medium">UUID</th>
                        <th className="text-left py-2 px-3 text-white/40 font-medium">Discord</th>
                        <th className="text-left py-2 px-3 text-white/40 font-medium">Team</th>
                        <th className="text-left py-2 px-3 text-white/40 font-medium">Region</th>
                        <th className="text-left py-2 px-3 text-white/40 font-medium">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((r) => (
                        <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 text-white font-medium">{r.minecraftUsername}</td>
                          <td className="py-2.5 px-3 text-white/40 text-xs font-mono">{r.minecraftUuid ? r.minecraftUuid.slice(0, 8) + "..." : "—"}</td>
                          <td className="py-2.5 px-3 text-white/60">{r.discordUsername}</td>
                          <td className="py-2.5 px-3 text-white/60">{r.teamName || <span className="text-white/20">—</span>}</td>
                          <td className="py-2.5 px-3 text-white/60">{r.region}</td>
                          <td className="py-2.5 px-3 text-white/40 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {regPagination && regPagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-white/40">{regPagination.total} total registrations</span>
                  <div className="flex gap-2">
                    <button disabled={regPage <= 1} onClick={() => { setRegPage(regPage - 1); searchRegistrations(regTargetTournament, regSearch, regFilter, regPage - 1); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30 hover:bg-white/10">Previous</button>
                    <span className="px-3 py-1.5 text-xs text-white/40">Page {regPagination.page} of {regPagination.totalPages}</span>
                    <button disabled={regPage >= regPagination.totalPages} onClick={() => { setRegPage(regPage + 1); searchRegistrations(regTargetTournament, regSearch, regFilter, regPage + 1); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30 hover:bg-white/10">Next</button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bracket Management Modal */}
      <AnimatePresence>
        {showBracketModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Bracket Management</h2>
                <button onClick={() => setShowBracketModal(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={generateBracket} className="inline-flex items-center gap-2 rounded-xl bg-[var(--hub-blue)]/20 px-4 py-2 text-sm font-medium text-[var(--hub-blue)] transition-colors hover:bg-[var(--hub-blue)]/30">
                  <Swords className="h-4 w-4" /> Generate Bracket
                </button>
                <button onClick={createNextRound} disabled={bracketMatches.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/30 disabled:opacity-30">
                  <ArrowRight className="h-4 w-4" /> Next Round
                </button>
                <button onClick={deleteAllMatches} disabled={bracketMatches.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-30">
                  <RotateCcw className="h-4 w-4" /> Delete All
                </button>
                <span className="text-xs text-white/30 self-center ml-auto">{bracketRegistrations.length} participants, {bracketMatches.length} matches</span>
              </div>

              {bracketLoading ? (
                <div className="flex justify-center py-16"><LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" /></div>
              ) : bracketMatches.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
                  <Swords className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-3 text-white/40">No bracket matches yet.</p>
                  <p className="mt-1 text-xs text-white/20">Click "Generate Bracket" to create round 1 matches from registrations.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(new Set(bracketMatches.map((m: any) => m.round))).sort().map((round) => {
                    const roundMatches = bracketMatches.filter((m: any) => m.round === round);
                    const isLast = round === Math.max(...bracketMatches.map((m: any) => m.round));
                    return (
                      <div key={round as number}>
                        <h4 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                          {round === 1 ? "Round 1" : isLast ? "Final" : `Round ${round}`}
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">{roundMatches.length} match{roundMatches.length > 1 ? "es" : ""}</span>
                        </h4>
                        <div className="space-y-2">
                          {roundMatches.map((match: any) => {
                            const p1 = match.player1 || bracketRegistrations.find((r: any) => r.id === match.player1Id);
                            const p2 = match.player2 || bracketRegistrations.find((r: any) => r.id === match.player2Id);
                            const p1Name = p1?.minecraftUsername || "TBD";
                            const p2Name = p2?.minecraftUsername || "TBD";
                            return (
                              <div key={match.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 hover:bg-white/[0.05] transition-colors">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className={`font-medium ${match.winnerId === match.player1Id ? "text-green-400" : match.status === "COMPLETED" && match.winnerId && match.winnerId !== match.player1Id ? "text-white/40" : "text-white"}`}>
                                      {p1Name}
                                    </span>
                                    <span className="text-[10px] text-white/20">vs</span>
                                    <span className={`font-medium ${match.winnerId === match.player2Id ? "text-green-400" : match.status === "COMPLETED" && match.winnerId && match.winnerId !== match.player2Id ? "text-white/40" : "text-white"}`}>
                                      {p2Name}
                                    </span>
                                    {(match.score1 !== null || match.score2 !== null) && (
                                      <span className="text-xs font-bold text-white/60 ml-2">{match.score1 ?? "?"} - {match.score2 ?? "?"}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    match.status === "COMPLETED" ? "bg-green-500/15 text-green-400" :
                                    match.status === "LIVE" ? "bg-yellow-500/15 text-yellow-400" :
                                    "bg-white/5 text-white/30"
                                  }`}>{match.status}</span>
                                  <button onClick={() => openEditMatch(match)} className="rounded-lg border border-white/10 p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Match Modal */}
      <AnimatePresence>
        {editingMatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Edit Match Result</h2>
                <button onClick={() => setEditingMatch(null)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4 py-3">
                  <div className="text-center flex-1">
                    <p className="text-sm font-medium text-white">{editingMatch.player1?.minecraftUsername || bracketRegistrations.find((r: any) => r.id === editingMatch.player1Id)?.minecraftUsername || "TBD"}</p>
                  </div>
                  <span className="text-xs text-white/30">vs</span>
                  <div className="text-center flex-1">
                    <p className="text-sm font-medium text-white">{editingMatch.player2?.minecraftUsername || bracketRegistrations.find((r: any) => r.id === editingMatch.player2Id)?.minecraftUsername || "TBD"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-white/50">Score 1</label>
                    <input type="number" value={editMatchForm.score1} onChange={(e) => setEditMatchForm((prev) => ({ ...prev, score1: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Score 2</label>
                    <input type="number" value={editMatchForm.score2} onChange={(e) => setEditMatchForm((prev) => ({ ...prev, score2: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/50">Winner</label>
                  <select value={editMatchForm.winnerId} onChange={(e) => setEditMatchForm((prev) => ({ ...prev, winnerId: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    <option value="">Select winner</option>
                    {[editingMatch.player1Id, editingMatch.player2Id].filter(Boolean).map((pid) => {
                      const reg = editingMatch.player1?.id === pid ? editingMatch.player1 : editingMatch.player2;
                      const fallback = bracketRegistrations.find((r: any) => r.id === pid);
                      return (
                        <option key={pid} value={pid}>
                          {reg?.minecraftUsername || fallback?.minecraftUsername || pid}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/50">Status</label>
                  <select value={editMatchForm.status} onChange={(e) => setEditMatchForm((prev) => ({ ...prev, status: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="LIVE">Live</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-white/50">Notes</label>
                  <textarea value={editMatchForm.notes} onChange={(e) => setEditMatchForm((prev) => ({ ...prev, notes: e.target.value }))} rows={2} className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setEditingMatch(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10">Cancel</button>
                  <button onClick={saveMatchResult} className="rounded-xl bg-orange-500 px-6 py-2 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] transition-all hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]">Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
