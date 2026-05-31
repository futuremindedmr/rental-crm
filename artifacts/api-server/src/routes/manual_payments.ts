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
    .leftJoin(clientsTable, eq(manualPaymentsTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(sql`${manualPaymentsTable.paymentDate} desc, ${manualPaymentsTable.createdAt} desc`);

  res.json(rows.map((r) => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

router.post("/manual-payments", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = CreateManualPaymentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [row] = await db
    .insert(manualPaymentsTable)
    .values({ ...parsed.data, tenantId, amount: String(parsed.data.amount), notes: parsed.data.notes ?? null })
    .returning();

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, row.clientId!)).limit(1);

  res.status(201).json({
    ...row,
    clientName: client?.name ?? null,
    amount: Number(row.amount),
    createdAt: row.createdAt.toISOString(),
  });
});

export default router;
