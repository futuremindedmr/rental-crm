import { Router } from "express";
import { db } from "@workspace/db";
import { rentalsTable, clientsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListRentalsQueryParams,
  CreateRentalBody,
  GetRentalParams,
  UpdateRentalParams,
  UpdateRentalBody,
  DeleteRentalParams,
} from "@workspace/api-zod";

const router = Router();

function computeMonthsRemaining(startDate: string, termMonths: number): number {
  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  return Math.max(0, termMonths - monthsElapsed);
}

function formatRental(row: {
  id: number;
  clientId: number;
  clientName: string | null;
  unitDescription: string | null;
  startDate: string;
  termMonths: number;
  monthlyRate: string;
  notes: string | null;
  createdAt: Date;
}) {
  const monthsRemaining = computeMonthsRemaining(row.startDate, row.termMonths);
  return {
    ...row,
    monthlyRate: Number(row.monthlyRate),
    monthsRemaining,
    isExpiringSoon: monthsRemaining <= 2 && monthsRemaining > 0,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/rentals", async (req, res) => {
  const parsed = ListRentalsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }
  const { clientId, expiringSoon } = parsed.data;

  const conditions = [];
  if (clientId != null) conditions.push(eq(rentalsTable.clientId, clientId));

  const rows = await db
    .select({
      id: rentalsTable.id,
      clientId: rentalsTable.clientId,
      clientName: clientsTable.name,
      unitDescription: rentalsTable.unitDescription,
      startDate: rentalsTable.startDate,
      termMonths: rentalsTable.termMonths,
      monthlyRate: rentalsTable.monthlyRate,
      notes: rentalsTable.notes,
      createdAt: rentalsTable.createdAt,
    })
    .from(rentalsTable)
    .leftJoin(clientsTable, eq(rentalsTable.clientId, clientsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${rentalsTable.createdAt} desc`);

  let result = rows.map(formatRental);
  if (expiringSoon === true || expiringSoon === "true" as unknown) {
    result = result.filter(r => r.isExpiringSoon);
  }

  res.json(result);
});

router.post("/rentals", async (req, res) => {
  const parsed = CreateRentalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [rental] = await db.insert(rentalsTable).values({
    ...parsed.data,
    monthlyRate: String(parsed.data.monthlyRate),
  }).returning();

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, rental.clientId)).limit(1);

  res.status(201).json(formatRental({ ...rental, clientName: client?.name ?? null }));
});

router.get("/rentals/:id", async (req, res) => {
  const parsed = GetRentalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      id: rentalsTable.id,
      clientId: rentalsTable.clientId,
      clientName: clientsTable.name,
      unitDescription: rentalsTable.unitDescription,
      startDate: rentalsTable.startDate,
      termMonths: rentalsTable.termMonths,
      monthlyRate: rentalsTable.monthlyRate,
      notes: rentalsTable.notes,
      createdAt: rentalsTable.createdAt,
    })
    .from(rentalsTable)
    .leftJoin(clientsTable, eq(rentalsTable.clientId, clientsTable.id))
    .where(eq(rentalsTable.id, parsed.data.id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatRental(row));
});

router.patch("/rentals/:id", async (req, res) => {
  const paramParsed = UpdateRentalParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateRentalBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const updateData: Record<string, unknown> = { ...bodyParsed.data };
  if (updateData.monthlyRate !== undefined) updateData.monthlyRate = String(updateData.monthlyRate);

  const [updated] = await db
    .update(rentalsTable)
    .set(updateData)
    .where(eq(rentalsTable.id, paramParsed.data.id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, updated.clientId)).limit(1);

  res.json(formatRental({ ...updated, clientName: client?.name ?? null }));
});

router.delete("/rentals/:id", async (req, res) => {
  const parsed = DeleteRentalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(rentalsTable).where(eq(rentalsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
