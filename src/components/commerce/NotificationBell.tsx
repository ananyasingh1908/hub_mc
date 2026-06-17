import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useNotificationStore } from "@/store/notification-store";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
  } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(62,162,255,0.22)] bg-[rgba(62,162,255,0.08)] text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,138,42,0.3)] hover:bg-[rgba(255,138,42,0.12)]"
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(62,162,255,0.35),transparent_70%)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
        <Bell className="relative z-10 h-4 w-4 text-[var(--hub-blue)] group-hover:text-[var(--hub-orange)]" />
        <AnimatePresence mode="popLayout">
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute -right-0.5 -top-0.5 z-20 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--hub-orange)] px-1 py-0.5 text-[10px] font-black text-black"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full mt-2 w-80 rounded-3xl border border-white/10 bg-[rgba(10,10,10,0.96)] p-2 text-white backdrop-blur-xl"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs text-[var(--hub-blue)] transition-colors hover:text-white"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="mt-1 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoaderCircle className="h-5 w-5 animate-spin text-white/40" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto h-6 w-6 text-white/20" />
                  <p className="mt-2 text-sm text-white/40">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        if (!n.read) markRead(n.id);
                      }}
                      className={`w-full rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.04] ${
                        !n.read ? "bg-[rgba(62,162,255,0.06)]" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-sm font-semibold ${
                            !n.read ? "text-white" : "text-white/60"
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-white/35">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p
                        className={`mt-0.5 text-xs leading-4 ${
                          !n.read ? "text-white/70" : "text-white/40"
                        }`}
                      >
                        {n.message}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
