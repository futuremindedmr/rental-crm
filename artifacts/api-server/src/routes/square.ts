import { Router } from "express";
import { db } from "@workspace/db";
import { squarePaymentsTable, squareInvoicesTable, clientsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ListSquarePaymentsQueryParams, ListSquareInvoicesQueryParams } from "@workspace/api-zod";

const router = Router();

function isSquareConnected(): boolean {
  return !!process.env.SQUARE_ACCESS_TOKEN;
}

router.get("/square/status", async (_req, res) => {
  const connected = isSquareConnected();
  res.json({ connected, merchantId: null });
});

router.get("/square/payments", async (req, res) => {
  const parsed = ListSquarePaymentsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

  const conditions = parsed.data.clientId != null
    ? [eq(squarePaymentsTable.clientId, parsed.data.clientId)]
    : [];

  const rows = await db
    .select({
      id: squarePaymentsTable.id,
      clientId: squarePaymentsTable.clientId,
      clientName: clientsTable.name,
      squarePaymentId: squarePaymentsTable.squarePaymentId,
      amount: squarePaymentsTable.amount,
      status: squarePaymentsTable.status,
      description: squarePaymentsTable.description,
      paymentDate: squarePaymentsTable.paymentDate,
      createdAt: squarePaymentsTable.createdAt,
    })
    .from(squarePaymentsTable)
    .leftJoin(clientsTable, eq(squarePaymentsTable.clientId, clientsTable.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(sql`${squarePaymentsTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

router.get("/square/invoices", async (req, res) => {
  const parsed = ListSquareInvoicesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

  const conditions = parsed.data.clientId != null
    ? [eq(squareInvoicesTable.clientId, parsed.data.clientId)]
    : [];

  const rows = await db
    .select({
      id: squareInvoicesTable.id,
      clientId: squareInvoicesTable.clientId,
      clientName: clientsTable.name,
      squareInvoiceId: squareInvoicesTable.squareInvoiceId,
      amount: squareInvoicesTable.amount,
      status: squareInvoicesTable.status,
      dueDate: squareInvoicesTable.dueDate,
      createdAt: squareInvoicesTable.createdAt,
    })
    .from(squareInvoicesTable)
    .leftJoin(clientsTable, eq(squareInvoicesTable.clientId, clientsTable.id))
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(sql`${squareInvoicesTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

router.post("/square/sync", async (req, res) => {
  if (!isSquareConnected()) {
    res.status(503).json({ error: "Square not connected. Connect Square from the dashboard to enable sync." });
    return;
  }

  // Square sync will be implemented once connector is active
  res.json({ customersImported: 0, paymentsImported: 0, invoicesImported: 0 });
});

export default router;
