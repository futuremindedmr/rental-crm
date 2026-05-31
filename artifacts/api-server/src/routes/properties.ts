import { Router } from "express";
import { db, propertiesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreatePropertyBody,
  UpdatePropertyParams,
  UpdatePropertyBody,
  DeletePropertyParams,
} from "@workspace/api-zod";
import { requireTenant } from "../lib/tenant";

const router = Router();

router.get("/properties", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const rows = await db
    .select()
    .from(propertiesTable)
    .where(eq(propertiesTable.tenantId, tenantId))
    .orderBy(sql`${propertiesTable.createdAt} desc`);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/properties", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = CreatePropertyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [property] = await db
    .insert(propertiesTable)
    .values({ ...parsed.data, tenantId })
    .returning();
  res.status(201).json({ ...property, createdAt: property.createdAt.toISOString() });
});

router.patch("/properties/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const paramParsed = UpdatePropertyParams.safeParse({ id: Number(req.params.id) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdatePropertyBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [updated] = await db
    .update(propertiesTable)
    .set(bodyParsed.data)
    .where(and(eq(propertiesTable.id, paramParsed.data.id), eq(propertiesTable.tenantId, tenantId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/properties/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = DeletePropertyParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(propertiesTable)
    .where(and(eq(propertiesTable.id, parsed.data.id), eq(propertiesTable.tenantId, tenantId)));
  res.status(204).send();
});

export default router;
