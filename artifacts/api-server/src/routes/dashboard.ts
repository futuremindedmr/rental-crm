import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, leadsTable, rentalsTable, squarePaymentsTable } from "@workspace/db";
import { sql, ne } from "drizzle-orm";

const router = Router();

function computeMonthsRemaining(startDate: string, termMonths: number): number {
  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, termMonths - monthsElapsed);
}

router.get("/dashboard/stats", async (_req, res) => {
  const now = new Date();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    [totalClientsRow],
    [openLeadsRow],
    [totalRevenueRow],
    [lastMonthRow],
    allRentals,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(clientsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
      .where(sql`stage != 'converted'`),
    db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` }).from(squarePaymentsTable)
      .where(sql`status = 'COMPLETED'`),
    db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)` }).from(squarePaymentsTable)
      .where(sql`status = 'COMPLETED' AND payment_date >= ${startOfLastMonth.toISOString().slice(0,10)} AND payment_date < ${endOfLastMonth.toISOString().slice(0,10)}`),
    db.select({ startDate: rentalsTable.startDate, termMonths: rentalsTable.termMonths }).from(rentalsTable),
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
    lastMonthSales: Number(lastMonthRow?.total ?? 0),
    totalRevenue: Number(totalRevenueRow?.total ?? 0),
    totalClients: totalClientsRow?.count ?? 0,
  });
});

router.get("/dashboard/recent-payments", async (_req, res) => {
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
    .orderBy(sql`${squarePaymentsTable.createdAt} desc`)
    .limit(10);

  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

export default router;
