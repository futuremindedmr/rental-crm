---
name: Orval react-query hook options
description: Generated useXxx hooks require queryKey in their query options under strict TS
---

The Orval-generated react-query hooks in `@workspace/api-client-react` type their
`query` option as the full `UseQueryOptions`, which makes `queryKey` **required**.

Passing only `{ query: { enabled } }` (or `{ enabled }`) fails typecheck with
TS2741 "Property 'queryKey' is missing".

**Fix:** supply the generated key getter:

```ts
useGetCurrentTenant({
  query: { enabled: isAuthenticated, queryKey: getGetCurrentTenantQueryKey() },
});
```

**Why:** strict TS + @tanstack/react-query v5 require `queryKey` on `UseQueryOptions`;
the generated wrapper would inject it at runtime, but the type still demands it.

**How to apply:** whenever you call a generated `useXxx` with custom query options
(e.g. `enabled`), also pass `queryKey: getXxxQueryKey(...)`. Note some older code in
the repo (e.g. client-detail) omits this and is latently broken — don't copy it.
