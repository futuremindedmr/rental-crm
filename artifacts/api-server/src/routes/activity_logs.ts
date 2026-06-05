import { Router } from "express";
import { z } from "zod/v4";
import { db, activityLogsTable, clientsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireTenant } from "../lib/tenant";

const router = Router();

const ActivityLogInputSchema = z.object({
  type: z.enum(["Call", "Text", "Email", "Visit"]),
  notes: z.string().nullable().optional(),
  occurredAt: z.string().datetime(),
});

function formatLog(row: typeof activityLogsTable.$inferSelect) {
  return {
    id: row.id,
    clientId: row.clientId,
    type: row.type,
    notes: row.notes ?? null,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

// ── GET /clients/:id/activity-logs ─────────────────────────────────────────

router.get("/clients/:id/activity-logs", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    res.status(400).json({ error: "Invalid client id" });
    return;
  }

  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, tenantId)))
    .limit(1);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const rows = await db
    .select()
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.clientId, clientId), eq(activityLogsTable.tenantId, tenantId)))
    .orderBy(desc(activityLogsTable.occurredAt));

  res.json(rows.map(formatLog));
});

// ── POST /clients/:id/activity-logs ────────────────────────────────────────

router.post("/clients/:id/activity-logs", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    res.status(400).json({ error: "Invalid client id" });
    return;
  }

  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.tenantId, tenantId)))
    .limit(1);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const parsed = ActivityLogInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.prettifyError(parsed.error) });
    return;
  }

  const { type, notes, occurredAt } = parsed.data;

  const [row] = await db
    .insert(activityLogsTable)
    .values({
      tenantId,
      clientId,
      type,
      notes: notes ?? null,
      occurredAt: new Date(occurredAt),
    })
    .returning();

  res.status(201).json(formatLog(row));
});

// ── DELETE /clients/:id/activity-logs/:logId ───────────────────────────────

router.delete("/clients/:id/activity-logs/:logId", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const clientId = Number(req.params.id);
  const logId = Number(req.params.logId);
  if (!Number.isInteger(clientId) || !Number.isInteger(logId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db
    .delete(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.id, logId),
        eq(activityLogsTable.clientId, clientId),
        eq(activityLogsTable.tenantId, tenantId),
      ),
    );

  res.status(204).send();
});

export default router;
