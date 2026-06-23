import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageSquare, ArrowRight, LoaderCircle, ChevronLeft } from "lucide-react";
import { useAuthSession } from "@/lib/auth/client";

type Thread = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  authorName: string;
  title: string;
  slug: string;
  status: string;
  isPinned: boolean;
  replyCount: number;
  viewCount: number;
  lastReplyAt: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ForumCategoryPage() {
  const { categorySlug } = useParams({ strict: false }) as { categorySlug: string };
  const { data: session } = useAuthSession();
  const user = session?.user;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadThreads = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/threads?category=${categorySlug}&page=${p}`);
      const data = await res.json();
      setThreads(data.threads ?? []);
      setCategoryName(data.threads?.[0]?.categoryName || categorySlug);
      setTotalPages(data.pagination?.pages ?? 1);
    } catch {}
    finally { setLoading(false); }
  }, [categorySlug]);

  useEffect(() => { loadThreads(page); }, [page, loadThreads]);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        {/* Breadcrumb */}
        <Link
          to="/forum"
          className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-[var(--hub-blue)] mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Forum
        </Link>

        <div className="max-w-3xl">
          <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
            {categoryName || categorySlug}
          </h1>
        </div>

        {user?.customerId && (
          <div className="mt-6">
            <Link
              to="/forum/create"
              search={{ category: categorySlug }}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-orange-400"
            >
              <MessageSquare className="h-4 w-4" /> Create New Thread
            </Link>
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex min-h-48 items-center justify-center rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)]">
            <div className="flex items-center gap-3 text-white/68">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--hub-blue)]" />
              Loading threads...
            </div>
          </div>
        ) : threads.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-white/8 bg-[rgba(11,11,11,0.92)] p-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-4 text-white/50">No threads in this category yet.</p>
            {user?.customerId && (
              <Link
                to="/forum/create"
                search={{ category: categorySlug }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-orange-400"
              >
                Start the first thread
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-2">
            {threads.map((thread) => (
              <Link
                key={thread.id}
                to="/forum/thread/$threadId"
                params={{ threadId: thread.id }}
                className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-[rgba(11,11,11,0.92)] p-5 transition-all hover:border-[rgba(62,162,255,0.25)] hover:bg-[rgba(62,162,255,0.06)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {thread.isPinned && (
                      <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">
                        PINNED
                      </span>
                    )}
                    {thread.status === "LOCKED" && (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-semibold text-white group-hover:text-[var(--hub-blue)]">
                    {thread.title}
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-white/40">
                    <span>by {thread.authorName}</span>
                    <span>{thread.replyCount} replies</span>
                    <span>{thread.viewCount} views</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-white/35">
                    {thread.lastReplyAt ? timeAgo(thread.lastReplyAt) : timeAgo(thread.createdAt)}
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-white/20 group-hover:text-[var(--hub-blue)]" />
                </div>
              </Link>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-6">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-9 w-9 rounded-lg text-sm font-bold transition-colors ${
                      p === page
                        ? "bg-[var(--hub-blue)] text-white"
                        : "border border-white/10 text-white/50 hover:bg-white/5"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
  );
}
