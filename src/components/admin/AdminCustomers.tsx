import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, ChevronDown, ChevronUp, DollarSign } from "lucide-react";

type Customer = { id: string; minecraftUsername: string; minecraftUuid: string; avatarUrl: string | null; country: string | null; email: string; totalSpent: number; purchaseCount: number; lastLoginAt: string | null; createdAt: string };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCustomers = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?page=${p}&limit=20`, { credentials: "include" });
      const d = await res.json();
      setCustomers(d.customers ?? []);
      setTotalPages(d.pagination?.totalPages ?? 1);
      setTotal(d.pagination?.total ?? 0);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(page); }, [page]);

  const filtered = customers.filter((c) =>
    !search || c.minecraftUsername?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Customers</h1>
          <p className="mt-2 text-white/56">{customers.length} registered customers</p>
        </div>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="h-11 w-full rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] pl-10 pr-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-3 text-white/50">No customers found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((c) => (
            <motion.div key={c.id} layout className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)]">
              <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.02]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgba(62,162,255,0.12)]">
                  {c.avatarUrl ? <img src={c.avatarUrl} className="h-full w-full object-cover" /> :
                    <span className="text-sm font-bold text-[var(--hub-blue)]">{c.minecraftUsername?.[0]}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{c.minecraftUsername}</div>
                  <div className="mt-0.5 text-xs text-white/48">{c.email}</div>
                </div>
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-semibold text-white">₹{Number(c.totalSpent).toFixed(2)}</div>
                  <div className="text-xs text-white/48">{c.purchaseCount} purchases</div>
                </div>
                {expanded === c.id ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </button>

              {expanded === c.id && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Details</div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-white/48">UUID</span><span className="font-mono text-xs text-white/50">{c.minecraftUuid}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Country</span><span className="text-white/70">{c.country ?? "N/A"}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Joined</span><span className="text-white/70">{new Date(c.createdAt).toLocaleDateString()}</span></div>
                        {c.lastLoginAt && <div className="flex justify-between"><span className="text-white/48">Last Login</span><span className="text-white/70">{new Date(c.lastLoginAt).toLocaleDateString()}</span></div>}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Spending</div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-white/48">Total Spent</span><span className="flex items-center gap-1 font-semibold text-green-400"><DollarSign className="h-3 w-3" />{Number(c.totalSpent).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Orders</span><span className="text-white/70">{c.purchaseCount}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Previous</button>
              <span className="text-sm text-white/40">Page {page} of {totalPages} ({total} total)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Next</button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
