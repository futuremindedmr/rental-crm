import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, companiesTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import {
  ListContactsQueryParams,
  CreateContactBody,
  UpdateContactParams,
  UpdateContactBody,
  DeleteContactParams,
  GetContactParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/contacts", async (req, res) => {
  const parsed = ListContactsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { search, companyId, status } = parsed.data;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(contactsTable.firstName, `%${search}%`),
        ilike(contactsTable.lastName, `%${search}%`),
        ilike(contactsTable.email, `%${search}%`),
      )
    );
  }
  if (companyId != null) conditions.push(eq(contactsTable.companyId, companyId));
  if (status) conditions.push(eq(contactsTable.status, status));

  const rows = await db
    .select({
      id: contactsTable.id,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      title: contactsTable.title,
      status: contactsTable.status,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      notes: contactsTable.notes,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${contactsTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/contacts", async (req, res) => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [contact] = await db.insert(contactsTable).values(parsed.data).returning();
  const company = contact.companyId
    ? await db.select().from(companiesTable).where(eq(companiesTable.id, contact.companyId)).limit(1)
    : [];

  res.status(201).json({
    ...contact,
    companyName: company[0]?.name ?? null,
    createdAt: contact.createdAt.toISOString(),
  });
});

router.get("/contacts/:id", async (req, res) => {
  const parsed = GetContactParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select({
      id: contactsTable.id,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      title: contactsTable.title,
      status: contactsTable.status,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      notes: contactsTable.notes,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(eq(contactsTable.id, parsed.data.id))
    .limit(1);

  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...rows[0], createdAt: rows[0].createdAt.toISOString() });
});

router.patch("/contacts/:id", async (req, res) => {
  const paramParsed = UpdateContactParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateContactBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [updated] = await db
    .update(contactsTable)
    .set(bodyParsed.data)
    .where(eq(contactsTable.id, paramParsed.data.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const company = updated.companyId
    ? await db.select().from(companiesTable).where(eq(companiesTable.id, updated.companyId)).limit(1)
    : [];

  res.json({ ...updated, companyName: company[0]?.name ?? null, createdAt: updated.createdAt.toISOString() });
});

router.delete("/contacts/:id", async (req, res) => {
  const parsed = DeleteContactParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(contactsTable).where(eq(contactsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
