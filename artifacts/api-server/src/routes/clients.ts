import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, rentalsTable } from "@workspace/db";
import { eq, ilike, and, or, sql } from "drizzle-orm";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
} from "@workspace/api-zod";
import { requireTenant } from "../lib/tenant";

const router = Router();

function computeMonthsRemaining(startDate: string, termMonths: number): number {
  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, termMonths - monthsElapsed);
}

router.get("/clients", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const { search, status } = parsed.data;

  const conditions = [eq(clientsTable.tenantId, tenantId)];
  if (search) {
    conditions.push(or(
      ilike(clientsTable.name, `%${search}%`),
      ilike(clientsTable.email, `%${search}%`),
      ilike(clientsTable.phone, `%${search}%`),
    )!);
  }
  if (status) conditions.push(eq(clientsTable.status, status));

  const rows = await db
    .select({
      id: clientsTable.id,
      name: clientsTable.name,
      address: clientsTable.address,
      phone: clientsTable.phone,
      email: clientsTable.email,
      status: clientsTable.status,
      squareCustomerId: clientsTable.squareCustomerId,
      notes: clientsTable.notes,
      createdAt: clientsTable.createdAt,
    })
    .from(clientsTable)
    .where(and(...conditions))
    .orderBy(sql`${clientsTable.createdAt} desc`);

  const rentalCounts = await db
    .select({
      clientId: rentalsTable.clientId,
      cnt: sql<number>`count(*)::int`,
    })
    .from(rentalsTable)
    .where(eq(rentalsTable.tenantId, tenantId))
    .groupBy(rentalsTable.clientId);

  const countMap = new Map(rentalCounts.map(r => [r.clientId, r.cnt]));

  res.json(rows.map(r => ({
    ...r,
    activeRentalCount: countMap.get(r.id) ?? 0,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/clients", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const [client] = await db.insert(clientsTable).values({ ...parsed.data, tenantId }).returning();
  res.status(201).json({ ...client, activeRentalCount: 0, createdAt: client.createdAt.toISOString() });
});

router.get("/clients/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = GetClientParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [client] = await db.select().from(clientsTable)
    .where(and(eq(clientsTable.id, parsed.data.id), eq(clientsTable.tenantId, tenantId)))
    .limit(1);
  if (!client) { res.status(404).json({ error: "Not found" }); return; }

  const [countRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(rentalsTable)
    .where(and(eq(rentalsTable.clientId, client.id), eq(rentalsTable.tenantId, tenantId)));

  res.json({ ...client, activeRentalCount: countRow?.cnt ?? 0, createdAt: client.createdAt.toISOString() });
});

router.patch("/clients/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const paramParsed = UpdateClientParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateClientBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [updated] = await db
    .update(clientsTable)
    .set(bodyParsed.data)
    .where(and(eq(clientsTable.id, paramParsed.data.id), eq(clientsTable.tenantId, tenantId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [countRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(rentalsTable)
    .where(and(eq(rentalsTable.clientId, updated.id), eq(rentalsTable.tenantId, tenantId)));

  res.json({ ...updated, activeRentalCount: countRow?.cnt ?? 0, createdAt: updated.createdAt.toISOString() });
});

router.delete("/clients/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = DeleteClientParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(clientsTable)
    .where(and(eq(clientsTable.id, parsed.data.id), eq(clientsTable.tenantId, tenantId)));
  res.status(204).send();
});

export { computeMonthsRemaining };
export default router;
