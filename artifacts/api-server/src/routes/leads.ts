import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, clientsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListLeadsQueryParams,
  CreateLeadBody,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
  DeleteLeadParams,
} from "@workspace/api-zod";

const router = Router();

function formatLead(row: {
  id: number;
  clientId: number;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  stage: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

const selectLeadWithClient = {
  id: leadsTable.id,
  clientId: leadsTable.clientId,
  clientName: clientsTable.name,
  clientPhone: clientsTable.phone,
  clientEmail: clientsTable.email,
  stage: leadsTable.stage,
  notes: leadsTable.notes,
  createdAt: leadsTable.createdAt,
  updatedAt: leadsTable.updatedAt,
};

router.get("/leads", async (req, res) => {
  const parsed = ListLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const { stage, clientId } = parsed.data;

  const conditions = [];
  if (stage) conditions.push(eq(leadsTable.stage, stage));
  if (clientId != null) conditions.push(eq(leadsTable.clientId, clientId));

  const rows = await db
    .select(selectLeadWithClient)
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${leadsTable.createdAt} desc`);

  res.json(rows.map(formatLead));
});

router.post("/leads", async (req, res) => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [lead] = await db.insert(leadsTable).values(parsed.data).returning();
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, lead.clientId)).limit(1);

  res.status(201).json(formatLead({
    ...lead,
    clientName: client?.name ?? null,
    clientPhone: client?.phone ?? null,
    clientEmail: client?.email ?? null,
  }));
});

router.get("/leads/:id", async (req, res) => {
  const parsed = GetLeadParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select(selectLeadWithClient)
    .from(leadsTable)
    .leftJoin(clientsTable, eq(leadsTable.clientId, clientsTable.id))
    .where(eq(leadsTable.id, parsed.data.id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatLead(row));
});

router.patch("/leads/:id", async (req, res) => {
  const paramParsed = UpdateLeadParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateLeadBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [updated] = await db
    .update(leadsTable)
    .set({ ...bodyParsed.data, updatedAt: new Date() })
    .where(eq(leadsTable.id, paramParsed.data.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, updated.clientId)).limit(1);

  res.json(formatLead({
    ...updated,
    clientName: client?.name ?? null,
    clientPhone: client?.phone ?? null,
    clientEmail: client?.email ?? null,
  }));
});

router.delete("/leads/:id", async (req, res) => {
  const parsed = DeleteLeadParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(leadsTable).where(eq(leadsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
