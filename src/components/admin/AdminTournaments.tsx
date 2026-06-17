import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Plus, Pencil, Trash2, Users, Calendar, Clock, Gamepad2,
  Sword, LoaderCircle, X, CheckCircle, AlertCircle, Award, Search,
} from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "@/components/ui/ImageUpload";

type Tournament = {
  id: string;
  title: string;
  bannerUrl: string | null;
  type: "SOLO" | "DUO" | "SQUAD";
  gameMode: string;
  dateTime: string;
  registrationDeadline: string;
  maxParticipants: number;
  entryFee: number | null;
  prizePool: string | null;
  discordLink: string | null;
  rules: string;
  serverIp: string | null;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  registrationsCount: number;
};

type Registration = {
  id: string;
  tournamentId: string;
  minecraftUsername: string;
  discordUsername: string;
  teamName: string | null;
  teamMembers: string | null;
  email: string;
  region: string;
  age: number | null;
  createdAt: string;
};

const emptyForm = {
  title: "", bannerUrl: "", type: "SOLO" as const, gameMode: "Bedwars",
  dateTime: "", registrationDeadline: "", maxParticipants: "50", entryFee: "",
  prizePool: "", discordLink: "", rules: "", serverIp: "",
};

export default function AdminTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTournament, setEditTournament] = useState<Tournament | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [filter, setFilter] = useState<string>("ALL");
  const [regPage, setRegPage] = useState(1);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [regTotal, setRegTotal] = useState(0);

  const load = async () => {
    try {
      const res = await fetch("/api/tournaments/staff", { credentials: "include" });
      const d = await res.json();
      if (d.tournaments) setTournaments(d.tournaments);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTournament(null);
    const now = new Date();
    const defaultDateTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const defaultDeadline = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
    setForm({
      ...emptyForm,
      dateTime: defaultDateTime.toISOString().slice(0, 16),
      registrationDeadline: defaultDeadline.toISOString().slice(0, 16),
    });
    setShowModal(true);
  };

  const openEdit = (t: Tournament) => {
    setEditTournament(t);
    setForm({
      title: t.title,
      bannerUrl: t.bannerUrl || "",
      type: t.type,
      gameMode: t.gameMode,
      dateTime: new Date(t.dateTime).toISOString().slice(0, 16),
      registrationDeadline: new Date(t.registrationDeadline).toISOString().slice(0, 16),
      maxParticipants: String(t.maxParticipants),
      entryFee: t.entryFee ? String(t.entryFee) : "",
      prizePool: t.prizePool || "",
      discordLink: t.discordLink || "",
      rules: t.rules,
      serverIp: t.serverIp || "",
    });
    setShowModal(true);
  };

  const toggleRegistrations = async (tournamentId: string) => {
    if (showRegistrations === tournamentId) {
      setShowRegistrations(null);
      return;
    }
    setShowRegistrations(tournamentId);
    setRegPage(1);
    setRegistrationsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/registrations?tournamentId=${tournamentId}&page=1&limit=20`, { credentials: "include" });
      const d = await res.json();
      if (d.registrations) setRegistrations(d.registrations);
      setRegTotalPages(d.pagination?.totalPages ?? 1);
      setRegTotal(d.pagination?.total ?? 0);
    } catch {}
    setRegistrationsLoading(false);
  };

  const loadRegistrationsPage = async (tournamentId: string, p: number) => {
    setRegPage(p);
    setRegistrationsLoading(true);
    try {
      const res = await fetch(`/api/tournaments/registrations?tournamentId=${tournamentId}&page=${p}&limit=20`, { credentials: "include" });
      const d = await res.json();
      if (d.registrations) setRegistrations(d.registrations);
      setRegTotalPages(d.pagination?.totalPages ?? 1);
      setRegTotal(d.pagination?.total ?? 0);
    } catch {}
    setRegistrationsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...form,
        maxParticipants: parseInt(form.maxParticipants),
        entryFee: form.entryFee ? parseFloat(form.entryFee) : null,
        dateTime: new Date(form.dateTime).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
      };

      const url = editTournament
        ? "/api/tournaments/staff/update"
        : "/api/tournaments/staff/create";
      const method = "POST";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editTournament ? { ...body, id: editTournament.id } : body),
      });
      const d = await res.json();
      if (d.ok) {
        toast.success(editTournament ? "Tournament updated!" : "Tournament created!");
        setShowModal(false);
        load();
      } else {
        toast.error(d.error || "Failed to save tournament.");
      }
    } catch {
      toast.error("Something went wrong.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tournament? This action cannot be undone.")) return;
    try {
      const res = await fetch("/api/tournaments/staff/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const d = await res.json();
      if (d.ok) {
        toast.success("Tournament deleted.");
        load();
      } else {
        toast.error(d.error || "Failed to delete.");
      }
    } catch {
      toast.error("Something went wrong.");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/tournaments/staff/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      const d = await res.json();
      if (d.ok) {
        toast.success(`Status changed to ${status}`);
        load();
      } else {
        toast.error(d.error || "Failed to update status.");
      }
    } catch {
      toast.error("Something went wrong.");
    }
  };

  const handleDeleteRegistration = async (registrationId: string) => {
    if (!confirm("Remove this registration?")) return;
    try {
      const res = await fetch("/api/tournaments/staff/delete-registration", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ registrationId }),
      });
      const d = await res.json();
      if (d.ok) {
        toast.success("Registration removed.");
        load();
        if (showRegistrations) loadRegistrationsPage(showRegistrations, regPage);
      } else {
        toast.error(d.error || "Failed to remove registration.");
      }
    } catch {
      toast.error("Something went wrong.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const filtered = filter === "ALL" ? tournaments : tournaments.filter((t) => t.status === filter);
  const statusCounts = { ALL: tournaments.length, UPCOMING: tournaments.filter((t) => t.status === "UPCOMING").length, LIVE: tournaments.filter((t) => t.status === "LIVE").length, COMPLETED: tournaments.filter((t) => t.status === "COMPLETED").length };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Tournaments</h1>
          <p className="mt-1 text-sm text-white/50">Create and manage HUBMC tournaments.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_16px_rgba(255,138,42,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_20px_rgba(255,138,42,0.3)]"
        >
          <Plus className="h-4 w-4" /> New Tournament
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["ALL", "UPCOMING", "LIVE", "COMPLETED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-[var(--hub-blue)]/20 text-[var(--hub-blue)]"
                : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {s} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)] p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-white/20" />
          <p className="mt-3 text-white/40">No tournaments found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] overflow-hidden"
            >
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white truncate">{t.title}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        t.status === "LIVE" ? "bg-green-500/20 text-green-400"
                        : t.status === "UPCOMING" ? "bg-[var(--hub-blue)]/20 text-[var(--hub-blue)]"
                        : "bg-white/10 text-white/40"
                      }`}>{t.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
                      <span className="flex items-center gap-1"><Gamepad2 className="h-3.5 w-3.5" />{t.gameMode}</span>
                      <span className="flex items-center gap-1"><Sword className="h-3.5 w-3.5" />{t.type}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(t.dateTime).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{t.registrationsCount}/{t.maxParticipants}</span>
                      {t.prizePool && <span className="flex items-center gap-1 text-[var(--hub-orange)]"><Award className="h-3.5 w-3.5" />{t.prizePool}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t.id, e.target.value)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="UPCOMING">Upcoming</option>
                      <option value="LIVE">Live</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                    <button onClick={() => openEdit(t)} className="rounded-lg border border-white/10 p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="rounded-lg border border-red-500/20 p-1.5 text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => toggleRegistrations(t.id)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-[var(--hub-blue)]"
                >
                  <Users className="h-3.5 w-3.5" />
                  {showRegistrations === t.id ? "Hide" : "View"} Registrations ({t.registrationsCount})
                </button>
                {showRegistrations === t.id && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    {registrationsLoading ? (
                      <LoaderCircle className="h-5 w-5 animate-spin text-[var(--hub-blue)]" />
                    ) : registrations.length === 0 ? (
                      <p className="text-sm text-white/30">No registrations yet.</p>
                    ) : (
                      <>
                        <div className="max-h-64 space-y-2 overflow-y-auto">
                          {registrations.map((r) => (
                            <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                              <div>
                                <span className="text-sm font-medium text-white">{r.minecraftUsername}</span>
                                <span className="ml-2 text-xs text-white/40">{r.discordUsername}</span>
                                {r.teamName && <span className="ml-2 text-xs text-white/30">[{r.teamName}]</span>}
                                <div className="mt-0.5 text-[11px] text-white/30">
                                  {r.email} &middot; {r.region}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteRegistration(r.id)}
                                className="rounded p-1 text-red-400/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        {regTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-3 pt-3">
                            <button disabled={regPage <= 1} onClick={() => loadRegistrationsPage(t.id, regPage - 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Previous</button>
                            <span className="text-xs text-white/40">Page {regPage} of {regTotalPages} ({regTotal} total)</span>
                            <button disabled={regPage >= regTotalPages} onClick={() => loadRegistrationsPage(t.id, regPage + 1)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Next</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.98)] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {editTournament ? "Edit Tournament" : "Create Tournament"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Title *</label>
                    <input type="text" name="title" value={form.title} onChange={handleInputChange} required placeholder="HUBMC Summer Championship" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Game Mode *</label>
                    <select name="gameMode" value={form.gameMode} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                      {["Bedwars", "Skywars", "PvP", "Survival", "UHC", "KitPvP", "Practice", "MiniGames", "BuildBattle", "Parkour"].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Type *</label>
                    <select name="type" value={form.type} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]">
                      <option value="SOLO">Solo</option>
                      <option value="DUO">Duo</option>
                      <option value="SQUAD">Squad</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Date & Time *</label>
                    <input type="datetime-local" name="dateTime" value={form.dateTime} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Registration Deadline *</label>
                    <input type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleInputChange} required className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Max Participants *</label>
                    <input type="number" name="maxParticipants" value={form.maxParticipants} onChange={handleInputChange} required min="2" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Entry Fee (₹, optional)</label>
                    <input type="number" name="entryFee" value={form.entryFee} onChange={handleInputChange} min="0" step="0.01" placeholder="0 = Free" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/50">Prize Pool</label>
                    <input type="text" name="prizePool" value={form.prizePool} onChange={handleInputChange} placeholder="₹50,000" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <ImageUpload value={form.bannerUrl} onChange={(url) => setForm({ ...form, bannerUrl: url ?? "" })} label="Banner Image" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Discord Link</label>
                    <input type="url" name="discordLink" value={form.discordLink} onChange={handleInputChange} placeholder="https://discord.gg/hubmc" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Server IP</label>
                    <input type="text" name="serverIp" value={form.serverIp} onChange={handleInputChange} placeholder="play.hubmc.net" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-white/50">Rules *</label>
                    <textarea name="rules" value={form.rules} onChange={handleInputChange} required rows={5} placeholder="Write the tournament rules here..." className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--hub-blue)]" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] transition-all hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)] disabled:opacity-50">
                    {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : editTournament ? "Update Tournament" : "Create Tournament"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
