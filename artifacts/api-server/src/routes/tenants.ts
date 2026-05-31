import { Router } from "express";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/tenants/current", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select({ tenantId: usersTable.tenantId })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  if (!user?.tenantId) {
    res.json({ tenant: null });
    return;
  }

  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, user.tenantId))
    .limit(1);

  res.json({ tenant: tenant ?? null });
});

router.post("/tenants", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Business name is required" });
    return;
  }

  const [existingUser] = await db
    .select({ tenantId: usersTable.tenantId })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  if (existingUser?.tenantId) {
    res.status(409).json({ error: "Already belongs to a business account" });
    return;
  }

  const [tenant] = await db
    .insert(tenantsTable)
    .values({ name: name.trim() })
    .returning();

  await db
    .update(usersTable)
    .set({ tenantId: tenant.id })
    .where(eq(usersTable.id, req.user.id));

  res.status(201).json({ tenant });
});

export default router;
