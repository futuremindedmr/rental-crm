import { type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireTenant(req: Request, res: Response): Promise<number | null> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const [user] = await db
    .select({ tenantId: usersTable.tenantId })
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);

  if (!user?.tenantId) {
    res.status(403).json({ error: "No business account found. Please complete setup." });
    return null;
  }
  return user.tenantId;
}
