import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCog, Plus, Shield, ToggleLeft, ToggleRight, Edit3, Trash2, X, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

type Employee = {
  id: string;
  displayName: string;
  department: string | null;
  isActive: boolean;
  email: string;
  minecraftUsername: string;
  role: string;
  createdAt: string;
  permissions: Record<string, boolean> | null;
};

const ALL_PERMISSIONS = [
  "products", "orders", "support", "customers", "employees",
  "settings", "tournaments", "notifications", "playerManage",
  "employeeMonitor", "platformLogs",
];

const PERMISSION_LABELS: Record<string, string> = {
  products: "Products",
  orders: "Orders",
  support: "Support",
  customers: "Customers",
  employees: "Employees",
  settings: "Settings",
  tournaments: "Tournaments",
  notifications: "Notifications",
  playerManage: "Player Mgmt",
  employeeMonitor: "Emp Monitor",
  platformLogs: "Platform Logs",
};

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", displayName: "", department: "", role: "EMPLOYEE" });

  const [editing, setEditing] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", department: "" });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees", { credentials: "include" });
      const data = await res.json();
      setEmployees(data.employees ?? []);
    } catch { toast.error("Failed to load employees"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const createEmployee = async () => {
    if (!addForm.email || !addForm.displayName) return toast.error("Email and display name required");
    try {
      const res = await fetch("/api/admin/employees/create", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Failed to create employee");
      toast.success("Employee created");
      setShowAdd(false);
      setAddForm({ email: "", displayName: "", department: "", role: "EMPLOYEE" });
      await fetchEmployees();
    } catch { toast.error("Failed to create employee"); }
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setEditForm({ displayName: emp.displayName, department: emp.department ?? "" });
  };

  const saveEdit = async () => {
    if (!editing || !editForm.displayName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/employees/update", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, displayName: editForm.displayName.trim(), department: editForm.department.trim() || null }),
      });
      if (res.ok) {
        toast.success("Employee updated");
        setEditing(null);
        await fetchEmployees();
      } else {
        toast.error("Failed to update");
      }
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await fetch("/api/admin/employees/update", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      toast.success(current ? "Employee disabled" : "Employee enabled");
      await fetchEmployees();
    } catch { toast.error("Failed to update"); }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      await fetch("/api/admin/employees/update", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      toast.success("Role updated");
      await fetchEmployees();
    } catch { toast.error("Failed to update role"); }
  };

  const deleteEmployee = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/employees/delete", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        toast.success("Employee removed");
        setDeleteTarget(null);
        await fetchEmployees();
      } else {
        toast.error("Failed to delete");
      }
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(false); }
  };

  const updatePermission = async (employeeId: string, key: string, value: boolean) => {
    try {
      await fetch("/api/admin/permissions/update", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, [key]: value }),
      });
      await fetchEmployees();
    } catch { toast.error("Failed to update permission"); }
  };

  const togglePerm = (employee: Employee, key: string) => {
    const perms = employee.permissions ?? {};
    updatePermission(employee.id, key, !perms[key]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Employees</h1>
          <p className="mt-2 text-white/56">{employees.length} staff members</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black opacity-100 shadow-[0_0_16px_rgba(255,138,42,0.2)] transition-all hover:bg-orange-400 hover:shadow-[0_0_20px_rgba(255,138,42,0.3)]">
          <Plus className="h-4 w-4" /> Add Employee
        </button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-5">
          <h3 className="font-black text-white">New Employee</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input placeholder="Email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <input placeholder="Display Name" value={addForm.displayName} onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <input placeholder="Department" value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]" />
            <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
              className="h-11 rounded-xl border border-white/10 bg-black/60 px-4 text-sm text-white outline-none focus:border-[rgba(62,162,255,0.45)]">
              <option value="EMPLOYEE">Employee</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={createEmployee} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-black opacity-100 shadow-[0_0_12px_rgba(255,138,42,0.15)] transition-all hover:bg-orange-400 hover:shadow-[0_0_16px_rgba(255,138,42,0.25)]">Create</button>
            <button onClick={() => setShowAdd(false)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/60 hover:bg-white/[0.05]">Cancel</button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="mt-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.6)]"/>)}</div>
      ) : employees.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-8 text-center">
          <UserCog className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-3 text-white/50">No employees yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {employees.map((e) => (
            <motion.div key={e.id} layout className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(62,162,255,0.12)]">
                    <Shield className={`h-5 w-5 ${e.role === "SUPER_ADMIN" ? "text-[var(--hub-orange)]" : "text-[var(--hub-blue)]"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{e.displayName}</span>
                      {e.role === "SUPER_ADMIN" && <span className="rounded-full bg-[rgba(255,138,42,0.15)] px-2 py-0.5 text-xs text-[var(--hub-orange)]">Admin</span>}
                      {!e.isActive && <span className="rounded-full bg-[rgba(239,68,68,0.15)] px-2 py-0.5 text-xs text-red-400">Disabled</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-white/48">{e.email} {e.department ? `· ${e.department}` : ""}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select value={e.role} onChange={(v) => updateRole(e.id, v.target.value)}
                    className="rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 text-xs text-white outline-none">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                  <button onClick={() => toggleActive(e.id, e.isActive)} title={e.isActive ? "Disable" : "Enable"}
                    className={`rounded-lg border p-2 transition-colors ${e.isActive ? "border-white/10 text-white/50 hover:text-green-400" : "border-red-500/30 text-red-400 hover:text-green-400"}`}>
                    {e.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openEdit(e)} title="Edit"
                    className="rounded-lg border border-white/10 p-2 text-white/50 hover:text-[var(--hub-blue)] hover:border-[var(--hub-blue)]/30 transition-colors">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(e)} title="Delete"
                    className="rounded-lg border border-white/10 p-2 text-white/50 hover:text-red-400 hover:border-red-500/30 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                {ALL_PERMISSIONS.map((key) => {
                  const val = e.permissions?.[key] ?? false;
                  return (
                    <button key={key} onClick={() => togglePerm(e, key)} title={`${val ? "Revoke" : "Grant"} ${PERMISSION_LABELS[key]}`}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors ${
                        val ? "bg-[rgba(62,162,255,0.15)] text-[var(--hub-blue)]" : "bg-white/[0.05] text-white/30"
                      }`}>
                      {PERMISSION_LABELS[key] || key}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => !saving && setEditing(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.96)] p-6"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Edit Employee</h3>
                <button onClick={() => !saving && setEditing(null)} className="rounded-lg p-1 text-white/40 hover:bg-white/10"><X className="h-5 w-5" /></button>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1.5">Display Name</label>
                  <input type="text" value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[var(--hub-blue)]/40" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/40 mb-1.5">Department</label>
                  <input type="text" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    placeholder="e.g., Support, Moderation"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[var(--hub-blue)]/40" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => !saving && setEditing(null)} disabled={saving}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 disabled:opacity-50">Cancel</button>
                <button onClick={saveEdit} disabled={saving || !editForm.displayName.trim()}
                  className="flex items-center gap-2 rounded-xl bg-[var(--hub-blue)] px-4 py-2 text-sm font-bold text-black hover:shadow-[0_0_16px_rgba(62,162,255,0.3)] disabled:opacity-50">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  Save
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
              <h3 className="text-lg font-bold text-white">Delete Employee</h3>
              <p className="mt-2 text-sm text-white/60">Are you sure you want to remove this employee? This action cannot be undone.</p>
              <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-sm font-semibold text-white">{deleteTarget.displayName}</p>
                <p className="text-xs text-white/40">{deleteTarget.email}</p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => !deleting && setDeleteTarget(null)} disabled={deleting}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 disabled:opacity-50">Cancel</button>
                <button onClick={deleteEmployee} disabled={deleting}
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
