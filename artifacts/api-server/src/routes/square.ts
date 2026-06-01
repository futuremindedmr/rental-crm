import { Router } from "express";
import { db } from "@workspace/db";
import { squarePaymentsTable, squareInvoicesTable, clientsTable, tenantsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { ListSquarePaymentsQueryParams, ListSquareInvoicesQueryParams } from "@workspace/api-zod";
import { requireTenant } from "../lib/tenant";

const router = Router();

const SQUARE_API_BASE = "https://connect.squareup.com";

function getRedirectUri(req: { headers: { host?: string } }): string {
  const domains = process.env.REPLIT_DOMAINS;
  const host = domains ? domains.split(",")[0].trim() : req.headers.host ?? "localhost";
  const scheme = host.includes("localhost") ? "http" : "https";
  return `${scheme}://${host}/api/square/oauth/callback`;
}

async function squareFetch(path: string, accessToken: string, options?: RequestInit) {
  const res = await fetch(`${SQUARE_API_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Square API error ${res.status}: ${body}`);
  }
  return res.json();
}

async function getTenantSquareToken(tenantId: number): Promise<string | null> {
  const [tenant] = await db
    .select({ squareAccessToken: tenantsTable.squareAccessToken })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId))
    .limit(1);
  return tenant?.squareAccessToken ?? null;
}

// ── OAuth start ────────────────────────────────────────────────────────────

router.get("/square/oauth/start", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (!tenantId) return;

  const clientId = process.env.SQUARE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "Square is not configured. Add SQUARE_CLIENT_ID to environment secrets." });
    return;
  }

  const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64url");
  const redirectUri = getRedirectUri(req);

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "CUSTOMERS_READ PAYMENTS_READ INVOICES_READ MERCHANT_PROFILE_READ",
    session: "false",
    state,
    redirect_uri: redirectUri,
  });

  res.json({ url: `${SQUARE_API_BASE}/oauth2/authorize?${params.toString()}` });
});

// ── OAuth callback ─────────────────────────────────────────────────────────

