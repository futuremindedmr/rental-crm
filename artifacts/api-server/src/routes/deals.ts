import { Router } from "express";
import { db } from "@workspace/db";
import { dealsTable, contactsTable, companiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListDealsQueryParams,
  CreateDealBody,
  GetDealParams,
  UpdateDealParams,
  UpdateDealBody,
  DeleteDealParams,
} from "@workspace/api-zod";

const router = Router();

function formatDeal(row: {
  id: number;
  title: string;
  stage: string;
  value: string;
  probability: number | null;
  contactId: number | null;
  contactName: string | null;
  companyId: number | null;
  companyName: string | null;
  expectedCloseDate: string | null;
  notes: string | null;
  createdAt: Date;
}) {
  return {
    ...row,
    value: Number(row.value),
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/deals", async (req, res) => {
  const parsed = ListDealsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const { stage, contactId, companyId } = parsed.data;

  const conditions = [];
  if (stage) conditions.push(eq(dealsTable.stage, stage));
  if (contactId != null) conditions.push(eq(dealsTable.contactId, contactId));
  if (companyId != null) conditions.push(eq(dealsTable.companyId, companyId));

  const rows = await db
    .select({
      id: dealsTable.id,
      title: dealsTable.title,
      stage: dealsTable.stage,
      value: dealsTable.value,
      probability: dealsTable.probability,
      contactId: dealsTable.contactId,
      contactName: sql<string | null>`concat(${contactsTable.firstName}, ' ', ${contactsTable.lastName})`,
      companyId: dealsTable.companyId,
      companyName: companiesTable.name,
      expectedCloseDate: dealsTable.expectedCloseDate,
      notes: dealsTable.notes,
      createdAt: dealsTable.createdAt,
    })
    .from(dealsTable)
    .leftJoin(contactsTable, eq(dealsTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(dealsTable.companyId, companiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${dealsTable.createdAt} desc`);

  res.json(rows.map(formatDeal));
});

router.post("/deals", async (req, res) => {
  const parsed = CreateDealBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [deal] = await db.insert(dealsTable).values({
    ...parsed.data,
    value: String(parsed.data.value),
  }).returning();

  const contact = deal.contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, deal.contactId)).limit(1)
    : [];
  const company = deal.companyId
    ? await db.select().from(companiesTable).where(eq(companiesTable.id, deal.companyId)).limit(1)
    : [];

  res.status(201).json(formatDeal({
    ...deal,
    contactName: contact[0] ? `${contact[0].firstName} ${contact[0].lastName}` : null,
    companyName: company[0]?.name ?? null,
  }));
});

router.get("/deals/:id", async (req, res) => {
  const parsed = GetDealParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select({
      id: dealsTable.id,
      title: dealsTable.title,
      stage: dealsTable.stage,
      value: dealsTable.value,
      probability: dealsTable.probability,
      contactId: dealsTable.contactId,
      contactName: sql<string | null>`concat(${contactsTable.firstName}, ' ', ${contactsTable.lastName})`,
      companyId: dealsTable.companyId,
      companyName: companiesTable.name,
      expectedCloseDate: dealsTable.expectedCloseDate,
      notes: dealsTable.notes,
      createdAt: dealsTable.createdAt,
    })
    .from(dealsTable)
    .leftJoin(contactsTable, eq(dealsTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(dealsTable.companyId, companiesTable.id))
    .where(eq(dealsTable.id, parsed.data.id))
    .limit(1);

  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatDeal(rows[0]));
});

router.patch("/deals/:id", async (req, res) => {
  const paramParsed = UpdateDealParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateDealBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const updateData: Record<string, unknown> = { ...bodyParsed.data };
  if (updateData.value !== undefined) updateData.value = String(updateData.value);

  const [updated] = await db
    .update(dealsTable)
    .set(updateData)
    .where(eq(dealsTable.id, paramParsed.data.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const contact = updated.contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, updated.contactId)).limit(1)
    : [];
  const company = updated.companyId
    ? await db.select().from(companiesTable).where(eq(companiesTable.id, updated.companyId)).limit(1)
    : [];

  res.json(formatDeal({
    ...updated,
    contactName: contact[0] ? `${contact[0].firstName} ${contact[0].lastName}` : null,
    companyName: company[0]?.name ?? null,
  }));
});

router.delete("/deals/:id", async (req, res) => {
  const parsed = DeleteDealParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(dealsTable).where(eq(dealsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
