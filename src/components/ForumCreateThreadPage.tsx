import { useState, useEffect } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, LoaderCircle, Send, AlertCircle } from "lucide-react";
import { useAuthSession } from "@/lib/auth/client";

type Category = {
  id: string;
  slug: string;
  name: string;
};

export default function ForumCreateThreadPage() {
  const navigate = useNavigate();
  const { data: session, isPending: authLoading } = useAuthSession();
  const user = session?.user;

  const searchParams = useSearch({ strict: false }) as { category?: string };
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams?.category || "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/forum/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  if (authLoading) {
    return (
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16">
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-[var(--hub-blue)]" />
        </div>
      </section>
    );
  }

  if (!user?.customerId) {
    return (
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16">
        <div className="rounded-[28px] border border-white/8 bg-[rgba(11,11,11,0.92)] p-12 text-center">
          <p className="text-white/60">
            You must be <Link to="/login" className="text-[var(--hub-blue)] underline">logged in</Link> to create a thread.
          </p>
        </div>
      </section>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedCategory) {
      setError("Please select a category.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (!content.trim()) {
      setError("Please enter content.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/forum/threads/create", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory,
          title: title.trim(),
          content: content.trim(),
        }),
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
        navigate({ to: "/forum/thread/$threadId", params: { threadId: data.threadId as string } });
      } else if (res.status === 401) {
        setError("You must be signed in to create a thread. Please log in first.");
      } else {
        setError((data.error as string) || "Failed to create thread. Please try again.");
      }
    } catch (err) {
      console.error("[Forum] Create thread error:", err);
      setError("Network error — please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 md:pt-24">
        <Link
          to="/forum"
          className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-[var(--hub-blue)] mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Forum
        </Link>

        <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
          Create Thread
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 rounded-[28px] border border-white/10 bg-[rgba(11,11,11,0.92)] p-6 md:p-8 space-y-5">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white/72">Category *</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-black/60 px-3 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white/72">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your thread about?"
              maxLength={200}
              className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[rgba(62,162,255,0.45)]"
            />
            <p className="mt-1 text-xs text-white/30">{title.length}/200</p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-white/72">Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post..."
              rows={10}
              maxLength={10000}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[rgba(62,162,255,0.45)]"
            />
            <p className="mt-1 text-xs text-white/30">{content.length}/10,000</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[rgba(255,138,42,0.25)] bg-[rgba(255,138,42,0.08)] px-4 py-3 text-sm text-white/82">
              <AlertCircle className="h-4 w-4 shrink-0 text-[var(--hub-orange)]" />
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-40"
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Thread
            </button>
          </div>
        </form>
      </section>
  );
}
