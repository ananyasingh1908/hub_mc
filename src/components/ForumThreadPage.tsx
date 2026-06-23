import { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MessageSquare, LoaderCircle, ChevronLeft, Eye, Pin,
  Lock, Send, Trash2, Shield,
} from "lucide-react";
import { useAuthSession } from "@/lib/auth/client";

type Thread = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  authorId: string;
  authorName: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  isPinned: boolean;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
};

type Reply = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
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
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ForumThreadPage() {
  const { threadId } = useParams({ strict: false }) as { threadId: string };
  const { data: session } = useAuthSession();
  const user = session?.user;
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isStaff = user?.role === "SUPER_ADMIN" || user?.role === "EMPLOYEE";

  const loadThread = () => {
    fetch(`/api/forum/thread?id=${threadId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setThread(data.thread ?? null);
        setReplies(data.replies ?? []);
      })
      .catch((err) => {
        console.error("[Forum] Failed to load thread:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadThread(); }, [threadId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/forum/replies/create", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, content: replyContent.trim() }),
      });
      const text = await res.text();
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`Server error (${res.status}). Please try again.`);
        return;
      }
      if (res.ok && data.ok) {
        setReplyContent("");
        loadThread();
      } else if (res.status === 401) {
        setError("You must be signed in to reply. Please log in first.");
      } else {
        setError((data.error as string) || "Failed to post reply.");
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerate = async (action: string, value?: any) => {
    await fetch("/api/forum/moderate", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId, action, value }),
    });
    loadThread();
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("Delete this reply?")) return;
    await fetch("/api/forum/replies/delete", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ replyId, hide: true }),
    });
    loadThread();
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16">
        <div className="flex min-h-64 items-center justify-center rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)]">
          <LoaderCircle className="h-6 w-6 animate-spin text-[var(--hub-blue)]" />
        </div>
      </section>
    );
  }

  if (!thread) {
    return (
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16">
        <div className="rounded-[28px] border border-white/8 bg-[rgba(11,11,11,0.92)] p-12 text-center text-white/50">
          Thread not found.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 md:pt-24">
        <Link
          to="/forum/$categorySlug"
          params={{ categorySlug: thread.categorySlug }}
          className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-[var(--hub-blue)] mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> {thread.categoryName}
        </Link>

        {/* Thread Header */}
        <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6 md:p-8">
          <div className="flex items-center gap-2 flex-wrap">
            {thread.isPinned && (
              <span className="inline-flex items-center gap-1 rounded bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                <Pin className="h-3 w-3" /> PINNED
              </span>
            )}
            {thread.status === "LOCKED" && (
              <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                <Lock className="h-3 w-3" /> LOCKED
              </span>
            )}
            <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
              {thread.categoryName}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-black text-white md:text-4xl">
            {thread.title}
          </h1>

          <div className="mt-4 flex items-center gap-4 text-sm text-white/50">
            <span className="font-semibold text-white/70">{thread.authorName}</span>
            <span>{timeAgo(thread.createdAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {thread.viewCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {thread.replyCount}
            </span>
          </div>

          {/* Staff Moderation Bar */}
          {isStaff && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
              <button
                onClick={() => handleModerate("pin", !thread.isPinned)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
              >
                <Pin className="h-3 w-3" /> {thread.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => handleModerate("lock", thread.status !== "LOCKED")}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
              >
                <Lock className="h-3 w-3" /> {thread.status === "LOCKED" ? "Unlock" : "Lock"}
              </button>
              <button
                onClick={() => handleModerate("hide")}
                className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400/70 hover:bg-red-500/10"
              >
                <Shield className="h-3 w-3" /> Hide Thread
              </button>
            </div>
          )}

          {/* Thread Content */}
          <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-white/78">
            {thread.content}
          </div>
        </div>

        {/* Replies */}
        <div className="mt-8">
          <h2 className="text-xl font-black text-white mb-4">
            Replies ({replies.length})
          </h2>

          {replies.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-[rgba(11,11,11,0.92)] p-6 text-center text-sm text-white/40">
              No replies yet. Be the first to respond!
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-2xl border border-white/8 bg-[rgba(11,11,11,0.92)] p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--hub-blue)]/15 text-xs font-bold text-[var(--hub-blue)]">
                        {reply.authorName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-white">
                          {reply.authorName}
                        </span>
                        <span className="ml-2 text-xs text-white/35">
                          {timeAgo(reply.createdAt)}
                        </span>
                      </div>
                    </div>
                    {isStaff && (
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="rounded p-1 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                        title="Hide reply"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/72">
                    {reply.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Box */}
        {user?.customerId && thread.status !== "LOCKED" && thread.status !== "HIDDEN" && (
          <form onSubmit={handleReply} className="mt-8 rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
            <h3 className="text-lg font-bold text-white mb-3">Post a Reply</h3>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              maxLength={5000}
              className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[rgba(62,162,255,0.45)]"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--hub-blue)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#51adff] disabled:opacity-40"
              >
                {submitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Reply
              </button>
            </div>
          </form>
        )}

        {!user?.customerId && (
          <div className="mt-8 rounded-[28px] border border-white/8 bg-[rgba(11,11,11,0.92)] p-6 text-center">
            <p className="text-sm text-white/50">
              <Link to="/login" className="text-[var(--hub-blue)] underline">Log in</Link> to post a reply.
            </p>
          </div>
        )}

        {thread.status === "LOCKED" && (
          <div className="mt-8 rounded-[28px] border border-red-500/20 bg-red-500/5 p-6 text-center">
            <Lock className="mx-auto h-5 w-5 text-red-400/60" />
            <p className="mt-2 text-sm text-red-400/70">This thread is locked. No new replies can be posted.</p>
          </div>
        )}
      </section>
  );
}
