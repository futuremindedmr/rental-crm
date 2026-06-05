---
name: requireTenant must be awaited
description: requireTenant() is async; forgetting await silently passes a Promise to DB queries, causing 500 errors.
---

## Rule
Always `await requireTenant(req, res)`. Never call it without await.

**Why:** `requireTenant` is declared `async function requireTenant(...): Promise<number | null>`. Without `await`, the variable holds a Promise object (truthy), so the `if (tenantId === null) return;` guard never fires, and Drizzle receives `[object Promise]` as a query parameter, causing a DB error and 500 response.

**How to apply:** Every new route that calls `requireTenant` must use:
```ts
const tenantId = await requireTenant(req, res);
if (tenantId === null) return;
```
TypeScript will flag the missing await as a type error (`Promise<number|null>` not assignable to `number|null`) if strict mode is on — check typecheck output when adding new routes.
