import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ScrollText, Filter, RefreshCw, AlertTriangle, Info } from "lucide-react";

type LogEntry = { id: string; action: string; entity: string; entityId: string | null; details: string | null; severity: string; createdAt: string; employeeName: string | null };

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const formatAction = (action: string): string => {
    const map: Record<string, string> = {
      CREATE: "created",
      UPDATE: "updated",
      DELETE: "deleted",
      START: "started",
      END: "ended",
      REGISTER: "registered",
      CANCEL: "cancelled",
      BAN: "banned",
      UNBAN: "unbanned",
      ASSIGN: "assigned",
      REMOVE: "removed",
      REPLY: "replied",
      RESOLVE: "resolved",
      SEND: "sent",
      LOGIN: "logged in",
      APPROVE: "approved",
      REJECT: "rejected",
      ARCHIVE: "archived",
    };
    return map[action] || action.toLowerCase();
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (entityFilter) params.set("entity", entityFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (severityFilter) params.set("severity", severityFilter);
      const res = await fetch(`/api/admin/platform/logs?${params}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load logs"); setLogs([]); }
      else { setLogs(data.logs ?? []); setTotalPages(data.totalPages ?? 1); setTotal(data.total ?? 0); }
    } catch { setError("Network error"); setLogs([]); }
    finally { setLoading(false); }
  }, [page, entityFilter, actionFilter, severityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const severityIcon = (s: string) => {
    const icons: Record<string, typeof AlertTriangle> = { INFO: Info, WARN: AlertTriangle, ERROR: AlertTriangle, CRITICAL: AlertTriangle };
    const Icon = icons[s] ?? Info;
    return <Icon className={`h-4 w-4 ${s === "ERROR" || s === "CRITICAL" ? "text-red-400" : s === "WARN" ? "text-yellow-400" : "text-blue-400"}`} />;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Platform Activity Logs</h1>
          <p className="mt-2 text-white/56">Full audit trail — tournaments, employees, orders, tickets, and more.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <RefreshCw className="h-4 w-4" /> {total} total entries
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/40" />
          <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
            <option value="">All Entities</option>
            <option value="tournament">Tournament</option>
            <option value="registration">Registration</option>
            <option value="announcement">Announcement</option>
            <option value="notification">Notification</option>
            <option value="player">Player</option>
            <option value="ban">Ban</option>
            <option value="rank">Rank</option>
            <option value="note">Note</option>
            <option value="product">Product</option>
            <option value="order">Order</option>
            <option value="ticket">Ticket</option>
            <option value="employee">Employee</option>
            <option value="permissions">Permissions</option>
          </select>
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="h-11 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="START">Start</option>
          <option value="END">End</option>
          <option value="REGISTER">Register</option>
          <option value="BAN">Ban</option>
          <option value="UNBAN">Unban</option>
          <option value="ASSIGN">Assign</option>
          <option value="REMOVE">Remove</option>
          <option value="REPLY">Reply</option>
          <option value="RESOLVE">Resolve</option>
          <option value="SEND">Send</option>
          <option value="LOGIN">Login</option>
        </select>
        <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="h-11 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
          <option value="">All Severities</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <button onClick={() => { setPage(1); fetchLogs(); }} className="h-11 rounded-xl border border-white/10 px-4 text-sm text-white/60 hover:bg-white/5">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="mt-6 space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
      ) : logs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
          <ScrollText className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-3 text-white/50">No activity logs found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {logs.map((log) => (
            <motion.div key={log.id} layout
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 py-3 transition-colors hover:border-white/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                {severityIcon(log.severity)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-white/90">{log.employeeName || "System"}</span>
                  <span className="text-white/50">{formatAction(log.action)}</span>
                  <span className="font-medium text-[var(--hub-blue)]">{log.entity}</span>
                  {log.details && <span className="hidden md:inline text-white/40 truncate">— {log.details}</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </div>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                log.severity === "ERROR" || log.severity === "CRITICAL" ? "bg-red-500/15 text-red-400"
                : log.severity === "WARN" ? "bg-yellow-500/15 text-yellow-400"
                : "bg-blue-500/15 text-blue-400"
              }`}>{log.severity}</span>
            </motion.div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Previous</button>
              <span className="text-sm text-white/40">Page {page} of {totalPages} ({total} total)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Next</button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
