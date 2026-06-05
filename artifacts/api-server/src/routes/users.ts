import { Router } from "express";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireTenant } from "../lib/tenant";

const router = Router();

const CreateUserBody = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

// ── GET /users — list all users in the current tenant ──────────────────────

router.get("/users", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId));

  res.json({ users });
});

// ── POST /users — create a user and assign to current tenant ───────────────

router.post("/users", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: z.prettifyError(parsed.error) });
    return;
  }

  const { email, password, firstName, lastName } = parsed.data;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      tenantId,
    })
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    });

  req.log.info({ userId: user.id, tenantId }, "New user created by admin");
  res.status(201).json({ user });
});

// ── DELETE /users/:id — remove a user from the tenant ─────────────────────

router.delete("/users/:id", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (tenantId === null) return;

  const targetId = req.params.id;

  if (targetId === req.user!.id) {
    res.status(400).json({ error: "You cannot remove your own account." });
    return;
  }

  const [target] = await db
    .select({ id: usersTable.id, tenantId: usersTable.tenantId })
    .from(usersTable)
    .where(eq(usersTable.id, targetId))
    .limit(1);

  if (!target || target.tenantId !== tenantId) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const [countRow] = await db
    .select({ n: count() })
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId));

  if (Number(countRow?.n ?? 0) <= 1) {
    res.status(400).json({ error: "Cannot remove the last user in this account." });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, targetId));
  res.status(204).send();
});

export default router;
