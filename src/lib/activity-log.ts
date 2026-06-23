import { db } from "@/lib/db";
import { activityLogs } from "@/lib/db/schema";

/**
 * Shared activity logger. Import and call from any server-side code.
 *
 * @param opts.actorType  - "customer" | "employee" | "admin" | "system"
 * @param opts.actorId    - ID of the actor (customerId, employeeId, or null for system)
 * @param opts.actorName  - Display name of the actor
 * @param opts.action     - e.g. LOGIN, CREATE, UPDATE, DELETE, REGISTER, BAN, UNBAN, REPLY, APPROVE, REJECT
 * @param opts.entity     - e.g. tournament, registration, forum_thread, player, order, employee
 * @param opts.entityId   - ID of the affected entity
 * @param opts.summary    - Human-readable description
 * @param opts.severity   - "INFO" | "WARN" | "ERROR" | "CRITICAL"
 * @param opts.metadata   - Optional JSON-safe object for extra context
 * @param opts.ipAddress  - Request IP if available
 */
export async function logActivity(opts: {
  actorType?: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  severity?: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    const details = opts.metadata
      ? JSON.stringify({ summary: opts.summary, ...opts.metadata })
      : opts.summary;

    await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      employeeId: opts.actorType === "employee" || opts.actorType === "admin"
        ? (opts.actorId ?? null)
        : null,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId ?? null,
      details,
      severity: opts.severity ?? "INFO",
      ipAddress: opts.ipAddress ?? null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn("[ActivityLog] Failed to log:", e);
  }
}
