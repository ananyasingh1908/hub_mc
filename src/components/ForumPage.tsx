import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  MessageSquare, Users, ArrowRight, LoaderCircle, Megaphone,
  Shield, Bug, Lightbulb, Swords, Headset, Handshake,
  MessagesSquare, LifeBuoy, Hammer, Coffee,
} from "lucide-react";
import { useAuthSession } from "@/lib/auth/client";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  threadCount: number;
  postCount: number;
};

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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  megaphone: Megaphone,
  shield: Shield,
  bug: Bug,
  lightbulb: Lightbulb,
  swords: Swords,
  headset: Headset,
  handshake: Handshake,
  message: MessageSquare,
  "messages-square": MessagesSquare,
  users: Users,
  "life-buoy": LifeBuoy,
  hammer: Hammer,
  coffee: Coffee,
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

export default function ForumPage() {
  const { data: session } = useAuthSession();
  const user = session?.user;
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/forum/categories").then((r) => r.json()),
      fetch("/api/forum/threads").then((r) => r.json()),
    ])
      .then(([catData, threadData]) => {
        setCategories(catData.categories ?? []);
        setThreads(threadData.threads ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        {/* Hero */}
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[var(--hub-blue)]">
            Community
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">
            HUBMC Forum
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/66 md:text-lg">
            Discuss strategies, share clips, report bugs, and connect with the community.
          </p>
        </div>

        {/* CTA */}
        {user?.customerId && (
          <div className="mt-8">
            <Link
              to="/forum/create"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-orange-400"
            >
              <MessageSquare className="h-4 w-4" /> Create New Thread
            </Link>
          </div>
        )}

        {loading ? (
          <div className="mt-14 flex min-h-64 items-center justify-center rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)]">
            <div className="flex items-center gap-3 text-white/68">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--hub-blue)]" />
              Loading forum...
            </div>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-8">
              {/* Categories */}
              <div id="categories">
                <h2 className="text-2xl font-black text-white mb-6">Categories</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categories.map((cat) => {
                    const IconComp = ICON_MAP[cat.icon || "message"] || MessageSquare;
                    return (
                      <Link
                        key={cat.id}
                        to="/forum/$categorySlug"
                        params={{ categorySlug: cat.slug }}
                        className="group flex items-start gap-4 rounded-2xl border border-white/8 bg-[rgba(11,11,11,0.92)] p-5 transition-all hover:border-[rgba(62,162,255,0.25)] hover:bg-[rgba(62,162,255,0.06)]"
                      >
                        <div className="rounded-xl bg-[rgba(62,162,255,0.12)] p-3 text-[var(--hub-blue)]">
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-white group-hover:text-[var(--hub-blue)]">
                            {cat.name}
                          </div>
                          {cat.description && (
                            <p className="mt-1 text-xs text-white/50 line-clamp-2">
                              {cat.description}
                            </p>
                          )}
                          <div className="mt-2 flex gap-4 text-[11px] text-white/35">
                            <span>{cat.threadCount} threads</span>
                            <span>{cat.postCount} posts</span>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 text-white/20 group-hover:text-[var(--hub-blue)]" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Latest Threads */}
              <div>
                <h2 className="text-2xl font-black text-white mb-6">Latest Threads</h2>
                {threads.length === 0 ? (
                  <div className="rounded-2xl border border-white/8 bg-[rgba(11,11,11,0.92)] p-8 text-center text-white/50">
                    No threads yet. Be the first to start a discussion!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threads.slice(0, 20).map((thread) => (
                      <Link
                        key={thread.id}
                        to="/forum/thread/$threadId"
                        params={{ threadId: thread.id }}
                        className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-[rgba(11,11,11,0.92)] p-4 transition-all hover:border-[rgba(62,162,255,0.25)] hover:bg-[rgba(62,162,255,0.06)]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {thread.isPinned && (
                              <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-400">
                                PINNED
                              </span>
                            )}
                            <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
                              {thread.categoryName}
                            </span>
                          </div>
                          <div className="mt-1 font-semibold text-white group-hover:text-[var(--hub-blue)] truncate">
                            {thread.title}
                          </div>
                          <div className="mt-1 flex gap-4 text-xs text-white/40">
                            <span>{thread.authorName}</span>
                            <span>{thread.replyCount} replies</span>
                            <span>{thread.viewCount} views</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-white/35">
                            {thread.lastReplyAt
                              ? timeAgo(thread.lastReplyAt)
                              : timeAgo(thread.createdAt)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <h3 className="text-xl font-black text-white">Forum Stats</h3>
                <div className="mt-6 space-y-4">
                  {[
                    { label: "Categories", value: String(categories.length) },
                    { label: "Threads", value: String(threads.length) },
                    { label: "Posts", value: String(categories.reduce((s, c) => s + c.postCount, 0)) },
                  ].map((stat) => (
                    <div key={stat.label} className="flex justify-between text-sm">
                      <span className="text-white/50">{stat.label}</span>
                      <span className="font-bold text-white">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
                <h3 className="text-xl font-black text-white">Quick Links</h3>
                <div className="mt-6 space-y-3">
                  <a
                    href="#categories"
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-sm font-semibold text-black hover:bg-orange-400"
                  >
                    <MessageSquare className="h-4 w-4" /> Browse Forum
                  </a>
                  {!user?.customerId && (
                    <Link
                      to="/login"
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(62,162,255,0.28)] bg-[rgba(62,162,255,0.08)] text-sm font-semibold text-white hover:bg-[rgba(62,162,255,0.16)]"
                    >
                      Login to Post
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}
