import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, LoaderCircle, Shield, Ban, FileText, X, Trophy, ShoppingCart, Ticket, Phone, Trash2 } from "lucide-react";

type Player = {
  id: string;
  email: string;
  username?: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  minecraftUsername?: string;
  authProvider?: string;
  createdAt: string;
  orders: number;
  tickets: number;
  registrations: number;
  rank?: { name: string; color: string } | null;
  bans?: { id: string; reason: string; createdAt: string; expiresAt?: string | null; active: boolean }[];
  notes?: { id: string; content: string; createdAt: string; author: string }[];
};

export default function AdminPlayers() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [archiving, setArchiving] = useState<string | null>(null);

  const searchPlayers = useCallback(async (q: string, p = 1) => {
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/platform/players?search=${encodeURIComponent(q)}&page=${p}&limit=20`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed"); setPlayers([]); }
      else { setPlayers(data.players || []); setPage(p); setTotalPages(data.pagination?.totalPages ?? 1); setTotal(data.pagination?.total ?? 0); }
    } catch { setError("Network error"); setPlayers([]); }
    finally { setLoading(false); }
  }, []);

  const allPlayers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/platform/players?page=${p}&limit=20`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) { setPlayers(data.players || []); setPage(p); setTotalPages(data.pagination?.totalPages ?? 1); setTotal(data.pagination?.total ?? 0); }
      else setError(data.error || "Failed to load");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, []);

  const deletePlayer = async (customerId: string) => {
    setArchiving(customerId);
    setError("");
    try {
      const res = await fetch("/api/admin/platform/delete-player", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to delete player"); return; }
      setPlayers((prev) => prev.filter((p) => p.id !== customerId));
      setSelectedPlayer(null);
      setTotal((t) => Math.max(0, t - 1));
    } catch { setError("Network error — could not reach server."); }
    finally { setArchiving(null); }
  };

  useEffect(() => { allPlayers(1); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-2xl sm:text-3xl font-black text-white">Player Management</h1>
      <p className="mt-1 text-sm text-white/56">Search players by name, phone, or email. Manage ranks, bans, and view profiles.</p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text" placeholder="Search by name, phone, or email..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPlayers(query)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--hub-blue)]/40"
          />
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setPage(1); searchPlayers(query, 1); }} className="flex-1 sm:flex-none rounded-xl bg-[var(--hub-blue)] px-6 py-3 text-sm font-bold text-black transition-all hover:shadow-[0_0_16px_rgba(62,162,255,0.3)]">Search</button>
          <button onClick={() => allPlayers(1)} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 hover:bg-white/5">All</button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="mt-8 flex justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" /></div>
      ) : (
        <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <motion.button
              key={player.id} layout
              onClick={() => setSelectedPlayer(player)}
              className="group rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-4 text-left transition-all hover:border-[var(--hub-blue)]/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--hub-blue)] to-[var(--hub-orange)] text-sm font-black text-black">
                  {(player.fullName || player.minecraftUsername || player.username || player.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white truncate">{player.fullName || player.minecraftUsername || player.username || "Unnamed"}</p>
                    {player.authProvider && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        player.authProvider === "phone" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
                      }`}>
                        {player.authProvider === "phone" ? "Phone" : "MC"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 truncate">{player.email}</p>
                  {player.phoneNumber && (
                    <p className="text-xs text-white/30 truncate flex items-center gap-1 mt-0.5"><Phone className="h-2.5 w-2.5 shrink-0" />{player.phoneNumber}</p>
                  )}
                </div>
                {player.rank && (
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: player.rank.color + "20", color: player.rank.color }}>{player.rank.name}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/40">
                <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" />{player.orders} orders</span>
                <span className="flex items-center gap-1"><Ticket className="h-3 w-3" />{player.tickets} tickets</span>
                <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{player.registrations} tournaments</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {!loading && players.length === 0 && !error && (
        <div className="mt-8 text-center text-sm text-white/30">No players found.</div>
      )}

      {!loading && players.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => allPlayers(page - 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Previous</button>
          <span className="text-sm text-white/40">Page {page} of {totalPages} ({total} total)</span>
          <button disabled={page >= totalPages} onClick={() => allPlayers(page + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Next</button>
        </div>
      )}

      {selectedPlayer && <PlayerProfileModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} onDelete={deletePlayer} archiving={archiving} />}
    </motion.div>
  );
}

function PlayerProfileModal({ player, onClose, onDelete, archiving }: { player: Player; onClose: () => void; onDelete: (id: string) => void; archiving: string | null }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.96)] p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--hub-blue)] to-[var(--hub-orange)] text-xl sm:text-2xl font-black text-black">
              {(player.fullName || player.minecraftUsername || player.username || player.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-white truncate">{player.fullName || player.minecraftUsername || player.username || "Unnamed"}</h2>
              <p className="text-xs sm:text-sm text-white/50 truncate">{player.email}</p>
              {player.phoneNumber ? (
                <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3 shrink-0" />{player.phoneNumber}</p>
              ) : (
                <p className="text-xs text-white/30 mt-0.5">Phone: Not provided</p>
              )}
              <p className="text-xs text-white/30">Joined {new Date(player.createdAt).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-white/40 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl bg-white/5 p-2.5 sm:p-3 text-center"><p className="text-base sm:text-lg font-black text-white">{player.orders}</p><p className="text-[10px] text-white/40">Orders</p></div>
          <div className="rounded-xl bg-white/5 p-2.5 sm:p-3 text-center"><p className="text-base sm:text-lg font-black text-white">{player.tickets}</p><p className="text-[10px] text-white/40">Tickets</p></div>
          <div className="rounded-xl bg-white/5 p-2.5 sm:p-3 text-center"><p className="text-base sm:text-lg font-black text-white">{player.registrations}</p><p className="text-[10px] text-white/40">Tournaments</p></div>
        </div>

        {player.rank && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white/70 flex items-center gap-2"><Shield className="h-4 w-4" />Rank</h3>
            <div className="mt-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-3">
              <div className="rounded-lg px-3 py-1 text-sm font-bold" style={{ backgroundColor: player.rank.color + "20", color: player.rank.color }}>{player.rank.name}</div>
              <span className="text-xs text-white/30">Assigned rank</span>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-sm font-bold text-white/70 flex items-center gap-2"><Ban className="h-4 w-4" />Bans</h3>
          <div className="mt-2 space-y-2">
            {(!player.bans || player.bans.length === 0) ? (
              <p className="text-sm text-white/30">No bans recorded</p>
            ) : (
              player.bans.map((b) => (
                <div key={b.id} className={`rounded-xl border p-3 ${b.active ? "border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/[0.02]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{b.reason}</p>
                    <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${b.active ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>{b.active ? "Active" : "Expired"}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/30">{new Date(b.createdAt).toLocaleDateString("en-IN")}{b.expiresAt ? ` - Expires: ${new Date(b.expiresAt).toLocaleDateString("en-IN")}` : " - Permanent"}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold text-white/70 flex items-center gap-2"><FileText className="h-4 w-4" />Notes</h3>
          <div className="mt-2 space-y-2">
            {(!player.notes || player.notes.length === 0) ? (
              <p className="text-sm text-white/30">No notes</p>
            ) : (
              player.notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-sm text-white/80">{n.content}</p>
                  <p className="mt-1 text-xs text-white/30">By {n.author} · {new Date(n.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const hasOrders = player.orders > 0;
                const hasRegs = player.registrations > 0;
                if (hasOrders || hasRegs) {
                  alert(`Cannot delete this player: ${hasOrders ? `${player.orders} order(s)` : ""}${hasOrders && hasRegs ? " and " : ""}${hasRegs ? `${player.registrations} tournament registration(s)` : ""} must be preserved.`);
                  return;
                }
                if (confirm("Are you sure you want to permanently delete this player? This cannot be undone.")) {
                  onDelete(player.id);
                }
              }}
              disabled={archiving === player.id}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
            >
              {archiving === player.id ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Player
            </button>
          </div>
          <p className="mt-2 text-xs text-white/30">
            {player.orders > 0 || player.registrations > 0
              ? "This player has linked order/tournament data and cannot be deleted."
              : "This player has no orders or tournament records and can be safely deleted."}
          </p>
        </div>
      </div>
    </div>
  );
}
