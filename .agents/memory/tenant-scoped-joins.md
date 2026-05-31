---
name: Tenant-scoped joins and FK writes
description: Multi-tenant CRM — joins and FK assignments across tenant-owned tables must be tenant-scoped on both sides.
---

In this multi-tenant CRM, FKs between tenant-owned tables (e.g. `clients.propertyId -> properties.id`) carry NO tenant constraint at the DB level. So application code must enforce isolation in two places:

1. **Reads / joins**: when LEFT/INNER JOINing one tenant table to another, the join condition must include the related table's `tenantId = tenantId`, not just `a.fk = b.id`. Otherwise a row pointing at another tenant's ID leaks that tenant's data (e.g. foreign property name).

2. **Writes**: when accepting an FK id in create/update bodies (e.g. `propertyId`), verify the referenced row is owned by the caller's tenant before persisting; reject with 400 otherwise. Validating input shape (Zod) is not enough — it does not check ownership.

**Why:** code review caught a cross-tenant exposure where a non-tenant-scoped join + unchecked `propertyId` write let clients link to / leak foreign-tenant properties.

**How to apply:** any new cross-table join or FK-accepting endpoint in this repo needs both the scoped join condition and an ownership check helper (see `tenantOwnsProperty` pattern in clients route).
