import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, companiesTable, dealsTable, activitiesTable } from "@workspace/db";
import { sql, ne } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [
    [contactsRow],
    [companiesRow],
    [dealsRow],
    [wonRow],
    [openRow],
    [activitiesRow],
    [newContactsRow],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contactsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(companiesTable),
    db.select({ count: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(value::numeric), 0)` }).from(dealsTable),
    db.select({ total: sql<number>`coalesce(sum(value::numeric), 0)` }).from(dealsTable).where(sql`stage = 'closed_won'`),
    db.select({ count: sql<number>`count(*)::int` }).from(dealsTable).where(sql`stage not in ('closed_won', 'closed_lost')`),
    db.select({ count: sql<number>`count(*)::int` }).from(activitiesTable).where(sql`created_at >= ${startOfWeek.toISOString()}`),
    db.select({ count: sql<number>`count(*)::int` }).from(contactsTable).where(sql`created_at >= ${startOfMonth.toISOString()}`),
  ]);

  res.json({
    totalContacts: contactsRow?.count ?? 0,
    totalCompanies: companiesRow?.count ?? 0,
    totalDeals: dealsRow?.count ?? 0,
    totalPipelineValue: Number(dealsRow?.total ?? 0),
    wonDealsValue: Number(wonRow?.total ?? 0),
    openDealsCount: openRow?.count ?? 0,
    activitiesThisWeek: activitiesRow?.count ?? 0,
    newContactsThisMonth: newContactsRow?.count ?? 0,
  });
});

router.get("/dashboard/pipeline", async (req, res) => {
  const rows = await db
    .select({
      stage: dealsTable.stage,
      count: sql<number>`count(*)::int`,
      value: sql<number>`coalesce(sum(value::numeric), 0)`,
    })
    .from(dealsTable)
    .groupBy(dealsTable.stage);

  const stageOrder = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
  const sorted = rows.sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));

  res.json(sorted.map(r => ({ stage: r.stage, count: r.count, value: Number(r.value) })));
});

router.get("/dashboard/recent-activity", async (req, res) => {
  const rows = await db
    .select({
      id: activitiesTable.id,
      type: activitiesTable.type,
      subject: activitiesTable.subject,
      description: activitiesTable.description,
      contactId: activitiesTable.contactId,
      contactName: sql<string | null>`concat(${contactsTable.firstName}, ' ', ${contactsTable.lastName})`,
      dealId: activitiesTable.dealId,
      dealTitle: dealsTable.title,
      completed: activitiesTable.completed,
      dueDate: activitiesTable.dueDate,
      createdAt: activitiesTable.createdAt,
    })
    .from(activitiesTable)
    .leftJoin(contactsTable, sql`${activitiesTable.contactId} = ${contactsTable.id}`)
    .leftJoin(dealsTable, sql`${activitiesTable.dealId} = ${dealsTable.id}`)
    .orderBy(sql`${activitiesTable.createdAt} desc`)
    .limit(10);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
