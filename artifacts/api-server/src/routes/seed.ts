import { Router, type Request, type Response } from "express";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const TOKEN = "bt-trackable-bootstrap-2026";

router.post("/seed/bootstrap", async (req: Request, res: Response) => {
  if (req.headers["x-bootstrap-token"] !== TOKEN) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, "spindryrentals@gmail.com"))
      .limit(1);

    if (existing) {
      res.json({ ok: true, message: "User already exists", userId: existing.id });
      return;
    }

    const [tenant] = await db
      .insert(tenantsTable)
      .values({ name: "Spin & Dry Rentals" })
      .returning();

    const [user] = await db
      .insert(usersTable)
      .values({
        email: "spindryrentals@gmail.com",
        passwordHash:
          "$2b$12$a0nrJoMWkTwQAt1dBM7fy.srCplbL5AkilqBt7xVcVdAMYJXbebuu",
        firstName: "Michael",
        lastName: "Friedman",
        tenantId: tenant.id,
      })
      .returning({ id: usersTable.id });

    res.json({
      ok: true,
      message: "Bootstrapped successfully",
      tenantId: tenant.id,
      userId: user.id,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
