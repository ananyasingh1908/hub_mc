import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Truck, Search, ChevronDown, ChevronUp, RotateCcw, Terminal,
  RefreshCw, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type DeliveryItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type DeliveryLog = {
  action: string;
  details: string | null;
  severity: string;
  createdAt: string;
};

type Delivery = {
  id: string;
  orderNumber: string;
  minecraftUsername: string;
  minecraftUuid: string;
  email: string;
  items: DeliveryItem[];
  commands: string[];
  paymentStatus: string;
  deliveryStatus: string;
  deliveredAt: string | null;
  createdAt: string;
  logs: DeliveryLog[];
};

const deliveryBadge = (s: string) => {
  const map: Record<string, string> = {
    PENDING: "text-yellow-400 bg-[rgba(234,179,8,0.12)]",
    PROCESSING: "text-blue-400 bg-[rgba(59,130,246,0.12)]",
    DELIVERED: "text-green-400 bg-[rgba(34,197,94,0.12)]",
    FAILED: "text-red-400 bg-[rgba(239,68,68,0.12)]",
    AWAITING_SERVER: "text-orange-400 bg-[rgba(255,138,42,0.12)]",
  };
  return map[s] ?? "text-white/50 bg-white/[0.05]";
};

const paymentBadge = (s: string) => {
  const map: Record<string, string> = {
    PAID: "text-green-400 bg-[rgba(34,197,94,0.12)]",
    PENDING: "text-yellow-400 bg-[rgba(234,179,8,0.12)]",
    FAILED: "text-red-400 bg-[rgba(239,68,68,0.12)]",
    FULFILLED: "text-blue-400 bg-[rgba(59,130,246,0.12)]",
    REFUNDED: "text-orange-400 bg-[rgba(255,138,42,0.12)]",
  };
  return map[s] ?? "text-white/50 bg-white/[0.05]";
};

const severityIcon = (s: string) => {
  const icons: Record<string, typeof AlertTriangle> = { INFO: AlertTriangle, WARN: AlertTriangle, ERROR: AlertTriangle };
  const Icon = icons[s] ?? AlertTriangle;
  return <Icon className={`h-3.5 w-3.5 ${s === "ERROR" ? "text-red-400" : s === "WARN" ? "text-yellow-400" : "text-blue-400"}`} />;
};

export default function AdminDelivery() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (deliveryFilter) params.set("delivery", deliveryFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/deliveries?${params}`, { credentials: "include" });
      const data = await res.json();
      setDeliveries(data.deliveries ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, [page, deliveryFilter, search]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const handleResend = async (orderId: string) => {
    setResending(orderId);
    try {
      const res = await fetch("/api/admin/deliveries/resend", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to resend"); return; }
      toast.success(data.message || "Delivery re-sent");
      await fetchDeliveries();
    } catch {
      toast.error("Failed to resend delivery");
    } finally {
      setResending(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Delivery Management</h1>
          <p className="mt-2 text-white/56">
            {total} delivery records — RCON command execution and delivery status tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <RefreshCw className="h-4 w-4" /> {total} total
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by username, email, or order ID..."
            className="h-11 w-full rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] pl-10 pr-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
        </div>
        <select value={deliveryFilter} onChange={(e) => { setDeliveryFilter(e.target.value); setPage(1); }}
          className="h-11 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
          <option value="">All Delivery Status</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
          <option value="AWAITING_SERVER">Awaiting Server</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
      ) : deliveries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
          <Truck className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-3 text-white/50">No deliveries found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {deliveries.map((d) => (
            <motion.div key={d.id} layout className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)]">
              <button onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.02]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,138,42,0.12)]">
                  <Truck className="h-5 w-5 text-[var(--hub-orange)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{d.minecraftUsername}</div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-white/48">
                    <span className="font-mono">{d.orderNumber}</span>
                    <span>{d.items.length} package(s)</span>
                    <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`hidden sm:inline rounded-full px-2.5 py-1 text-xs font-medium ${paymentBadge(d.paymentStatus)}`}>{d.paymentStatus}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${deliveryBadge(d.deliveryStatus)}`}>
                  {d.deliveryStatus === "AWAITING_SERVER" ? "Awaiting Server" : d.deliveryStatus}
                </span>
                {expanded === d.id ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </button>

              {expanded === d.id && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Order Info</div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-white/48">Order ID</span><span className="font-mono text-xs text-white/70">{d.id}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Order #</span><span className="font-mono text-xs text-white/70">{d.orderNumber}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Username</span><span className="text-white/70">{d.minecraftUsername}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">UUID</span><span className="font-mono text-xs text-white/50">{d.minecraftUuid}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Email</span><span className="text-white/70">{d.email}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Payment</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentBadge(d.paymentStatus)}`}>{d.paymentStatus}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Delivery</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${deliveryBadge(d.deliveryStatus)}`}>{d.deliveryStatus === "AWAITING_SERVER" ? "Awaiting Server" : d.deliveryStatus}</span></div>
                        {d.deliveredAt && <div className="flex justify-between"><span className="text-white/48">Delivered At</span><span className="text-white/70">{new Date(d.deliveredAt).toLocaleString()}</span></div>}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Packages</div>
                      <div className="space-y-1.5">
                        {d.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                            <span className="text-sm text-white/80">{item.productName}</span>
                            <span className="text-xs text-white/50">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                      <Terminal className="h-3.5 w-3.5" />
                      Generated RCON Commands
                    </div>
                    <div className="rounded-xl bg-black/60 p-3 font-mono text-xs text-green-400 whitespace-pre-wrap break-all">
                      {d.commands.length > 0 ? d.commands.join("\n") : <span className="text-white/30">No commands generated</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleResend(d.id)} disabled={resending === d.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[rgba(255,138,42,0.15)] px-4 py-2 text-xs font-medium text-orange-400 transition-all hover:bg-[rgba(255,138,42,0.25)] disabled:cursor-not-allowed disabled:opacity-50">
                      {resending === d.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      {resending === d.id ? "Resending..." : "Resend Commands"}
                    </button>
                  </div>

                  {d.logs.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                        Delivery Logs ({d.logs.length})
                      </div>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-black/40 p-3">
                        {d.logs.map((log, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="shrink-0 mt-0.5">{severityIcon(log.severity)}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-white/50">{log.action}</span>
                                <span className="text-white/30">{new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                              {log.details && <div className="mt-0.5 text-white/60 whitespace-pre-wrap break-all line-clamp-3">{log.details}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
            className="h-10 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white/60 hover:bg-white/5 disabled:opacity-30">
            Previous
          </button>
          <span className="text-sm text-white/40">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className="h-10 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white/60 hover:bg-white/5 disabled:opacity-30">
            Next
          </button>
        </div>
      )}
    </motion.div>
  );
}
