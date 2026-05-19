import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Save, X, Package } from "lucide-react";
import { toast } from "sonner";

type Product = { id: string; slug: string; name: string; description: string; imageUrl: string; price: number; active: boolean; badge?: string };

export default function EmployeeProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ slug: "", name: "", description: "", imageUrl: "", price: "", badge: "" });

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch { toast.error("Failed to load products"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const startEdit = (p: Product) => { setEditing(p.id); setEditForm(p); };
  const cancelEdit = () => { setEditing(null); setEditForm({}); };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.price) return toast.error("Name and price required");
    try {
      const res = await fetch("/api/admin/products/update", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data?.error ?? "Failed to update");
      toast.success("Product updated");
      cancelEdit();
      await fetchProducts();
    } catch { toast.error("Failed to update"); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch("/api/admin/products/delete", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data?.error ?? "Failed to delete");
      toast.success("Product deleted");
      await fetchProducts();
    } catch { toast.error("Failed to delete"); }
  };

  const addProduct = async () => {
    if (!addForm.slug || !addForm.name || !addForm.price) return toast.error("Slug, name, price required");
    try {
      const res = await fetch("/api/admin/products/create", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, price: parseFloat(addForm.price) }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data?.error ?? "Failed to create");
      toast.success("Product created");
      setShowAdd(false);
      setAddForm({ slug: "", name: "", description: "", imageUrl: "", price: "", badge: "" });
      await fetchProducts();
    } catch { toast.error("Failed to create"); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-black text-white">Products</h1>
          <p className="mt-2 text-white/56">Manage your store packages and items.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black opacity-100 shadow-[0_0_20px_rgba(255,138,42,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-[0_0_30px_rgba(255,138,42,0.4)]">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-5">
          <h3 className="font-black text-white">New Product</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input placeholder="Slug" value={addForm.slug} onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <input placeholder="Name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <input placeholder="Price" type="number" value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <input placeholder="Image URL" value={addForm.imageUrl} onChange={(e) => setAddForm({ ...addForm, imageUrl: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <input placeholder="Badge (optional)" value={addForm.badge} onChange={(e) => setAddForm({ ...addForm, badge: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <textarea placeholder="Description" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)] md:col-span-2" />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={addProduct} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black opacity-100 shadow-[0_0_16px_rgba(255,138,42,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-[0_0_24px_rgba(255,138,42,0.35)]">Create</button>
            <button onClick={() => setShowAdd(false)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/60 hover:bg-white/[0.05]">Cancel</button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
      ) : (
        <div className="mt-6 space-y-3">
          {products.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
              <Package className="mx-auto h-8 w-8 text-white/30" />
              <p className="mt-3 text-white/50">No products yet.</p>
            </div>
          )}
          {products.map((p) => (
            <motion.div key={p.id} layout className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-4">
              {editing === p.id ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={editForm.name ?? ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
                  <input value={editForm.price?.toString() ?? ""} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                    className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" type="number" />
                  <input value={editForm.slug ?? ""} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
                  <input value={editForm.imageUrl ?? ""} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
                  <textarea value={editForm.description ?? ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)] md:col-span-2" />
                  <div className="flex gap-3 md:col-span-2">
                    <button onClick={saveEdit} className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]"><Save className="h-4 w-4" /> Save</button>
                    <button onClick={cancelEdit} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/60 hover:bg-white/[0.05]"><X className="h-4 w-4" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{p.name}</span>
                      {p.badge && <span className="rounded-full bg-[rgba(255,138,42,0.15)] px-2 py-0.5 text-xs text-[var(--hub-orange)]">{p.badge}</span>}
                      {!p.active && <span className="rounded-full bg-[rgba(239,68,68,0.15)] px-2 py-0.5 text-xs text-red-400">Inactive</span>}
                    </div>
                    <div className="mt-1 text-sm text-white/50">₹{p.price.toFixed(2)} · {p.slug}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(p)} className="rounded-xl border border-white/10 p-2.5 text-white/50 transition-colors hover:bg-white/[0.05] hover:text-[var(--hub-blue)]"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteProduct(p.id)} className="rounded-xl border border-white/10 p-2.5 text-white/50 transition-colors hover:bg-[rgba(239,68,68,0.1)] hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
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
