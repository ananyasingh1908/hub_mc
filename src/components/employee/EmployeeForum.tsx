import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, Search, Trash2, Eye, EyeOff, Lock, Filter,
  ChevronLeft, ChevronRight, AlertTriangle, LoaderCircle,
} from "lucide-react";

type ForumThread = {
  id: string; categoryId: string; categorySlug: string; categoryName: string;
  authorId: string; authorName: string; title: string; slug: string;
  content: string; status: string; isPinned: boolean; replyCount: number;
  viewCount: number; lastReplyAt: string | null; createdAt: string; updatedAt: string;
};

type ForumCategory = {
  id: string; slug: string; name: string; description: string | null;
  icon: string | null; sortOrder: number; isActive: boolean;
  threadCount: number; postCount: number;
};

type ForumReply = {
  id: string; threadId: string; authorId: string; authorName: string;
  content: string; status: string; createdAt: string; updatedAt: string;
};

const statusColors: Record<string, string> = {
  OPEN: "text-green-400 bg-green-500/10 border-green-500/20",
  LOCKED: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  HIDDEN: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function EmployeeForum() {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [threadReplies, setThreadReplies] = useState<ForumReply[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/forum/staff/threads?${params}`, { credentials: "include" });
      const data = await res.json();
      setThreads(data.threads ?? []);
      setTotalPages(data.pagination?.pages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    } catch {}
    finally { setLoading(false); }
  }, [page, search, categoryFilter, statusFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/forum/staff/categories", { credentials: "include" });
      const data = await res.json();
      setCategories(data.categories ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openThreadDetail = async (thread: ForumThread) => {
    setSelectedThread(thread);
    setLoadingThread(true);
    setThreadReplies([]);
    try {
      const res = await fetch(`/api/forum/staff/thread?id=${thread.id}`, { credentials: "include" });
      const data = await res.json();
      setThreadReplies(data.replies ?? []);
    } catch {}
    finally { setLoadingThread(false); }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const res = await fetch("/api/forum/staff/thread/delete", {
        method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
        body: JSON.stringify({ threadId }),
      });
      const d = await res.json();
      if (d.ok) {
        setSelectedThread(null);
        fetchThreads();
      }
    } catch {}
    setConfirmDelete(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Forum Moderation</h1>
          <p className="mt-2 text-white/50">Review and moderate forum threads and replies.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search threads..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--hub-blue)]/50"
          />
        </div>
        <select
          value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 outline-none focus:border-[var(--hub-blue)]/50"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select
          value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 outline-none focus:border-[var(--hub-blue)]/50"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="LOCKED">Locked</option>
          <option value="HIDDEN">Hidden</option>
        </select>
      </div>

      {/* Threads Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-white/40">
                <th className="px-4 py-3">Thread</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Replies</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-white/30"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : threads.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-white/30">No threads found.</td></tr>
              ) : threads.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <button onClick={() => openThreadDetail(t)} className="text-left hover:underline">
                      <span className="font-semibold text-white">{t.title}</span>
                      {t.isPinned && <span className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-yellow-400">Pinned</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-white/60">{t.authorName}</td>
                  <td className="px-4 py-3 text-white/60">{t.categoryName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[t.status] ?? "text-white/40"}`}>
                      {t.status === "LOCKED" ? <Lock className="h-2.5 w-2.5" /> : t.status === "HIDDEN" ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />} {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-white/50">{t.replyCount}</td>
                  <td className="px-4 py-3 text-right text-white/50">{t.viewCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openThreadDetail(t)} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white" title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      {confirmDelete === t.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteThread(t.id)} className="rounded-lg bg-red-500/20 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/30">Confirm</button>
                          <button onClick={() => setConfirmDelete(null)} className="rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/20">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(t.id)} className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-white/40">
          <span>{total} threads</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-white/60">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/10 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Thread Detail Modal */}
      {selectedThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedThread(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c0c] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white">{selectedThread.title}</h2>
                  {selectedThread.isPinned && <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-yellow-400">Pinned</span>}
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[selectedThread.status]}`}>{selectedThread.status}</span>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  by {selectedThread.authorName} in {selectedThread.categoryName} · {selectedThread.replyCount} replies · {selectedThread.viewCount} views
                </p>
              </div>
              <button onClick={() => setSelectedThread(null)} className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white"><span className="sr-only">Close</span>✕</button>
            </div>

            {/* Original Post */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="whitespace-pre-wrap text-sm text-white/80">{selectedThread.content}</p>
            </div>

            {/* Replies */}
            <h3 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wider text-white/40">Replies ({threadReplies.length})</h3>
            {loadingThread ? (
              <div className="flex justify-center py-8"><LoaderCircle className="h-5 w-5 animate-spin text-white/30" /></div>
            ) : threadReplies.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/30">No replies yet.</p>
            ) : (
              <div className="space-y-3">
                {threadReplies.map((r) => (
                  <div key={r.id} className={`rounded-xl border p-4 ${r.status === "HIDDEN" ? "border-red-500/20 bg-red-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white/60">{r.authorName}</span>
                      <div className="flex items-center gap-2">
                        {r.status === "HIDDEN" && <span className="text-[10px] font-bold uppercase text-red-400">Hidden</span>}
                        <span className="text-[10px] text-white/30">{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">{r.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Thread Actions */}
            <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4">
              {confirmDelete === selectedThread.id ? (
                <>
                  <span className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Delete this thread and all replies?</span>
                  <button onClick={() => deleteThread(selectedThread.id)} className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/30">Yes, Delete</button>
                  <button onClick={() => setConfirmDelete(null)} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/20">Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirmDelete(selectedThread.id)} className="flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-400/70 hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" /> Delete Thread
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
