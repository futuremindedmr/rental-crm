import { Router } from "express";
import { db } from "@workspace/db";
import { manualPaymentsTable, clientsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireTenant } from "../lib/tenant";
import { z } from "zod/v4";

const router = Router();

const CreateManualPaymentBody = z.object({
  clientId: z.number().int().positive(),
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.enum(["cash", "check", "zelle", "venmo", "bank_transfer"]),
  notes: z.string().nullable().optional(),
});

const UpdateManualPaymentBody = z.object({
  clientId: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
  paymentDate: z.string().min(1).optional(),
  paymentMethod: z.enum(["cash", "check", "zelle", "venmo", "bank_transfer"]).optional(),
  notes: z.string().nullable().optional(),
});

router.get("/manual-payments", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const clientId = req.query.clientId ? Number(req.query.clientId) : null;
  const conditions = [eq(manualPaymentsTable.tenantId, tenantId)];
  if (clientId != null) conditions.push(eq(manualPaymentsTable.clientId, clientId));

  const rows = await db
    .select({
      id: manualPaymentsTable.id,
      clientId: manualPaymentsTable.clientId,
      clientName: clientsTable.name,
      amount: manualPaymentsTable.amount,
      paymentDate: manualPaymentsTable.paymentDate,
      paymentMethod: manualPaymentsTable.paymentMethod,
      notes: manualPaymentsTable.notes,
      createdAt: manualPaymentsTable.createdAt,
    })
    .from(manualPaymentsTable)
    .leftJoin(
      clientsTable,
      and(eq(manualPaymentsTable.clientId, clientsTable.id), eq(clientsTable.tenantId, tenantId)),
    )
    .where(and(...conditions))
    .orderBy(sql`${manualPaymentsTable.paymentDate} desc, ${manualPaymentsTable.createdAt} desc`);

  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

router.post("/manual-payments", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = CreateManualPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, parsed.data.clientId), eq(clientsTable.tenantId, tenantId)))
    .limit(1);
  if (!client) { res.status(400).json({ error: "Invalid client" }); return; }

  const [row] = await db
    .insert(manualPaymentsTable)
    .values({ ...parsed.data, tenantId, amount: String(parsed.data.amount), notes: parsed.data.notes ?? null })
    .returning();

  res.status(201).json({
    ...row,
    clientName: client?.name ?? null,
    amount: Number(row.amount),
    createdAt: row.createdAt.toISOString(),
  });
});

router.patch("/manual-payments/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateManualPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  if (parsed.data.clientId !== undefined) {
    const [client] = await db
      .select({ id: clientsTable.id })
      .from(clientsTable)
      .where(and(eq(clientsTable.id, parsed.data.clientId), eq(clientsTable.tenantId, tenantId)))
      .limit(1);
    if (!client) { res.status(400).json({ error: "Invalid client" }); return; }
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData.amount !== undefined) updateData.amount = String(updateData.amount);

  const [updated] = await db
    .update(manualPaymentsTable)
    .set(updateData)
    .where(and(eq(manualPaymentsTable.id, id), eq(manualPaymentsTable.tenantId, tenantId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [client] = updated.clientId != null
    ? await db.select().from(clientsTable).where(and(eq(clientsTable.id, updated.clientId), eq(clientsTable.tenantId, tenantId))).limit(1)
    : [];

  res.json({
    ...updated,
    clientName: client?.name ?? null,
    amount: Number(updated.amount),
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/manual-payments/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(manualPaymentsTable)
    .where(and(eq(manualPaymentsTable.id, id), eq(manualPaymentsTable.tenantId, tenantId)));
  res.status(204).send();
});

export default router;
