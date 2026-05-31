import { Router } from "express";
import { db } from "@workspace/db";
import { activitiesTable, contactsTable, dealsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListActivitiesQueryParams,
  CreateActivityBody,
  UpdateActivityParams,
  UpdateActivityBody,
  DeleteActivityParams,
} from "@workspace/api-zod";

const router = Router();

function formatActivity(row: {
  id: number;
  type: string;
  subject: string;
  description: string | null;
  contactId: number | null;
  contactName: string | null;
  dealId: number | null;
  dealTitle: string | null;
  completed: boolean;
  dueDate: string | null;
  createdAt: Date;
}) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

router.get("/activities", async (req, res) => {
  const parsed = ListActivitiesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const { contactId, dealId, type } = parsed.data;

  const conditions = [];
  if (contactId != null) conditions.push(eq(activitiesTable.contactId, contactId));
  if (dealId != null) conditions.push(eq(activitiesTable.dealId, dealId));
  if (type) conditions.push(eq(activitiesTable.type, type));

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
    .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
    .leftJoin(dealsTable, eq(activitiesTable.dealId, dealsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${activitiesTable.createdAt} desc`);

  res.json(rows.map(formatActivity));
});

router.post("/activities", async (req, res) => {
  const parsed = CreateActivityBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [activity] = await db.insert(activitiesTable).values(parsed.data).returning();

  const contact = activity.contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, activity.contactId)).limit(1)
    : [];
  const deal = activity.dealId
    ? await db.select().from(dealsTable).where(eq(dealsTable.id, activity.dealId)).limit(1)
    : [];

  res.status(201).json(formatActivity({
    ...activity,
    contactName: contact[0] ? `${contact[0].firstName} ${contact[0].lastName}` : null,
    dealTitle: deal[0]?.title ?? null,
  }));
});

router.patch("/activities/:id", async (req, res) => {
  const paramParsed = UpdateActivityParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateActivityBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [updated] = await db
    .update(activitiesTable)
    .set(bodyParsed.data)
    .where(eq(activitiesTable.id, paramParsed.data.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const contact = updated.contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, updated.contactId)).limit(1)
    : [];
  const deal = updated.dealId
    ? await db.select().from(dealsTable).where(eq(dealsTable.id, updated.dealId)).limit(1)
    : [];

  res.json(formatActivity({
    ...updated,
    contactName: contact[0] ? `${contact[0].firstName} ${contact[0].lastName}` : null,
    dealTitle: deal[0]?.title ?? null,
  }));
});

router.delete("/activities/:id", async (req, res) => {
  const parsed = DeleteActivityParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(activitiesTable).where(eq(activitiesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
