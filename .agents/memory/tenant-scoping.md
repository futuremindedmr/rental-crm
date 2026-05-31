---
name: Tenant scoping in multi-tenant CRM
description: Non-obvious tenant-isolation rules for RentTrack handlers — client reassignment and join readbacks
---

# Tenant isolation rules (RentTrack)

All data is tenant-scoped via `requireTenant(req, res)` returning `tenantId`. Mutating a row scoped by `<table>.tenantId` is NOT enough on its own.

## Rule: validate foreign-key ownership on write
When a create/update body accepts a foreign key to another tenant-owned table (e.g. `clientId` on manual payments), you MUST verify that referenced row belongs to the same `tenantId` BEFORE insert/update. Reject with 400 "Invalid client" otherwise.

**Why:** the row's own `tenant_id` predicate does not stop a caller from pointing `clientId` at another tenant's client. Without the check you get cross-tenant referential pollution.

**How to apply:** in every handler that accepts an FK in the body, `select ... where id = fk AND tenantId = tenantId` first; bail if no row.

## Rule: tenant-guard the client name readback / join
When resolving a related row's display field (e.g. `clientName`) for the response, scope it by tenant too — in joins add the tenant predicate to the join condition (`leftJoin(clients, and(eq(mp.clientId, clients.id), eq(clients.tenantId, tenantId)))`), and in single-row readbacks add `AND clients.tenantId = tenantId`.

**Why:** resolving by `id` only can leak another tenant's name.
