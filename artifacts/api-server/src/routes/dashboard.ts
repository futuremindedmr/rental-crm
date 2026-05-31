import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, leadsTable, rentalsTable, squarePaymentsTable, squareInvoicesTable, propertiesTable } from "@workspace/db";
import { sql, and, eq } from "drizzle-orm";
import { requireTenant } from "../lib/tenant";

const router = Router();

function computeMonthsRemaining(startDate: string, termMonths: number): number {
  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, termMonths - monthsElapsed);
}

router.get("/dashboard/stats", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    [totalClientsRow],
    [openLeadsRow],
    [totalRevenueRow],
    [thisMonthRow],
    [overdueRow],
    [totalPropertiesRow],
    allRentals,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(clientsTable)
      .where(eq(clientsTable.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
      .where(and(eq(leadsTable.tenantId, tenantId), sql`stage != 'converted'`)),
    db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` }).from(squarePaymentsTable)
      .where(and(eq(squarePaymentsTable.tenantId, tenantId), sql`status = 'COMPLETED'`)),
    db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` }).from(squarePaymentsTable)
      .where(and(
        eq(squarePaymentsTable.tenantId, tenantId),
        sql`status = 'COMPLETED' AND payment_date >= ${startOfThisMonth.toISOString().slice(0,10)} AND payment_date < ${startOfNextMonth.toISOString().slice(0,10)}`,
      )),
    db.select({ count: sql<number>`count(*)::int` }).from(squareInvoicesTable)
      .where(and(
        eq(squareInvoicesTable.tenantId, tenantId),
        sql`status IN ('UNPAID', 'PARTIALLY_PAID') AND due_date IS NOT NULL AND due_date < ${now.toISOString().slice(0,10)}`,
      )),
    db.select({ count: sql<number>`count(*)::int` }).from(propertiesTable)
      .where(eq(propertiesTable.tenantId, tenantId)),
    db.select({ startDate: rentalsTable.startDate, termMonths: rentalsTable.termMonths }).from(rentalsTable)
      .where(eq(rentalsTable.tenantId, tenantId)),
  ]);

  const activeRentals = allRentals.filter(r => computeMonthsRemaining(r.startDate, r.termMonths) > 0);
  const expiringSoon = activeRentals.filter(r => {
    const rem = computeMonthsRemaining(r.startDate, r.termMonths);
    return rem <= 2 && rem > 0;
  });

  res.json({
    activeRentals: activeRentals.length,
    expiringSoon: expiringSoon.length,
    openLeads: openLeadsRow?.count ?? 0,
    rentCollectedThisMonth: Number(thisMonthRow?.total ?? 0),
    overduePayments: overdueRow?.count ?? 0,
    totalProperties: totalPropertiesRow?.count ?? 0,
    totalRevenue: Number(totalRevenueRow?.total ?? 0),
    totalClients: totalClientsRow?.count ?? 0,
  });
});

router.get("/dashboard/recent-payments", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const rows = await db
    .select({
      id: squarePaymentsTable.id,
      clientId: squarePaymentsTable.clientId,
      clientName: clientsTable.name,
      squarePaymentId: squarePaymentsTable.squarePaymentId,
      amount: squarePaymentsTable.amount,
      status: squarePaymentsTable.status,
      description: squarePaymentsTable.description,
      paymentDate: squarePaymentsTable.paymentDate,
      createdAt: squarePaymentsTable.createdAt,
    })
    .from(squarePaymentsTable)
    .leftJoin(clientsTable, sql`${squarePaymentsTable.clientId} = ${clientsTable.id}`)
    .where(eq(squarePaymentsTable.tenantId, tenantId))
    .orderBy(sql`${squarePaymentsTable.createdAt} desc`)
    .limit(10);

  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

export default router;
