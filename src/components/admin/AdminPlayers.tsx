import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, LoaderCircle, Shield, Ban, FileText, X, Trophy, ShoppingCart, Ticket } from "lucide-react";

type Player = {
  id: string;
  email: string;
  username?: string;
  minecraftUsername?: string;
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

  useEffect(() => { allPlayers(1); }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-black text-white">Player Management</h1>
      <p className="mt-1 text-white/56">Search players, manage ranks, bans, and view full profiles.</p>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text" placeholder="Search by email, Minecraft username, or player name..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPlayers(query)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--hub-blue)]/40"
          />
        </div>
        <button onClick={() => { setPage(1); searchPlayers(query, 1); }} className="rounded-xl bg-[var(--hub-blue)] px-6 py-3 text-sm font-bold text-black transition-all hover:shadow-[0_0_16px_rgba(62,162,255,0.3)]">Search</button>
        <button onClick={() => allPlayers(1)} className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 hover:bg-white/5">All</button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="mt-8 flex justify-center"><LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" /></div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <motion.button
              key={player.id} layout
              onClick={() => setSelectedPlayer(player)}
              className="group rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-4 text-left transition-all hover:border-[var(--hub-blue)]/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--hub-blue)] to-[var(--hub-orange)] text-sm font-black text-black">
                  {(player.minecraftUsername || player.username || player.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{player.minecraftUsername || player.username || "Unnamed"}</p>
                  <p className="text-xs text-white/40 truncate">{player.email}</p>
                </div>
                {player.rank && (
                  <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: player.rank.color + "20", color: player.rank.color }}>{player.rank.name}</span>
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

      {!loading && players.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => allPlayers(page - 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Previous</button>
          <span className="text-sm text-white/40">Page {page} of {totalPages} ({total} total)</span>
          <button disabled={page >= totalPages} onClick={() => allPlayers(page + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Next</button>
        </div>
      )}

      {selectedPlayer && <PlayerProfileModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </motion.div>
  );
}

function PlayerProfileModal({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.96)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--hub-blue)] to-[var(--hub-orange)] text-2xl font-black text-black">
              {(player.minecraftUsername || player.username || player.email)[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">{player.minecraftUsername || player.username || "Unnamed"}</h2>
              <p className="text-sm text-white/50">{player.email}</p>
              <p className="text-xs text-white/30">Joined {new Date(player.createdAt).toLocaleDateString("en-IN")}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-white/40 hover:bg-white/10"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 p-3 text-center"><p className="text-lg font-black text-white">{player.orders}</p><p className="text-[10px] text-white/40">Orders</p></div>
          <div className="rounded-xl bg-white/5 p-3 text-center"><p className="text-lg font-black text-white">{player.tickets}</p><p className="text-[10px] text-white/40">Tickets</p></div>
          <div className="rounded-xl bg-white/5 p-3 text-center"><p className="text-lg font-black text-white">{player.registrations}</p><p className="text-[10px] text-white/40">Tournaments</p></div>
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
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{b.reason}</p>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${b.active ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>{b.active ? "Active" : "Expired"}</span>
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
      </div>
    </div>
  );
}
