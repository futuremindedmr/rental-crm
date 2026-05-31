import { Router } from "express";
import { db } from "@workspace/db";
import { rentalAgreementsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListAgreementsParams,
  CreateAgreementParams,
  CreateAgreementBody,
  DeleteAgreementParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/clients/:clientId/agreements", async (req, res) => {
  const parsed = ListAgreementsParams.safeParse({ clientId: Number(req.params.clientId) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(rentalAgreementsTable)
    .where(eq(rentalAgreementsTable.clientId, parsed.data.clientId))
    .orderBy(sql`${rentalAgreementsTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/clients/:clientId/agreements", async (req, res) => {
  const paramParsed = CreateAgreementParams.safeParse({ clientId: Number(req.params.clientId) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = CreateAgreementBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const [agreement] = await db
    .insert(rentalAgreementsTable)
    .values({ ...bodyParsed.data, clientId: paramParsed.data.clientId })
    .returning();

  res.status(201).json({ ...agreement, createdAt: agreement.createdAt.toISOString() });
});

router.delete("/clients/:clientId/agreements/:id", async (req, res) => {
  const parsed = DeleteAgreementParams.safeParse({
    clientId: Number(req.params.clientId),
    id: Number(req.params.id),
  });
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }

  await db
    .delete(rentalAgreementsTable)
    .where(and(
      eq(rentalAgreementsTable.id, parsed.data.id),
      eq(rentalAgreementsTable.clientId, parsed.data.clientId),
    ));

  res.status(204).send();
});

export default router;
