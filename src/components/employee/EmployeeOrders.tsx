import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown, ChevronUp, ShoppingCart, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type OrderItem = { productName: string; quantity: number; unitPrice: number; subtotal: number };
type Order = { id: string; minecraftUsername: string; email: string; status: string; deliveryStatus: string; total: number; createdAt: string; items: OrderItem[]; razorpayPaymentId: string | null };

export default function EmployeeOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (deliveryFilter) params.set("delivery", deliveryFilter);
      const res = await fetch(`/api/employee/orders?${params}`, { credentials: "include" });
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, deliveryFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (id: string, deliveryStatus: string) => {
    try {
      const res = await fetch("/api/employee/orders/update", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deliveryStatus }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to update"); return; }
      toast.success("Order updated");
      await fetchOrders();
    } catch { toast.error("Failed to update"); }
  };

  const handleRefund = async (id: string) => {
    const reason = prompt("Refund reason (optional):");
    try {
      const res = await fetch("/api/employee/orders/refund", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to refund"); return; }
      toast.success("Order refunded");
      await fetchOrders();
    } catch { toast.error("Failed to refund"); }
  };

  const downloadInvoice = (orderId: string) => {
    window.open(`/api/orders/invoice?orderId=${orderId}`, "_blank");
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { PAID: "text-green-400 bg-[rgba(34,197,94,0.12)]", PENDING: "text-yellow-400 bg-[rgba(234,179,8,0.12)]", FAILED: "text-red-400 bg-[rgba(239,68,68,0.12)]", FULFILLED: "text-blue-400 bg-[rgba(59,130,246,0.12)]", REFUNDED: "text-orange-400 bg-[rgba(255,138,42,0.12)]" };
    return map[s] ?? "text-white/50 bg-white/[0.05]";
  };
  const deliveryBadge = (s: string) => {
    const map: Record<string, string> = { DELIVERED: "text-green-400 bg-[rgba(34,197,94,0.12)]", PROCESSING: "text-blue-400 bg-[rgba(59,130,246,0.12)]", PENDING: "text-yellow-400 bg-[rgba(234,179,8,0.12)]", FAILED: "text-red-400 bg-[rgba(239,68,68,0.12)]", AWAITING_SERVER: "text-orange-400 bg-[rgba(255,138,42,0.12)]" };
    return map[s] ?? "text-white/50 bg-white/[0.05]";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Orders</h1>
          <p className="mt-2 text-white/56">View and manage all player orders. Process deliveries, issue refunds, download invoices.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by username, email, or order ID..."
            className="h-11 w-full rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] pl-10 pr-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-11 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FULFILLED">Fulfilled</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select value={deliveryFilter} onChange={(e) => { setDeliveryFilter(e.target.value); setPage(1); }}
          className="h-11 rounded-xl border border-white/10 bg-[rgba(11,11,11,0.92)] px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
          <option value="">All Delivery</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
          <option value="AWAITING_SERVER">Awaiting Server</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
      ) : orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
          <ShoppingCart className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-3 text-white/50">No orders found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <motion.div key={o.id} layout className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)]">
              <button onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{o.minecraftUsername}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/48">
                    <span className="font-mono">#{o.id.slice(0, 8)}</span>
                    <span>₹{Number(o.total).toFixed(2)}</span>
                    <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(o.status)}`}>{o.status}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${deliveryBadge(o.deliveryStatus)}`}>{o.deliveryStatus}</span>
                {expanded === o.id ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </button>

              {expanded === o.id && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Details</div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-white/48">Email</span><span className="text-white/70">{o.email}</span></div>
                        <div className="flex justify-between"><span className="text-white/48">Total</span><span className="font-semibold text-white">₹{Number(o.total).toFixed(2)}</span></div>
                        {o.razorpayPaymentId && <div className="flex justify-between"><span className="text-white/48">Payment ID</span><span className="font-mono text-xs text-white/50">{o.razorpayPaymentId}</span></div>}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Actions</div>
                      <div className="flex flex-wrap gap-2">
                        {o.deliveryStatus === "PENDING" && <button onClick={() => updateStatus(o.id, "PROCESSING")} className="rounded-xl bg-[rgba(59,130,246,0.15)] px-3 py-2 text-xs font-medium text-blue-400 hover:bg-[rgba(59,130,246,0.25)]">Start Delivery</button>}
                        {o.deliveryStatus === "PROCESSING" && <button onClick={() => updateStatus(o.id, "DELIVERED")} className="rounded-xl bg-[rgba(34,197,94,0.15)] px-3 py-2 text-xs font-medium text-green-400 hover:bg-[rgba(34,197,94,0.25)]">Mark Delivered</button>}
                        {o.deliveryStatus === "FAILED" && <button onClick={() => updateStatus(o.id, "PROCESSING")} className="rounded-xl bg-[rgba(255,138,42,0.15)] px-3 py-2 text-xs font-medium text-orange-400 hover:bg-[rgba(255,138,42,0.25)]">Retry</button>}
                        {o.deliveryStatus === "AWAITING_SERVER" && <button onClick={() => updateStatus(o.id, "PROCESSING")} className="rounded-xl bg-[rgba(255,138,42,0.15)] px-3 py-2 text-xs font-medium text-orange-400 hover:bg-[rgba(255,138,42,0.25)]">Resend to Server</button>}
                        {o.status !== "REFUNDED" && <button onClick={() => handleRefund(o.id)} className="rounded-xl bg-[rgba(239,68,68,0.15)] px-3 py-2 text-xs font-medium text-red-400 hover:bg-[rgba(239,68,68,0.25)]"><RotateCcw className="h-3 w-3 inline mr-1" />Refund</button>}
                        <button onClick={() => downloadInvoice(o.id)} className="rounded-xl bg-[rgba(62,162,255,0.15)] px-3 py-2 text-xs font-medium text-blue-400 hover:bg-[rgba(62,162,255,0.25)]"><Download className="h-3 w-3 inline mr-1" />Invoice</button>
                      </div>
                    </div>
                  </div>
                  {(o.items ?? []).length > 0 && (
                    <div className="mt-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Items</div>
                      <div className="space-y-1.5">
                        {o.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                            <span className="text-white/70">{item.quantity}x {item.productName}</span>
                            <span className="text-white/50">₹{Number(item.subtotal).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Previous</button>
              <span className="text-sm text-white/40">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 disabled:opacity-30 hover:bg-white/[0.05]">Next</button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
