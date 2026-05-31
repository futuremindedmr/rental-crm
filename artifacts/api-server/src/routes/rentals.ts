import { Router } from "express";
import { db } from "@workspace/db";
import { rentalsTable, clientsTable, squareInvoicesTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  ListRentalsQueryParams,
  CreateRentalBody,
  GetRentalParams,
  UpdateRentalParams,
  UpdateRentalBody,
  DeleteRentalParams,
} from "@workspace/api-zod";
import { requireTenant } from "../lib/tenant";

const router = Router();

function effectiveEndDate(startDate: string, termMonths: number, endDate: string | null): Date {
  if (endDate) return new Date(endDate);
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + termMonths);
  return end;
}

function computeMonthsRemaining(startDate: string, termMonths: number, endDate: string | null): number {
  const end = effectiveEndDate(startDate, termMonths, endDate);
  const now = new Date();
  if (now >= end) return 0;
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  return Math.max(0, months);
}

function computeDaysRemaining(startDate: string, termMonths: number, endDate: string | null): number {
  const end = effectiveEndDate(startDate, termMonths, endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function computeIsMonthToMonth(startDate: string, termMonths: number, endDate: string | null): boolean {
  const end = effectiveEndDate(startDate, termMonths, endDate);
  return new Date() >= end;
}

function formatRental(
  row: {
    id: number;
    clientId: number;
    clientName: string | null;
    unitDescription: string | null;
    startDate: string;
    termMonths: number;
    endDate: string | null;
    monthlyRate: string;
    notes: string | null;
    createdAt: Date;
  },
  paymentStatus: string | null = null,
) {
  const monthsRemaining = computeMonthsRemaining(row.startDate, row.termMonths, row.endDate);
  const daysRemaining = computeDaysRemaining(row.startDate, row.termMonths, row.endDate);
  return {
    ...row,
    monthlyRate: Number(row.monthlyRate),
    monthsRemaining,
    isExpiringSoon: daysRemaining <= 60 && daysRemaining > 0,
    isMonthToMonth: computeIsMonthToMonth(row.startDate, row.termMonths, row.endDate),
    createdAt: row.createdAt.toISOString(),
    paymentStatus,
  };
}

async function fetchPaymentStatusMap(
  clientIds: number[],
  tenantId: number,
): Promise<Map<number, string>> {
  if (clientIds.length === 0) return new Map();

  const today = new Date();
  const invoices = await db
    .select({
      clientId: squareInvoicesTable.clientId,
      status: squareInvoicesTable.status,
      dueDate: squareInvoicesTable.dueDate,
    })
    .from(squareInvoicesTable)
    .where(
      and(
        eq(squareInvoicesTable.tenantId, tenantId),
        inArray(squareInvoicesTable.clientId, clientIds),
      ),
    );

  const byClient = new Map<number, typeof invoices>();
  for (const inv of invoices) {
    if (inv.clientId == null) continue;
    if (!byClient.has(inv.clientId)) byClient.set(inv.clientId, []);
    byClient.get(inv.clientId)!.push(inv);
  }

  const result = new Map<number, string>();
  for (const [cid, invs] of byClient) {
    const sorted = [...invs].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
    });
    const latest = sorted[0];
    if (!latest) continue;
    if (latest.status === "PAID") {
      result.set(cid, "paid");
    } else if (latest.status === "UNPAID" || latest.status === "PARTIALLY_PAID") {
      const daysPast = latest.dueDate
        ? Math.floor((today.getTime() - new Date(latest.dueDate).getTime()) / 86400000)
        : 0;
      result.set(cid, daysPast > 30 ? "overdue" : "late");
    }
  }
  return result;
}

router.get("/rentals", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = ListRentalsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const { clientId, expiringSoon } = parsed.data;

  const conditions = [eq(rentalsTable.tenantId, tenantId)];
  if (clientId != null) conditions.push(eq(rentalsTable.clientId, clientId));

  const rows = await db
    .select({
      id: rentalsTable.id,
      clientId: rentalsTable.clientId,
      clientName: clientsTable.name,
      unitDescription: rentalsTable.unitDescription,
      startDate: rentalsTable.startDate,
      termMonths: rentalsTable.termMonths,
      endDate: rentalsTable.endDate,
      monthlyRate: rentalsTable.monthlyRate,
      notes: rentalsTable.notes,
      createdAt: rentalsTable.createdAt,
    })
    .from(rentalsTable)
    .leftJoin(clientsTable, eq(rentalsTable.clientId, clientsTable.id))
    .where(and(...conditions))
    .orderBy(sql`${rentalsTable.createdAt} desc`);

  const clientIds = [...new Set(rows.map((r) => r.clientId))];
  const paymentStatusMap = await fetchPaymentStatusMap(clientIds, tenantId);

  let result = rows.map((r) => formatRental(r, paymentStatusMap.get(r.clientId) ?? null));
  if (expiringSoon === true || (expiringSoon as unknown) === "true") {
    result = result.filter((r) => r.isExpiringSoon);
  }

  res.json(result);
});

router.post("/rentals", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = CreateRentalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [rental] = await db.insert(rentalsTable).values({
    ...parsed.data,
    tenantId,
    monthlyRate: String(parsed.data.monthlyRate),
  }).returning();

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, rental.clientId)).limit(1);

  res.status(201).json(formatRental({ ...rental, clientName: client?.name ?? null }));
});

router.get("/rentals/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = GetRentalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      id: rentalsTable.id,
      clientId: rentalsTable.clientId,
      clientName: clientsTable.name,
      unitDescription: rentalsTable.unitDescription,
      startDate: rentalsTable.startDate,
      termMonths: rentalsTable.termMonths,
      endDate: rentalsTable.endDate,
      monthlyRate: rentalsTable.monthlyRate,
      notes: rentalsTable.notes,
      createdAt: rentalsTable.createdAt,
    })
    .from(rentalsTable)
    .leftJoin(clientsTable, eq(rentalsTable.clientId, clientsTable.id))
    .where(and(eq(rentalsTable.id, parsed.data.id), eq(rentalsTable.tenantId, tenantId)))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const paymentStatusMap = await fetchPaymentStatusMap([row.clientId], tenantId);
  res.json(formatRental(row, paymentStatusMap.get(row.clientId) ?? null));
});

router.patch("/rentals/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const paramParsed = UpdateRentalParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateRentalBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const updateData: Record<string, unknown> = { ...bodyParsed.data };
  if (updateData.monthlyRate !== undefined) updateData.monthlyRate = String(updateData.monthlyRate);

  const [updated] = await db
    .update(rentalsTable)
    .set(updateData)
    .where(and(eq(rentalsTable.id, paramParsed.data.id), eq(rentalsTable.tenantId, tenantId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, updated.clientId)).limit(1);
  const paymentStatusMap = await fetchPaymentStatusMap([updated.clientId], tenantId);

  res.json(formatRental(
    { ...updated, clientName: client?.name ?? null },
    paymentStatusMap.get(updated.clientId) ?? null,
  ));
});

router.delete("/rentals/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = DeleteRentalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(rentalsTable)
    .where(and(eq(rentalsTable.id, parsed.data.id), eq(rentalsTable.tenantId, tenantId)));
  res.status(204).send();
});

export default router;
