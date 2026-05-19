import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserCog, Shield, Activity, Clock, Search, LoaderCircle, CheckCircle, XCircle } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLogin?: string;
  permissions: Record<string, boolean>;
  actions: number;
  createdAt: string;
};

export default function AdminEmployeeMonitor() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/platform/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.employees) setEmployees(d.employees);
        else setError(d.error || "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-[var(--hub-blue)]" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-black text-white">Employee Monitor</h1>
      <p className="mt-1 text-white/56">Track all employee activity, permissions, and account status.</p>

      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <div className="mt-6 grid gap-4">
        {employees.length === 0 && !error && <p className="text-sm text-white/40">No employees found.</p>}
        {employees.map((emp) => (
          <motion.div key={emp.id} layout className="rounded-2xl border border-white/10 bg-[rgba(11,11,11,0.92)] p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--hub-blue)] to-[var(--hub-orange)] text-lg font-black text-black">
                  {emp.name[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{emp.name}</h2>
                    {emp.active ? (
                      <span className="flex items-center gap-1 rounded-md bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-400"><CheckCircle className="h-3 w-3" />Active</span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400"><XCircle className="h-3 w-3" />Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-white/50">{emp.email}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-white/30">
                    <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{emp.actions} actions</span>
                    {emp.lastLogin && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Last: {new Date(emp.lastLogin).toLocaleDateString("en-IN")}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-bold text-white/40 flex items-center gap-1"><Shield className="h-3 w-3" />Permissions</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(emp.permissions).filter(([,v]) => v).map(([key]) => (
                  <span key={key} className="rounded-md bg-white/[0.06] px-2.5 py-1 text-[10px] font-medium text-white/60">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                ))}
                {Object.values(emp.permissions).filter(Boolean).length === 0 && (
                  <span className="text-[10px] text-white/30">No permissions assigned</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
