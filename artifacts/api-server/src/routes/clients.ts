import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, rentalsTable, propertiesTable } from "@workspace/db";
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

async function tenantOwnsProperty(propertyId: number, tenantId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: propertiesTable.id })
    .from(propertiesTable)
    .where(and(eq(propertiesTable.id, propertyId), eq(propertiesTable.tenantId, tenantId)))
    .limit(1);
  return !!row;
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
      propertyId: clientsTable.propertyId,
      propertyName: propertiesTable.name,
      squareCustomerId: clientsTable.squareCustomerId,
      notes: clientsTable.notes,
      createdAt: clientsTable.createdAt,
    })
    .from(clientsTable)
    .leftJoin(
      propertiesTable,
      and(
        eq(clientsTable.propertyId, propertiesTable.id),
        eq(propertiesTable.tenantId, tenantId),
      ),
    )
    .where(and(...conditions))
    .orderBy(sql`${clientsTable.createdAt} desc`);

  const rentalCounts = await db
    .select({
      clientId: rentalsTable.clientId,
      cnt: sql<number>`count(*)::int`,
    })
    .from(rentalsTable)
    .where(and(eq(rentalsTable.tenantId, tenantId), eq(rentalsTable.archived, false)))
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
  if (parsed.data.propertyId != null && !(await tenantOwnsProperty(parsed.data.propertyId, tenantId))) {
    res.status(400).json({ error: "Invalid property" }); return;
  }
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
    .where(and(eq(rentalsTable.clientId, client.id), eq(rentalsTable.tenantId, tenantId), eq(rentalsTable.archived, false)));

  res.json({ ...client, activeRentalCount: countRow?.cnt ?? 0, createdAt: client.createdAt.toISOString() });
});

router.patch("/clients/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const paramParsed = UpdateClientParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateClientBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  if (bodyParsed.data.propertyId != null && !(await tenantOwnsProperty(bodyParsed.data.propertyId, tenantId))) {
    res.status(400).json({ error: "Invalid property" }); return;
  }

  const [updated] = await db
    .update(clientsTable)
    .set(bodyParsed.data)
    .where(and(eq(clientsTable.id, paramParsed.data.id), eq(clientsTable.tenantId, tenantId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [countRow] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(rentalsTable)
    .where(and(eq(rentalsTable.clientId, updated.id), eq(rentalsTable.tenantId, tenantId), eq(rentalsTable.archived, false)));

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

router.post("/clients/import", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const body = req.body as { rows?: unknown[] };
  if (!Array.isArray(body?.rows)) { res.status(400).json({ error: "rows must be an array" }); return; }

  let clientsCreated = 0;
  let rentalsCreated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const skippedReasons: string[] = [];

  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i] as Record<string, unknown>;
    const rowNum = i + 1;
    const name = (typeof row.renterName === "string" ? row.renterName : "").trim();
    if (!name) { skipped++; continue; }

    try {
      const existing = await db.select({ id: clientsTable.id }).from(clientsTable)
        .where(and(eq(clientsTable.tenantId, tenantId), ilike(clientsTable.name, name)))
        .limit(1);
      if (existing.length > 0) {
        skipped++;
        skippedReasons.push(`Client '${name}' already exists`);
        continue;
      }
      const stageRaw = typeof row.stage === "string" ? row.stage.trim().toLowerCase() : "";
      const status = stageRaw === "installed" ? "active_renter" : "lead";

      const [client] = await db.insert(clientsTable).values({
        tenantId,
        name,
        email: typeof row.email === "string" && row.email ? row.email : null,
        phone: typeof row.phone === "string" && row.phone ? row.phone : null,
        notes: typeof row.notes === "string" && row.notes ? row.notes : null,
        status,
      }).returning();
      clientsCreated++;

      const revenue = typeof row.revenue === "number" ? row.revenue : null;
      const costOfMachine = typeof row.costOfMachine === "number" ? row.costOfMachine : null;
      const termMonths = typeof row.termMonths === "number" && row.termMonths > 0 ? row.termMonths : null;
      const machineCode = typeof row.machineCode === "string" && row.machineCode ? row.machineCode : null;
      const brand = typeof row.brand === "string" && row.brand ? row.brand : null;
      const paidOff = typeof row.paidOff === "boolean" ? row.paidOff : false;

      const hasRentalData = machineCode || brand || revenue != null || costOfMachine != null || termMonths != null;
      if (hasRentalData) {
        const today = new Date().toISOString().split("T")[0];
        await db.insert(rentalsTable).values({
          tenantId,
          clientId: client.id,
          machineCode,
          brand,
          monthlyRate: String(revenue ?? 0),
          costOfMachine: costOfMachine != null ? String(costOfMachine) : null,
          paidOff,
          termMonths: termMonths ?? 12,
          startDate: today,
        });
        rentalsCreated++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Row ${rowNum} (${name}): ${msg}`);
    }
  }

  res.json({ clientsCreated, rentalsCreated, skipped, errors, skippedReasons });
});

export { computeMonthsRemaining };
export default router;
