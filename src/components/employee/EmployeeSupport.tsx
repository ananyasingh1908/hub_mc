import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HeadphonesIcon, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Reply = { id: string; authorName: string; message: string; createdAt: string };
type Ticket = { id: string; subject: string; message: string; status: string; createdAt: string; minecraftUsername: string; replies: Reply[] };

export default function EmployeeSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/employee/tickets?${params}`, { credentials: "include" });
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch { toast.error("Failed to load tickets"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [statusFilter]);

  const sendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch("/api/employee/tickets/reply", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: replyText }),
      });
      if (!res.ok) throw Error();
      toast.success("Reply sent");
      setReplyText("");
      await fetchTickets();
    } catch { toast.error("Failed to send reply"); }
  };

  const resolveTicket = async (ticketId: string, status: string) => {
    try {
      await fetch("/api/employee/tickets/resolve", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      toast.success(`Ticket ${status === "RESOLVED" ? "resolved" : "closed"}`);
      await fetchTickets();
    } catch { toast.error("Failed to update ticket"); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { OPEN: "text-yellow-400 bg-[rgba(234,179,8,0.12)]", IN_PROGRESS: "text-blue-400 bg-[rgba(59,130,246,0.12)]", RESOLVED: "text-green-400 bg-[rgba(34,197,94,0.12)]", CLOSED: "text-white/50 bg-white/[0.05]" };
    return map[s] ?? "text-white/50 bg-white/[0.05]";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-black text-white">Support Tickets</h1>
      <p className="mt-2 text-white/56">Manage customer queries and support requests.</p>

      <div className="mt-6 flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
          <option value="">All Tickets</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
      ) : tickets.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
          <HeadphonesIcon className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-3 text-white/50">No support tickets found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tickets.map((t) => (
            <motion.div key={t.id} layout className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)]">
              <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{t.subject}</div>
                  <div className="mt-1 flex gap-3 text-xs text-white/48">
                    <span>{t.minecraftUsername}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    <span>{t.replies.length} replies</span>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(t.status)}`}>{t.status}</span>
              </button>

              {expanded === t.id && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <div className="mb-3 rounded-xl bg-white/[0.03] p-3">
                    <div className="text-xs font-semibold text-white/40">{t.minecraftUsername} wrote:</div>
                    <div className="mt-1.5 text-sm text-white/70">{t.message}</div>
                  </div>

                  {t.replies.map((r) => (
                    <div key={r.id} className="mb-2 rounded-xl border border-[rgba(62,162,255,0.15)] bg-[rgba(62,162,255,0.05)] p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--hub-blue)]">{r.authorName}</span>
                        <span className="text-white/40">{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-1.5 text-sm text-white/70">{r.message}</div>
                    </div>
                  ))}

                  <div className="mt-3">
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="h-20 w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => sendReply(t.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] transition-all hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]">
                        <MessageSquare className="h-4 w-4" /> Send Reply
                      </button>
                      {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                        <>
                          <button onClick={() => resolveTicket(t.id, "RESOLVED")}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/[0.05]">
                            <CheckCircle2 className="h-4 w-4" /> Resolve
                          </button>
                          <button onClick={() => resolveTicket(t.id, "CLOSED")}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50 hover:bg-white/[0.05]">
                            Close
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
