import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Plus, Pencil, Trash2, X, LoaderCircle, Globe,
  Calendar, Clock, CheckCircle, AlertCircle, Bell, ExternalLink,
  Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";

type SiteNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  startAt: string;
  expireAt: string | null;
  active: boolean;
  createdAt: string;
};

type TournamentAnnouncement = {
  id: string;
  tournamentId: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  tournament?: { id: string; title: string };
};

const emptyNotif = {
  title: "", message: "", type: "INFO", link: "", startAt: "", expireAt: "",
};

const emptyAnnounce = {
  tournamentId: "", title: "", message: "", type: "INFO",
};

export default function EmployeeNotifications() {
  const [tab, setTab] = useState<"notifications" | "announcements">("notifications");
  const [notifications, setNotifications] = useState<SiteNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [editNotif, setEditNotif] = useState<SiteNotification | null>(null);
  const [notifForm, setNotifForm] = useState(emptyNotif);
  const [submitting, setSubmitting] = useState(false);

  const [announcements, setAnnouncements] = useState<TournamentAnnouncement[]>([]);
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceForm, setAnnounceForm] = useState(emptyAnnounce);
  const [tournaments, setTournaments] = useState<Array<{ id: string; title: string; status: string }>>([]);

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/employee/notifications", { credentials: "include" });
      const d = await res.json();
      if (d.notifications) setNotifications(d.notifications);
    } catch {}
    setLoading(false);
  };

  const loadAnnouncements = async () => {
    setAnnounceLoading(true);
    try {
      const [announceRes, tournRes] = await Promise.all([
        fetch("/api/employee/announcements", { credentials: "include" }),
        fetch("/api/tournaments/staff", { credentials: "include" }),
      ]);
      const ad = await announceRes.json();
      const td = await tournRes.json();
      if (ad.announcements) {
        const res = await fetch("/api/tournaments/staff", { credentials: "include" });
        const tournData = await res.json();
        const tournMap = new Map((tournData.tournaments || []).map((t: any) => [t.id, t]));
        setAnnouncements(ad.announcements.map((a: any) => ({ ...a, tournament: tournMap.get(a.tournamentId) })));
      }
      if (td.tournaments) setTournaments(td.tournaments);
    } catch {}
    setAnnounceLoading(false);
  };

  useEffect(() => {
    loadNotifications();
    loadAnnouncements();
  }, []);

  const openCreateNotif = () => {
    setEditNotif(null);
    setNotifForm({
      ...emptyNotif,
      startAt: new Date().toISOString().slice(0, 16),
    });
    setShowNotifModal(true);
  };

  const openEditNotif = (n: SiteNotification) => {
    setEditNotif(n);
    setNotifForm({
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link || "",
      startAt: new Date(n.startAt).toISOString().slice(0, 16),
      expireAt: n.expireAt ? new Date(n.expireAt).toISOString().slice(0, 16) : "",
    });
    setShowNotifModal(true);
  };

  const handleNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...notifForm,
        link: notifForm.link || undefined,
        expireAt: notifForm.expireAt || undefined,
        startAt: notifForm.startAt || undefined,
      };

      const res = await fetch(
        editNotif ? "/api/employee/notifications/update" : "/api/employee/notifications/create",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify(editNotif ? { ...body, id: editNotif.id } : body),
        },
      );
      const d = await res.json();
      if (d.ok) {
        toast.success(editNotif ? "Notification updated!" : "Notification created!");
        setShowNotifModal(false);
        loadNotifications();
      } else {
        toast.error(d.error || "Failed.");
      }
    } catch { toast.error("Something went wrong."); }
    setSubmitting(false);
  };

  const handleDeleteNotif = async (id: string) => {
    if (!confirm("Delete this notification?")) return;
    const res = await fetch("/api/employee/notifications/delete", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Deleted."); loadNotifications(); }
    else toast.error(d.error || "Failed.");
  };

  const toggleNotifActive = async (n: SiteNotification) => {
    const res = await fetch("/api/employee/notifications/update", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id: n.id, active: !n.active }),
    });
    const d = await res.json();
    if (d.ok) { toast.success(!n.active ? "Notification enabled." : "Notification disabled."); loadNotifications(); }
    else toast.error(d.error || "Failed.");
  };

  const handleAnnounceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employee/announcements/create", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify(announceForm),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Announcement posted!"); setShowAnnounceModal(false); setAnnounceForm(emptyAnnounce); loadAnnouncements(); }
    else toast.error(d.error || "Failed.");
  };

  const handleDeleteAnnounce = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetch("/api/employee/announcements/delete", {
      method: "POST", headers: { "content-type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id }),
    });
    const d = await res.json();
    if (d.ok) { toast.success("Deleted."); loadAnnouncements(); }
    else toast.error(d.error || "Failed.");
  };

  const typeColors: Record<string, string> = {
    INFO: "text-[var(--hub-blue)]",
    WARNING: "text-yellow-400",
    URGENT: "text-red-400",
    TOURNAMENT: "text-green-400",
    MAINTENANCE: "text-orange-400",
    REMINDER: "text-purple-400",
    UPDATE: "text-[var(--hub-blue)]",
  };

  const typeBadge: Record<string, string> = {
    INFO: "bg-[var(--hub-blue)]/20",
    WARNING: "bg-yellow-500/20",
    URGENT: "bg-red-500/20",
    TOURNAMENT: "bg-green-500/20",
    MAINTENANCE: "bg-orange-500/20",
    REMINDER: "bg-purple-500/20",
    UPDATE: "bg-[var(--hub-blue)]/20",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Notifications &amp; Announcements</h1>
          <p className="mt-1 text-sm text-white/50">Create site-wide push notifications and tournament-specific announcements.</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b border-white/10">
        {(["notifications", "announcements"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${tab === t ? "border-[var(--hub-blue)] text-white" : "border-transparent text-white/40 hover:text-white/60"}`}>
            {t === "notifications" ? (
              <><Globe className="h-4 w-4 inline mr-1.5" />Site Notifications</>
            ) : (
              <><Megaphone className="h-4 w-4 inline mr-1.5" />Tournament Announcements</>
            )}
          </button>
        ))}
      </div>

      {tab === "notifications" && (
        <>
          <div className="mt-4 flex justify-end">
            <button onClick={openCreateNotif} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_16px_rgba(255,138,42,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_20px_rgba(255,138,42,0.3)]">
              <Plus className="h-4 w-4" /> New Notification
            </button>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
              <Bell className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-3 text-white/40">No notifications yet.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {notifications.map((n) => (
                <motion.div key={n.id} layout className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${typeBadge[n.type] || "bg-white/10"} ${typeColors[n.type] || "text-white"}`}>{n.type}</span>
                        <h3 className="text-base font-bold text-white truncate">{n.title}</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] ${n.active ? "text-green-400" : "text-white/30"}`}>
                          {n.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {n.active ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/60">{n.message}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/30">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Start: {new Date(n.startAt).toLocaleDateString()}</span>
                        {n.expireAt && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Expires: {new Date(n.expireAt).toLocaleDateString()}</span>}
                        {n.link && <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" />{n.link}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => toggleNotifActive(n)} className={`rounded-lg border p-1.5 transition-colors ${n.active ? "border-white/10 text-white/50 hover:bg-white/10" : "border-green-500/30 text-green-400/70 hover:bg-green-500/10"}`}>
                        {n.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button onClick={() => openEditNotif(n)} className="rounded-lg border border-white/10 p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteNotif(n.id)} className="rounded-lg border border-red-500/20 p-1.5 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "announcements" && (
        <>
          <div className="mt-4 flex justify-end">
            <button onClick={() => { setAnnounceForm(emptyAnnounce); setShowAnnounceModal(true); }} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_16px_rgba(255,138,42,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_20px_rgba(255,138,42,0.3)]">
              <Plus className="h-4 w-4" /> New Announcement
            </button>
          </div>

          {announceLoading ? (
            <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]" />)}</div>
          ) : announcements.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-white/20" />
              <p className="mt-3 text-white/40">No announcements yet.</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {announcements.map((a) => (
                <motion.div key={a.id} layout className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${typeBadge[a.type] || "bg-white/10"} ${typeColors[a.type] || "text-white"}`}>{a.type}</span>
                        <h3 className="text-base font-bold text-white">{a.title}</h3>
                        {a.tournament && (
                          <span className="text-[10px] text-white/30 bg-white/5 rounded-full px-2 py-0.5">
                            {a.tournament.title}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-white/60">{a.message}</p>
                      <p className="mt-1 text-[11px] text-white/30">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => handleDeleteAnnounce(a.id)} className="rounded-lg border border-red-500/20 p-1.5 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400 shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Notification Modal */}
      <AnimatePresence>
        {showNotifModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">{editNotif ? "Edit Notification" : "Create Notification"}</h2>
                <button onClick={() => setShowNotifModal(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleNotifSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-white/50">Type</label>
                  <select value={notifForm.type} onChange={(e) => setNotifForm((prev) => ({ ...prev, type: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="URGENT">Urgent</option>
                    <option value="TOURNAMENT">Tournament</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="UPDATE">Update</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Title *</label>
                  <input type="text" value={notifForm.title} onChange={(e) => setNotifForm((prev) => ({ ...prev, title: e.target.value }))} required placeholder="Maintenance downtime" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Message *</label>
                  <textarea value={notifForm.message} onChange={(e) => setNotifForm((prev) => ({ ...prev, message: e.target.value }))} required rows={3} placeholder="Notification message..." className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Link (optional)</label>
                  <input type="url" value={notifForm.link} onChange={(e) => setNotifForm((prev) => ({ ...prev, link: e.target.value }))} placeholder="https://hubmc.net/tournaments" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-white/50">Start At *</label>
                    <input type="datetime-local" value={notifForm.startAt} onChange={(e) => setNotifForm((prev) => ({ ...prev, startAt: e.target.value }))} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Expire At (optional)</label>
                    <input type="datetime-local" value={notifForm.expireAt} onChange={(e) => setNotifForm((prev) => ({ ...prev, expireAt: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowNotifModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] transition-all hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)] disabled:opacity-50">
                    {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : editNotif ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Announcement Modal */}
      <AnimatePresence>
        {showAnnounceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Post Tournament Announcement</h2>
                <button onClick={() => setShowAnnounceModal(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleAnnounceSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-white/50">Tournament *</label>
                  <select value={announceForm.tournamentId} onChange={(e) => setAnnounceForm((prev) => ({ ...prev, tournamentId: e.target.value }))} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    <option value="">Select a tournament</option>
                    {tournaments.map((t) => <option key={t.id} value={t.id}>{t.title} ({t.status})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Type</label>
                  <select value={announceForm.type} onChange={(e) => setAnnounceForm((prev) => ({ ...prev, type: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                    <option value="INFO">Info</option>
                    <option value="URGENT">Urgent</option>
                    <option value="REMINDER">Reminder</option>
                    <option value="UPDATE">Update</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Title *</label>
                  <input type="text" value={announceForm.title} onChange={(e) => setAnnounceForm((prev) => ({ ...prev, title: e.target.value }))} required placeholder="Match starting soon!" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-white/50">Message *</label>
                  <textarea value={announceForm.message} onChange={(e) => setAnnounceForm((prev) => ({ ...prev, message: e.target.value }))} required rows={3} placeholder="Details of the announcement..." className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAnnounceModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70">Cancel</button>
                  <button type="submit" className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]">Post</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
