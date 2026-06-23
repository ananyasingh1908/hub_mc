import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, ChevronDown, ChevronUp, DollarSign, Trash2, X, LoaderCircle } from "lucide-react";

type Customer = { id: string; minecraftUsername: string; minecraftUuid: string; avatarUrl: string | null; country: string | null; email: string; totalSpent: number; purchaseCount: number; lastLoginAt: string | null; createdAt: string };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/customers/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", msg: data.error || "Failed to delete customer" });
        return;
      }
      setToast({ type: "success", msg: data.message || "Customer removed" });
      setDeleteTarget(null);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch {
      setToast({ type: "error", msg: "Network error" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = customers.filter((c) =>
    !search || c.minecraftUsername?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Customers</h1>
          <p className="mt-2 text-white/56">{total} customers with purchase history</p>
        </div>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="h-11 w-full rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] pl-10 pr-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mt-4 rounded-xl border p-3 text-sm ${toast.type === "success" ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

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
                  {c.avatarUrl ? <img src={c.avatarUrl} alt={c.minecraftUsername || "Customer avatar"} className="h-full w-full object-cover" /> :
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
                  <div className="mt-4 flex justify-end">
                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20">
                      <Trash2 className="h-3.5 w-3.5" />
                      {c.purchaseCount > 0 ? "Archive" : "Delete"}
                    </button>
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !deleting && setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.96)] p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {deleteTarget.purchaseCount > 0 ? "Archive Customer" : "Delete Customer"}
                </h3>
                <button onClick={() => !deleting && setDeleteTarget(null)} className="rounded-lg p-1 text-white/40 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <p className="text-sm text-white/70">
                  {deleteTarget.purchaseCount > 0
                    ? `This customer has ${deleteTarget.purchaseCount} order(s). They will be archived (hidden from views) but order history is preserved.`
                    : "This customer has no purchase history. They will be permanently deleted."}
                </p>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-sm font-semibold text-white">{deleteTarget.minecraftUsername}</p>
                  <p className="text-xs text-white/40">{deleteTarget.email}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => !deleting && setDeleteTarget(null)} disabled={deleting}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 disabled:opacity-50">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                  {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {deleteTarget.purchaseCount > 0 ? "Archive" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
