import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Send, LoaderCircle, Globe, AlertTriangle, Info, CheckCircle, Edit3, Trash2, X, Eye, EyeOff } from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  active: boolean;
  startAt: string;
  expireAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "alert" | "announcement">("info");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editing, setEditing] = useState<Notification | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editType, setEditType] = useState("info");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotifications = useCallback(async (p: number) => {
    setLoadingList(true);
    try {
      const res = await fetch(`/api/employee/notifications?page=${p}&limit=20`, { credentials: "include" });
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {}
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { fetchNotifications(page); }, [page, fetchNotifications]);

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/platform/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), message: message.trim(), type }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: "Notification sent successfully!" });
        setTitle(""); setMessage(""); setType("info");
        fetchNotifications(1);
        setPage(1);
      } else {
        setResult({ ok: false, message: data.error || "Failed to send" });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    }
    finally { setSending(false); }
  };

  const openEdit = (n: Notification) => {
    setEditing(n);
    setEditTitle(n.title);
    setEditMessage(n.message);
    setEditType(n.type);
  };

  const saveEdit = async () => {
    if (!editing || !editTitle.trim() || !editMessage.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/employee/notifications/update", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, title: editTitle.trim(), message: editMessage.trim(), type: editType }),
      });
      if (res.ok) {
        setEditing(null);
        fetchNotifications(page);
      }
    } catch {}
    finally { setSaving(false); }
  };

  const toggleActive = async (n: Notification) => {
    try {
      await fetch("/api/employee/notifications/update", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id, active: !n.active }),
      });
      fetchNotifications(page);
    } catch {}
  };

  const deleteNotification = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/employee/notifications/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchNotifications(page);
      }
    } catch {}
    finally { setDeleting(false); }
  };

  const typeStyles: Record<string, { icon: any; color: string; bg: string }> = {
    info: { icon: Info, color: "text-[var(--hub-blue)]", bg: "bg-[rgba(62,162,255,0.12)]" },
    warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-[rgba(234,179,8,0.12)]" },
    alert: { icon: AlertTriangle, color: "text-red-400", bg: "bg-[rgba(239,68,68,0.12)]" },
    announcement: { icon: Megaphone, color: "text-[var(--hub-orange)]", bg: "bg-[rgba(255,138,42,0.12)]" },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* SECTION A: Composer */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Notifications</h1>
          <p className="mt-1 text-white/56">Send and manage global notifications for all players.</p>
        </div>
      </div>

      <div className="mt-8 max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
          <div className="flex items-center gap-2 text-lg font-bold text-white mb-6">
            <Globe className="h-5 w-5 text-[var(--hub-blue)]" />
            Send New Notification
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/40 mb-1.5">Notification Type</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(typeStyles).map(([key, style]) => {
                  const Icon = style.icon;
                  return (
                    <button key={key} onClick={() => setType(key as any)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold capitalize transition-all ${
                        type === key
                          ? `${style.bg} ${style.color} border-transparent`
                          : "border-white/10 text-white/40 hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {key}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/40 mb-1.5">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Server Maintenance Tonight"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--hub-blue)]/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/40 mb-1.5">Message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                placeholder="Enter notification message..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--hub-blue)]/40 resize-none"
              />
            </div>

            <button onClick={sendNotification} disabled={sending || !title.trim() || !message.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black opacity-100 shadow-[0_0_16px_rgba(255,138,42,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_20px_rgba(255,138,42,0.3)] disabled:opacity-50"
            >
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Send Notification"}
            </button>

            {result && (
              <div className={`rounded-xl border p-4 text-sm ${
                result.ok ? "border-green-500/20 bg-green-500/10 text-green-400" : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}>
                <div className="flex items-center gap-2">
                  {result.ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {result.message}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION B: Previous Notifications */}
      <div className="mt-10">
        <h2 className="text-xl font-black text-white">Previous Notifications</h2>
        <p className="mt-1 text-sm text-white/40">Manage, edit, or delete previously sent notifications.</p>

        {loadingList ? (
          <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
        ) : notifications.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-white/30" />
            <p className="mt-3 text-white/50">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {notifications.map((n) => {
              const style = typeStyles[n.type] ?? typeStyles.info;
              const Icon = style.icon;
              return (
                <div key={n.id} className="rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-4 transition-colors hover:border-white/20">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.bg}`}>
                      <Icon className={`h-4 w-4 ${style.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white truncate">{n.title}</h3>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          n.active ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white/40"
                        }`}>{n.active ? "Active" : "Inactive"}</span>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${style.bg} ${style.color}`}>{n.type}</span>
                      </div>
                      <p className="mt-1 text-sm text-white/50 line-clamp-2">{n.message}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-white/30">
                        <span>Created {new Date(n.createdAt).toLocaleString("en-IN")}</span>
                        {n.expireAt && <span>Expires {new Date(n.expireAt).toLocaleString("en-IN")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => toggleActive(n)} title={n.active ? "Deactivate" : "Activate"}
                        className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                        {n.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button onClick={() => openEdit(n)} title="Edit"
                        className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-[var(--hub-blue)] transition-colors">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(n)} title="Delete"
                        className="rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Previous</button>
                <span className="text-sm text-white/40">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Next</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !saving && setEditing(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.96)] p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Edit Notification</h3>
                <button onClick={() => !saving && setEditing(null)} className="rounded-lg p-1 text-white/40 hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1.5">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(typeStyles).map(([key, style]) => {
                      const Icon = style.icon;
                      return (
                        <button key={key} onClick={() => setEditType(key)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold capitalize transition-all ${
                            editType === key
                              ? `${style.bg} ${style.color} border-transparent`
                              : "border-white/10 text-white/40 hover:bg-white/[0.04]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" /> {key}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1.5">Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--hub-blue)]/40" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1.5">Message</label>
                  <textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={4}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--hub-blue)]/40 resize-none" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => !saving && setEditing(null)} disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 disabled:opacity-50">Cancel</button>
                <button onClick={saveEdit} disabled={saving || !editTitle.trim() || !editMessage.trim()}
                  className="flex items-center gap-2 rounded-xl bg-[var(--hub-blue)] px-4 py-2 text-sm font-bold text-black hover:shadow-[0_0_16px_rgba(62,162,255,0.3)] disabled:opacity-50">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !deleting && setDeleteTarget(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.96)] p-6"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white">Delete Notification</h3>
              <p className="mt-2 text-sm text-white/60">Are you sure you want to permanently delete this notification?</p>
              <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-sm font-semibold text-white">{deleteTarget.title}</p>
                <p className="text-xs text-white/40 mt-1 line-clamp-2">{deleteTarget.message}</p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => !deleting && setDeleteTarget(null)} disabled={deleting}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 disabled:opacity-50">Cancel</button>
                <button onClick={deleteNotification} disabled={deleting}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
                  {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
