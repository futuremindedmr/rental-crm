import { Router } from "express";
import { db, tenantsTable, usersTable, clientsTable, propertiesTable, rentalsTable, leadsTable, manualPaymentsTable, squarePaymentsTable, squareInvoicesTable, rentalAgreementsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();

// ── Current tenant ─────────────────────────────────────────────────────────

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

router.patch("/tenants/current", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Business name is required" });
    return;
  }

  const [user] = await db
    .select({ tenantId: usersTable.tenantId })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  if (!user?.tenantId) {
    res.status(403).json({ error: "No business account found" });
    return;
  }

  const [tenant] = await db
    .update(tenantsTable)
    .set({ name: name.trim() })
    .where(eq(tenantsTable.id, user.tenantId))
    .returning();

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

// ── Migration helpers ──────────────────────────────────────────────────────

async function resolveCurrentTenantId(userId: string): Promise<number | null> {
  const [user] = await db
    .select({ tenantId: usersTable.tenantId })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user?.tenantId ?? null;
}

async function verifySourceCredentials(
  email: string,
  password: string,
): Promise<{ tenantId: number; tenantName: string } | { error: string }> {
  const [sourceUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!sourceUser?.passwordHash) {
    return { error: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(password, sourceUser.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  if (!sourceUser.tenantId) {
    return { error: "That account has no business data to migrate." };
  }

  const [sourceTenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, sourceUser.tenantId))
    .limit(1);

  return { tenantId: sourceUser.tenantId, tenantName: sourceTenant?.name ?? "Unknown" };
}

async function countForTenant(tenantId: number) {
  const n = async (table: any, col: any) => {
    const [r] = await db.select({ n: count() }).from(table).where(eq(col, tenantId));
    return Number(r?.n ?? 0);
  };
  const [clients, properties, rentals, leads, manualPayments, squarePayments, squareInvoices, rentalAgreements] = await Promise.all([
    n(clientsTable, clientsTable.tenantId),
    n(propertiesTable, propertiesTable.tenantId),
    n(rentalsTable, rentalsTable.tenantId),
    n(leadsTable, leadsTable.tenantId),
    n(manualPaymentsTable, manualPaymentsTable.tenantId),
    n(squarePaymentsTable, squarePaymentsTable.tenantId),
    n(squareInvoicesTable, squareInvoicesTable.tenantId),
    n(rentalAgreementsTable, rentalAgreementsTable.tenantId),
  ]);
  return { clients, properties, rentals, leads, manualPayments, squarePayments, squareInvoices, rentalAgreements };
}

// ── POST /tenants/migrate/preview ──────────────────────────────────────────

router.post("/tenants/migrate/preview", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const destTenantId = await resolveCurrentTenantId(req.user.id);
  if (!destTenantId) { res.status(403).json({ error: "Your account has no business profile." }); return; }

  const { sourceEmail, sourcePassword } = req.body;
  if (!sourceEmail || !sourcePassword) {
    res.status(400).json({ error: "Source email and password are required." });
    return;
  }

  const source = await verifySourceCredentials(sourceEmail, sourcePassword);
  if ("error" in source) { res.status(401).json({ error: source.error }); return; }

  if (source.tenantId === destTenantId) {
    res.status(400).json({ error: "Source and destination are the same account." });
    return;
  }

  const counts = await countForTenant(source.tenantId);
  res.json({ sourceTenantName: source.tenantName, ...counts });
});

// ── POST /tenants/migrate/execute ──────────────────────────────────────────

router.post("/tenants/migrate/execute", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const destTenantId = await resolveCurrentTenantId(req.user.id);
  if (!destTenantId) { res.status(403).json({ error: "Your account has no business profile." }); return; }

  const { sourceEmail, sourcePassword } = req.body;
  if (!sourceEmail || !sourcePassword) {
    res.status(400).json({ error: "Source email and password are required." });
    return;
  }

  const source = await verifySourceCredentials(sourceEmail, sourcePassword);
  if ("error" in source) { res.status(401).json({ error: source.error }); return; }

  if (source.tenantId === destTenantId) {
    res.status(400).json({ error: "Source and destination are the same account." });
    return;
  }

  const srcId = source.tenantId;

  await db.transaction(async (tx) => {
    await tx.update(clientsTable).set({ tenantId: destTenantId }).where(eq(clientsTable.tenantId, srcId));
    await tx.update(propertiesTable).set({ tenantId: destTenantId }).where(eq(propertiesTable.tenantId, srcId));
    await tx.update(rentalsTable).set({ tenantId: destTenantId }).where(eq(rentalsTable.tenantId, srcId));
    await tx.update(leadsTable).set({ tenantId: destTenantId }).where(eq(leadsTable.tenantId, srcId));
    await tx.update(manualPaymentsTable).set({ tenantId: destTenantId }).where(eq(manualPaymentsTable.tenantId, srcId));
    await tx.update(squarePaymentsTable).set({ tenantId: destTenantId }).where(eq(squarePaymentsTable.tenantId, srcId));
    await tx.update(squareInvoicesTable).set({ tenantId: destTenantId }).where(eq(squareInvoicesTable.tenantId, srcId));
    await tx.update(rentalAgreementsTable).set({ tenantId: destTenantId }).where(eq(rentalAgreementsTable.tenantId, srcId));
  });

  req.log.info({ srcId, destTenantId }, "Tenant data migration completed");
  res.json({ success: true, sourceTenantName: source.tenantName });
});

export default router;
