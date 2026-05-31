import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, contactsTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";
import {
  ListCompaniesQueryParams,
  CreateCompanyBody,
  GetCompanyParams,
  UpdateCompanyParams,
  UpdateCompanyBody,
  DeleteCompanyParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/companies", async (req, res) => {
  const parsed = ListCompaniesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const { search } = parsed.data;

  const contactCountSq = db
    .select({
      companyId: contactsTable.companyId,
      cnt: sql<number>`count(*)::int`.as("cnt"),
    })
    .from(contactsTable)
    .groupBy(contactsTable.companyId)
    .as("contact_counts");

  let query = db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      domain: companiesTable.domain,
      industry: companiesTable.industry,
      size: companiesTable.size,
      phone: companiesTable.phone,
      address: companiesTable.address,
      notes: companiesTable.notes,
      createdAt: companiesTable.createdAt,
      contactCount: sql<number>`coalesce(${contactCountSq.cnt}, 0)`,
    })
    .from(companiesTable)
    .leftJoin(contactCountSq, eq(companiesTable.id, contactCountSq.companyId))
    .orderBy(sql`${companiesTable.createdAt} desc`);

  if (search) {
    query = query.where(ilike(companiesTable.name, `%${search}%`)) as typeof query;
  }

  const rows = await query;
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/companies", async (req, res) => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const [company] = await db.insert(companiesTable).values(parsed.data).returning();
  res.status(201).json({ ...company, contactCount: 0, createdAt: company.createdAt.toISOString() });
});

router.get("/companies/:id", async (req, res) => {
  const parsed = GetCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const contactCountSq = db
    .select({
      companyId: contactsTable.companyId,
      cnt: sql<number>`count(*)::int`.as("cnt"),
    })
    .from(contactsTable)
    .groupBy(contactsTable.companyId)
    .as("contact_counts");

  const rows = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      domain: companiesTable.domain,
      industry: companiesTable.industry,
      size: companiesTable.size,
      phone: companiesTable.phone,
      address: companiesTable.address,
      notes: companiesTable.notes,
      createdAt: companiesTable.createdAt,
      contactCount: sql<number>`coalesce(${contactCountSq.cnt}, 0)`,
    })
    .from(companiesTable)
    .leftJoin(contactCountSq, eq(companiesTable.id, contactCountSq.companyId))
    .where(eq(companiesTable.id, parsed.data.id))
    .limit(1);

  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...rows[0], createdAt: rows[0].createdAt.toISOString() });
});

router.patch("/companies/:id", async (req, res) => {
  const paramParsed = UpdateCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateCompanyBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [updated] = await db
    .update(companiesTable)
    .set(bodyParsed.data)
    .where(eq(companiesTable.id, paramParsed.data.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const contactCount = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(contactsTable)
    .where(eq(contactsTable.companyId, updated.id));

  res.json({ ...updated, contactCount: contactCount[0]?.cnt ?? 0, createdAt: updated.createdAt.toISOString() });
});

router.delete("/companies/:id", async (req, res) => {
  const parsed = DeleteCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(companiesTable).where(eq(companiesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