router.get("/square/oauth/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  const redirectBase = (() => {
    const domains = process.env.REPLIT_DOMAINS;
    const host = domains ? domains.split(",")[0].trim() : req.headers.host ?? "localhost";
    const scheme = host.includes("localhost") ? "http" : "https";
    return `${scheme}://${host}`;
  })();

  if (error) {
    res.redirect(`${redirectBase}/settings?squareError=${encodeURIComponent(error)}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${redirectBase}/settings?squareError=missing_params`);
    return;
  }

  let tenantId: number;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    tenantId = decoded.tenantId;
  } catch {
    res.redirect(`${redirectBase}/settings?squareError=invalid_state`);
    return;
  }

  const clientId = process.env.SQUARE_CLIENT_ID;
  const clientSecret = process.env.SQUARE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.redirect(`${redirectBase}/settings?squareError=not_configured`);
    return;
  }

  try {
    const tokenRes = await fetch(`${SQUARE_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Square-Version": "2024-01-18" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: getRedirectUri(req),
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      req.log?.error({ status: tokenRes.status, body }, "Square token exchange failed");
      res.redirect(`${redirectBase}/settings?squareError=token_exchange_failed`);
      return;
    }

    const tokenData = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      merchant_id: string;
    };

    await db
      .update(tenantsTable)
      .set({
        squareAccessToken: tokenData.access_token,
        squareRefreshToken: tokenData.refresh_token,
        squareMerchantId: tokenData.merchant_id,
      })
      .where(eq(tenantsTable.id, tenantId));

    res.redirect(`${redirectBase}/settings?squareConnected=1`);
  } catch (err) {
    req.log?.error({ err }, "Square OAuth callback error");
    res.redirect(`${redirectBase}/settings?squareError=server_error`);
  }
});

// ── Disconnect ─────────────────────────────────────────────────────────────

router.delete("/square/disconnect", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (!tenantId) return;

  await db
    .update(tenantsTable)
    .set({ squareAccessToken: null, squareRefreshToken: null, squareMerchantId: null, squareLastSyncAt: null })
    .where(eq(tenantsTable.id, tenantId));

  res.status(204).send();
});

// ── Status ─────────────────────────────────────────────────────────────────

router.get("/square/status", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (!tenantId) return;

  const [tenant] = await db
    .select({
      squareAccessToken: tenantsTable.squareAccessToken,
      squareMerchantId: tenantsTable.squareMerchantId,
      squareLastSyncAt: tenantsTable.squareLastSyncAt,
    })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId))
    .limit(1);

  const connected = !!tenant?.squareAccessToken;
  res.json({
    connected,
    merchantId: tenant?.squareMerchantId ?? null,
    lastSyncAt: tenant?.squareLastSyncAt ? tenant.squareLastSyncAt.toISOString() : null,
  });
});

// ── Payments ───────────────────────────────────────────────────────────────

router.get("/square/payments", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (!tenantId) return;

  const parsed = ListSquarePaymentsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

  const conditions = [
    eq(squarePaymentsTable.tenantId, tenantId),
    ...(parsed.data.clientId != null ? [eq(squarePaymentsTable.clientId, parsed.data.clientId)] : []),
  ];

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
    .where(and(...conditions))
    .orderBy(sql`${squarePaymentsTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

// ── Invoices ───────────────────────────────────────────────────────────────

router.get("/square/invoices", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (!tenantId) return;

  const parsed = ListSquareInvoicesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query params" }); return; }

  const conditions = [
    eq(squareInvoicesTable.tenantId, tenantId),
    ...(parsed.data.clientId != null ? [eq(squareInvoicesTable.clientId, parsed.data.clientId)] : []),
  ];

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
    .where(and(...conditions))
    .orderBy(sql`${squareInvoicesTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, amount: Number(r.amount), createdAt: r.createdAt.toISOString() })));
});

// ── Sync ───────────────────────────────────────────────────────────────────

router.post("/square/sync", async (req, res) => {
  const tenantId = await requireTenant(req, res);
  if (!tenantId) return;

  const accessToken = await getTenantSquareToken(tenantId);
  if (!accessToken) {
    res.status(503).json({ error: "Square not connected. Connect Square from Settings to enable sync." });
    return;
  }

  let customersImported = 0;
  let paymentsImported = 0;
  let invoicesImported = 0;

  try {
    // ── Sync customers ──────────────────────────────────────────────────────
    const squareCustomerIdMap = new Map<string, number>(); // squareCustomerId → clientId
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({ limit: "200" });
      if (cursor) params.set("cursor", cursor);
      const data = await squareFetch(`/v2/customers?${params}`, accessToken) as {
        customers?: Array<{ id: string; given_name?: string; family_name?: string; email_address?: string }>;
        cursor?: string;
      };

      for (const customer of data.customers ?? []) {
        const fullName = [customer.given_name, customer.family_name].filter(Boolean).join(" ");
        const email = customer.email_address;

        // Try matching by email first, then name
        const emailClients = email
          ? await db.select({ id: clientsTable.id }).from(clientsTable)
              .where(and(eq(clientsTable.tenantId, tenantId), eq(clientsTable.email, email))).limit(1)
          : [];

        const nameClients = emailClients.length === 0 && fullName
          ? await db.select({ id: clientsTable.id }).from(clientsTable)
              .where(and(eq(clientsTable.tenantId, tenantId), eq(clientsTable.name, fullName))).limit(1)
          : [];

        const matchedClient = emailClients[0] ?? nameClients[0];
        if (matchedClient) {
          await db.update(clientsTable)
            .set({ squareCustomerId: customer.id })
            .where(eq(clientsTable.id, matchedClient.id));
          squareCustomerIdMap.set(customer.id, matchedClient.id);
          customersImported++;
        }
      }

      cursor = data.cursor;
    } while (cursor);

    // Build map from existing DB records too (clients already linked before this sync)
    const linkedClients = await db
      .select({ id: clientsTable.id, squareCustomerId: clientsTable.squareCustomerId })
      .from(clientsTable)
      .where(and(eq(clientsTable.tenantId, tenantId), sql`${clientsTable.squareCustomerId} is not null`));
    for (const c of linkedClients) {
      if (c.squareCustomerId) squareCustomerIdMap.set(c.squareCustomerId, c.id);
    }

    // ── Sync payments ───────────────────────────────────────────────────────
    let paymentCursor: string | undefined;
    do {
      const params = new URLSearchParams({ limit: "200", sort_order: "DESC" });
      if (paymentCursor) params.set("cursor", paymentCursor);
      const data = await squareFetch(`/v2/payments?${params}`, accessToken) as {
        payments?: Array<{
          id: string;
          amount_money?: { amount?: number };
          status?: string;
          note?: string;
          created_at?: string;
          customer_id?: string;
        }>;
        cursor?: string;
      };

      for (const payment of data.payments ?? []) {
        const clientId = payment.customer_id ? squareCustomerIdMap.get(payment.customer_id) ?? null : null;
        const amount = payment.amount_money?.amount ?? 0;
        const paymentDate = payment.created_at ? new Date(payment.created_at) : null;

        await db
          .insert(squarePaymentsTable)
          .values({
            tenantId,
            clientId,
            squarePaymentId: payment.id,
            amount: String(amount),
            status: payment.status ?? "UNKNOWN",
            description: payment.note ?? null,
            paymentDate,
          })
          .onConflictDoUpdate({
            target: squarePaymentsTable.squarePaymentId,
            set: {
              clientId,
              amount: String(amount),
              status: payment.status ?? "UNKNOWN",
              description: payment.note ?? null,
              paymentDate,
            },
          });
        paymentsImported++;
      }

      paymentCursor = data.cursor;
    } while (paymentCursor);

    // ── Sync invoices ───────────────────────────────────────────────────────
    // Get merchant's main location for invoice listing
    let locationId: string | undefined;
    try {
      const merchantData = await squareFetch("/v2/merchants/me", accessToken) as {
        merchant?: { main_location_id?: string };
      };
      locationId = merchantData.merchant?.main_location_id;
    } catch {
      // Fallback: try getting locations
      try {
        const locData = await squareFetch("/v2/locations", accessToken) as {
          locations?: Array<{ id: string }>;
        };
        locationId = locData.locations?.[0]?.id;
      } catch { /* skip invoices */ }
    }

    if (locationId) {
      let invoiceCursor: string | undefined;
      do {
        const params = new URLSearchParams({ location_id: locationId, limit: "200" });
        if (invoiceCursor) params.set("cursor", invoiceCursor);
        const data = await squareFetch(`/v2/invoices?${params}`, accessToken) as {
          invoices?: Array<{
            id: string;
            status?: string;
            primary_recipient?: { customer_id?: string };
            payment_requests?: Array<{ computed_amount_money?: { amount?: number }; due_date?: string }>;
          }>;
          cursor?: string;
        };

        for (const invoice of data.invoices ?? []) {
          const customerId = invoice.primary_recipient?.customer_id;
          const clientId = customerId ? squareCustomerIdMap.get(customerId) ?? null : null;
          const request = invoice.payment_requests?.[0];
          const amount = request?.computed_amount_money?.amount ?? 0;
          const dueDate = request?.due_date ? new Date(request.due_date) : null;

          await db
            .insert(squareInvoicesTable)
            .values({
              tenantId,
              clientId,
              squareInvoiceId: invoice.id,
              amount: String(amount),
              status: invoice.status ?? "UNKNOWN",
              dueDate,
            })
            .onConflictDoUpdate({
              target: squareInvoicesTable.squareInvoiceId,
              set: {
                clientId,
                amount: String(amount),
                status: invoice.status ?? "UNKNOWN",
                dueDate,
              },
            });
          invoicesImported++;
        }

        invoiceCursor = data.cursor;
      } while (invoiceCursor);
    }

    // ── Update last sync timestamp ──────────────────────────────────────────
    await db
      .update(tenantsTable)
      .set({ squareLastSyncAt: new Date() })
      .where(eq(tenantsTable.id, tenantId));

    res.json({ customersImported, paymentsImported, invoicesImported });
  } catch (err) {
    req.log.error({ err }, "Square sync failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

export default router;
