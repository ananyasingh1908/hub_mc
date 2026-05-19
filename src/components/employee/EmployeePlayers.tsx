import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, User, Shield, AlertTriangle, FileText, ShoppingCart,
  HeadphonesIcon, Star, Calendar, Clock, Trophy, Ban, CheckCircle,
  LoaderCircle, ChevronDown, ChevronUp, ExternalLink, Award,
} from "lucide-react";
import { toast } from "sonner";

type Player = {
  id: string;
  minecraftUsername: string;
  minecraftUuid: string;
  avatarUrl: string | null;
  country: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  ordersCount: number;
  ticketsCount: number;
  reviewsCount: number;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type PlayerProfile = {
  customer: {
    id: string;
    minecraftUsername: string;
    minecraftUuid: string;
    avatarUrl: string | null;
    country: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    user: { id: string; email: string; name: string | null; role: string; createdAt: string };
  };
  orders: Array<{ id: string; status: string; deliveryStatus: string; total: number; createdAt: string }>;
  tickets: Array<{ id: string; subject: string; status: string; createdAt: string }>;
  reviews: Array<any>;
  registrations: Array<{ id: string; tournament: { id: string; title: string; status: string }; createdAt: string }>;
  notes: Array<{ id: string; note: string; severity: string; employee: { displayName: string } | null; createdAt: string }>;
  bans: Array<{ id: string; reason: string; active: boolean; employee: { displayName: string } | null; tournament: { id: string; title: string } | null; createdAt: string; bannedUntil: string | null }>;
  ranks: Array<{ id: string; rank: string; active: boolean; assignedBy: string | null; assignedAt: string; expiresAt: string | null }>;
};

type BanEntry = {
  id: string;
  minecraftUsername: string;
  reason: string;
  tournamentTitle: string | null;
  bannedUntil: string | null;
  active: boolean;
  employeeName: string;
  createdAt: string;
};

const rankOptions = ["VIP", "MVP", "MVP+", "HELPER", "MOD", "BUILDER", "CONTENT", "CHAMPION", "LEGEND"];

const deliveryBadge = (s: string) => {
  const map: Record<string, string> = {
    DELIVERED: "text-green-400",
    PROCESSING: "text-blue-400",
    PENDING: "text-yellow-400",
    FAILED: "text-red-400",
    AWAITING_SERVER: "text-orange-400",
  };
  return map[s] ?? "text-white/50";
};

export default function EmployeePlayers() {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [noteModal, setNoteModal] = useState(false);
  const [noteUsername, setNoteUsername] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSeverity, setNoteSeverity] = useState("INFO");

  const [banModal, setBanModal] = useState(false);
  const [banUsername, setBanUsername] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("");

  const [rankModal, setRankModal] = useState(false);
  const [rankUsername, setRankUsername] = useState("");
  const [rankValue, setRankValue] = useState("VIP");
  const [rankExpiry, setRankExpiry] = useState("");

  const [banList, setBanList] = useState<BanEntry[]>([]);
  const [showBanList, setShowBanList] = useState(false);
  const [banPage, setBanPage] = useState(1);
  const [banPagination, setBanPagination] = useState<Pagination | null>(null);
  const [banSearch, setBanSearch] = useState("");

  const [activeTab, setActiveTab] = useState<"players" | "bans">("players");

  const searchPlayers = async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, page: String(p), limit: "50" });
      const res = await fetch(`/api/employee/players/search?${params}`, { credentials: "include" });
      const d = await res.json();
      if (d.players) setPlayers(d.players);
      if (d.pagination) setPagination(d.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { searchPlayers("", 1); }, []);

  const openProfile = async (username: string) => {
    setProfileLoading(true);
    setShowProfile(true);
    setProfile(null);
    try {
      const res = await fetch(`/api/employee/players/profile?username=${encodeURIComponent(username)}`, { credentials: "include" });
      const d = await res.json();
      if (d.customer) setProfile(d as PlayerProfile);
    } catch {}
    setProfileLoading(false);
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employee/players/note", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ minecraftUsername: noteUsername, note: noteText, severity: noteSeverity }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Note added."); setNoteModal(false); setNoteText(""); if (profile) openProfile(noteUsername); }
    else toast.error(d.error || "Failed.");
  };

  const banPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employee/players/ban", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        minecraftUsername: banUsername,
        reason: banReason,
        bannedUntil: banDuration || undefined,
      }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Player banned."); setBanModal(false); setBanReason(""); setBanDuration(""); if (profile) openProfile(banUsername); }
    else toast.error(d.error || "Failed.");
  };

  const unbanPlayer = async (banId: string) => {
    if (!confirm("Unban this player?")) return;
    const res = await fetch("/api/employee/players/unban", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ banId }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Player unbanned."); if (profile) openProfile(profile.customer.minecraftUsername); loadBans(banSearch, banPage); }
    else toast.error(d.error || "Failed.");
  };

  const assignRank = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employee/players/assign-rank", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        minecraftUsername: rankUsername,
        rank: rankValue,
        expiresAt: rankExpiry || undefined,
      }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Rank assigned!"); setRankModal(false); setRankValue("VIP"); setRankExpiry(""); if (profile) openProfile(rankUsername); }
    else toast.error(d.error || "Failed.");
  };

  const removeRank = async (rankId: string) => {
    if (!confirm("Remove this rank?")) return;
    const res = await fetch("/api/employee/players/remove-rank", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ rankId }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Rank removed."); if (profile) openProfile(profile.customer.minecraftUsername); }
    else toast.error(d.error || "Failed.");
  };

  const loadBans = async (q: string, p: number) => {
    const params = new URLSearchParams({ search: q, page: String(p), limit: "50" });
    const res = await fetch(`/api/employee/players/bans?${params}`, { credentials: "include" });
    const d = await res.json();
    if (d.bans) setBanList(d.bans);
    if (d.pagination) setBanPagination(d.pagination);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Players &amp; Ranks</h1>
          <p className="mt-1 text-sm text-white/50">Search players, manage profiles, assign ranks, bans, and moderation notes.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBanList(!showBanList)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10">
            <Ban className="h-4 w-4" /> Bans
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-white/10">
        {(["players", "bans"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === tab ? "border-[var(--hub-blue)] text-white" : "border-transparent text-white/40 hover:text-white/60"}`}>
            {tab === "players" ? "Players" : "Bans"}
          </button>
        ))}
      </div>

      {activeTab === "players" && (
        <>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); searchPlayers(e.target.value, 1); }}
              placeholder="Search by Minecraft username, email, or display name..."
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]"
            />
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center py-12"><LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" /></div>
            ) : players.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
                <User className="mx-auto h-10 w-10 text-white/20" />
                <p className="mt-3 text-white/40">No players found.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {players.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-4 cursor-pointer transition-all hover:border-[var(--hub-blue)]/30 hover:shadow-[0_0_16px_rgba(62,162,255,0.06)]"
                    onClick={() => { setNoteUsername(p.minecraftUsername); setBanUsername(p.minecraftUsername); setRankUsername(p.minecraftUsername); openProfile(p.minecraftUsername); }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--hub-blue)]/20 flex items-center justify-center">
                        {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full" /> : <User className="h-5 w-5 text-[var(--hub-blue)]" />}
                      </div>
                      <div>
                        <div className="font-medium text-white">{p.minecraftUsername}</div>
                        <div className="text-xs text-white/40">{p.country || "Unknown"} &middot; {p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleDateString() : "Never"}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 text-xs text-white/40">
                      <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" />{p.ordersCount}</span>
                      <span className="flex items-center gap-1"><HeadphonesIcon className="h-3 w-3" />{p.ticketsCount}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{p.reviewsCount}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button disabled={page <= 1} onClick={() => { setPage(page - 1); searchPlayers(search, page - 1); }} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/10">Previous</button>
                <span className="text-sm text-white/40">Page {pagination.page} of {pagination.totalPages}</span>
                <button disabled={page >= pagination.totalPages} onClick={() => { setPage(page + 1); searchPlayers(search, page + 1); }} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/10">Next</button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "bans" && (
        <div className="mt-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input type="text" value={banSearch} onChange={(e) => { setBanSearch(e.target.value); loadBans(e.target.value, 1); }} placeholder="Search bans by username..." className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
          </div>
          <div className="space-y-2">
            {banList.length === 0 ? (
              <div className="py-10 text-center text-white/40">No bans found.</div>
            ) : (
              banList.map((b) => (
                <div key={b.id} className="rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Ban className={`h-4 w-4 ${b.active ? "text-red-400" : "text-green-400"}`} />
                        <span className="font-medium text-white">{b.minecraftUsername}</span>
                        <span className={`text-[10px] font-bold uppercase ${b.active ? "text-red-400" : "text-green-400"}`}>{b.active ? "Active" : "Expired"}</span>
                      </div>
                      <p className="mt-1 text-sm text-white/60">{b.reason}</p>
                      <div className="mt-1 flex gap-3 text-xs text-white/30">
                        <span>By: {b.employeeName}</span>
                        {b.tournamentTitle && <span>Tournament: {b.tournamentTitle}</span>}
                        {b.bannedUntil && <span>Until: {new Date(b.bannedUntil).toLocaleDateString()}</span>}
                        <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {b.active && (
                      <button onClick={(ev: React.MouseEvent) => { ev.stopPropagation(); unbanPlayer(b.id); }} className="rounded-lg border border-green-500/30 px-3 py-1.5 text-xs text-green-400/70 transition-colors hover:bg-green-500/10">
                        Unban
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {banPagination && banPagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button disabled={banPage <= 1} onClick={() => { setBanPage(banPage - 1); loadBans(banSearch, banPage - 1); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30">Prev</button>
              <span className="text-xs text-white/40">Page {banPagination.page} of {banPagination.totalPages}</span>
              <button disabled={banPage >= banPagination.totalPages} onClick={() => { setBanPage(banPage + 1); loadBans(banSearch, banPage + 1); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Player Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6" onClick={(e) => e.stopPropagation()}>
              {profileLoading ? (
                <div className="flex justify-center py-16"><LoaderCircle className="h-10 w-10 animate-spin text-[var(--hub-blue)]" /></div>
              ) : profile ? (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-[var(--hub-blue)]/20 flex items-center justify-center overflow-hidden">
                        {profile.customer.avatarUrl ? <img src={profile.customer.avatarUrl} alt="" className="h-14 w-14" /> : <User className="h-7 w-7 text-[var(--hub-blue)]" />}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">{profile.customer.minecraftUsername}</h2>
                        <p className="text-sm text-white/50">
                          {profile.customer.country || "No region"} &middot; Joined {new Date(profile.customer.createdAt).toLocaleDateString()}
                          {profile.customer.lastLoginAt && <> &middot; Last login {new Date(profile.customer.lastLoginAt).toLocaleDateString()}</>}
                        </p>
                        <div className="mt-1 flex gap-2">
                          {profile.ranks.map((r) => (
                            <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-[10px] font-bold text-yellow-400">
                              <Award className="h-3 w-3" />{r.rank}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setBanUsername(profile.customer.minecraftUsername); setBanModal(true); }} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400/70 hover:bg-red-500/10"><Ban className="h-3 w-3 inline mr-1" />Ban</button>
                      <button onClick={() => { setNoteUsername(profile.customer.minecraftUsername); setNoteModal(true); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"><FileText className="h-3 w-3 inline mr-1" />Note</button>
                      <button onClick={() => { setRankUsername(profile.customer.minecraftUsername); setRankModal(true); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10"><Shield className="h-3 w-3 inline mr-1" />Rank</button>
                      <button onClick={() => setShowProfile(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                      <ShoppingCart className="mx-auto h-5 w-5 text-[var(--hub-blue)]" />
                      <p className="mt-1 text-xl font-bold text-white">{profile.orders.length}</p>
                      <p className="text-xs text-white/40">Orders</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                      <HeadphonesIcon className="mx-auto h-5 w-5 text-[var(--hub-orange)]" />
                      <p className="mt-1 text-xl font-bold text-white">{profile.tickets.length}</p>
                      <p className="text-xs text-white/40">Tickets</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                      <Trophy className="mx-auto h-5 w-5 text-yellow-500" />
                      <p className="mt-1 text-xl font-bold text-white">{profile.registrations.length}</p>
                      <p className="text-xs text-white/40">Tournaments</p>
                    </div>
                  </div>

                  {profile.bans.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-red-400 flex items-center gap-2"><Ban className="h-4 w-4" />Active Bans</h3>
                      {profile.bans.map((b) => (
                        <div key={b.id} className="mt-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                          <p className="text-sm text-white/80">{b.reason}</p>
                          {b.bannedUntil && <p className="text-xs text-white/40 mt-1">Until: {new Date(b.bannedUntil).toLocaleDateString()}</p>}
                          <button onClick={() => unbanPlayer(b.id)} className="mt-2 rounded-lg border border-green-500/30 px-2.5 py-1 text-[10px] text-green-400/70 hover:bg-green-500/10">Unban</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2">Tournament Registrations</h3>
                      <div className="max-h-40 space-y-1.5 overflow-y-auto">
                        {profile.registrations.length === 0 ? <p className="text-xs text-white/30">None</p> : profile.registrations.map((r) => (
                          <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                            <span className="text-sm text-white">{r.tournament.title}</span>
                            <span className="text-[10px] text-white/40">{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2">Ranks</h3>
                      <div className="max-h-40 space-y-1.5 overflow-y-auto">
                        {profile.ranks.length === 0 ? <p className="text-xs text-white/30">None</p> : profile.ranks.map((r) => (
                          <div key={r.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                            <span className="text-sm font-medium text-yellow-400">{r.rank}</span>
                            <button onClick={() => removeRank(r.id)} className="text-[10px] text-red-400/60 hover:text-red-400">Remove</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-sm font-bold text-white mb-2">Moderation Notes</h3>
                    <div className="max-h-40 space-y-2 overflow-y-auto">
                      {profile.notes.length === 0 ? <p className="text-xs text-white/30">No notes</p> : profile.notes.map((n) => (
                        <div key={n.id} className={`rounded-xl border px-3 py-2 ${n.severity === "WARNING" ? "border-yellow-500/20 bg-yellow-500/5" : n.severity === "CRITICAL" ? "border-red-500/20 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${n.severity === "WARNING" ? "text-yellow-400" : n.severity === "CRITICAL" ? "text-red-400" : "text-[var(--hub-blue)]"}`}>{n.severity}</span>
                            <span className="text-xs text-white/40">{n.employee?.displayName || "System"} &middot; {new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-white/70 mt-1">{n.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2">Recent Orders</h3>
                      <div className="max-h-32 space-y-1.5 overflow-y-auto">
                        {profile.orders.length === 0 ? <p className="text-xs text-white/30">None</p> : profile.orders.slice(0, 5).map((o) => (
                          <div key={o.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
                            <span className="text-xs text-white/60">₹{o.total.toFixed(2)}</span>
                            <span className={`text-[10px] font-medium ${deliveryBadge(o.deliveryStatus)}`}>{o.deliveryStatus}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white mb-2">Recent Tickets</h3>
                      <div className="max-h-32 space-y-1.5 overflow-y-auto">
                        {profile.tickets.length === 0 ? <p className="text-xs text-white/30">None</p> : profile.tickets.slice(0, 5).map((t) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
                            <span className="text-xs text-white/60 truncate max-w-[140px]">{t.subject}</span>
                            <span className={`text-[10px] ${t.status === "OPEN" ? "text-green-400" : t.status === "IN_PROGRESS" ? "text-yellow-400" : "text-white/40"}`}>{t.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-white/40">Player not found.</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Modal */}
      <AnimatePresence>
        {noteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <h2 className="text-xl font-bold text-white">Add Note</h2>
              <p className="text-sm text-white/50 mt-1">For: {noteUsername}</p>
              <form onSubmit={addNote} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-white/50">Severity</label>
                  <select value={noteSeverity} onChange={(e) => setNoteSeverity(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Note *</label>
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} required rows={3} placeholder="Write a moderation note..." className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setNoteModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70">Cancel</button>
                  <button type="submit" className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]">Save</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ban Modal */}
      <AnimatePresence>
        {banModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <h2 className="text-xl font-bold text-white">Ban Player</h2>
              <p className="text-sm text-white/50 mt-1">Player: {banUsername}</p>
              <form onSubmit={banPlayer} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-white/50">Reason *</label>
                  <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} required rows={2} placeholder="Reason for ban..." className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Ban Until (optional)</label>
                  <input type="datetime-local" value={banDuration} onChange={(e) => setBanDuration(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setBanModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70">Cancel</button>
                  <button type="submit" className="rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600">Ban Player</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rank Modal */}
      <AnimatePresence>
        {rankModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <h2 className="text-xl font-bold text-white">Assign Rank</h2>
              <p className="text-sm text-white/50 mt-1">Player: {rankUsername}</p>
              <form onSubmit={assignRank} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-white/50">Rank *</label>
                  <select value={rankValue} onChange={(e) => setRankValue(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    {rankOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Expires At (optional)</label>
                  <input type="datetime-local" value={rankExpiry} onChange={(e) => setRankExpiry(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setRankModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70">Cancel</button>
                  <button type="submit" className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]">Assign Rank</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
