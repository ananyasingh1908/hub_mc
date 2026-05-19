import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Send, LoaderCircle, Globe, AlertTriangle, Info, CheckCircle } from "lucide-react";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "alert" | "announcement">("info");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

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
      } else {
        setResult({ ok: false, message: data.error || "Failed to send" });
      }
    } catch {
      setResult({ ok: false, message: "Network error" });
    }
    finally { setSending(false); }
  };

  const typeStyles: Record<string, { icon: any; color: string; bg: string }> = {
    info: { icon: Info, color: "text-[var(--hub-blue)]", bg: "bg-[rgba(62,162,255,0.12)]" },
    warning: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-[rgba(234,179,8,0.12)]" },
    alert: { icon: AlertTriangle, color: "text-red-400", bg: "bg-[rgba(239,68,68,0.12)]" },
    announcement: { icon: Megaphone, color: "text-[var(--hub-orange)]", bg: "bg-[rgba(255,138,42,0.12)]" },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-black text-white">Send Notification</h1>
      <p className="mt-1 text-white/56">Send global announcements and alerts to all players.</p>

      <div className="mt-8 max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-6">
          <div className="flex items-center gap-2 text-lg font-bold text-white mb-6">
            <Globe className="h-5 w-5 text-[var(--hub-blue)]" />
            Global Notification
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
    </motion.div>
  );
}
