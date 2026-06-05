---
name: TS project references & composite (monorepo typecheck)
description: Why a leaf artifact's typecheck can fail to run at all, and how that hides real type errors in artifact source.
---

Every `lib/*` package that a leaf artifact references in its `tsconfig.json` `references` must:
1. have `"composite": true` (plus `declarationMap` + `emitDeclarationOnly`) in its own tsconfig, AND
2. be listed in the root `tsconfig.json` `references` so `pnpm run typecheck:libs` (`tsc --build`) actually builds its `dist`.

If a referenced lib is missing `composite`, the leaf typecheck dies immediately with **TS6306** ("not listed within file list of project") before checking any source. If a referenced lib is composite but absent from root references, its dist is never built and the leaf typecheck dies with **TS6305** ("output file has not been built from source file").

**Why this matters:** while a leaf typecheck is blocked by TS6306/TS6305 it checks NONE of the artifact source, so real type errors in that artifact sit hidden and ship uncaught. Fixing the reference config is what surfaces them.

**How to apply:**
- When adding/auditing a lib, confirm both conditions above. All `lib/*` belong in root references (leaf artifacts do NOT).
- Do NOT trust an isolated/throwaway tsconfig that drops `references` to "verify" an artifact — without project references TS resolves lib types differently and emits misleading errors (e.g. it flagged `useDeleteManualPayment` as needing `{clientId,id}` when the real hook is `{id}`; the real failure was a different hook, `useDeleteAgreement`). Fix the reference graph and run the real per-package typecheck instead.
- Orval-generated query hooks require `queryKey` inside the `query` options when you pass any `query` object (e.g. `{ query: { enabled, queryKey: getXxxQueryKey(params) } }`). Generated `createX`/`deleteX` mutations that hang off a nested resource take the parent id as a SEPARATE mutation variable (e.g. createAgreement → `{ clientId, data: AgreementInput }`, deleteAgreement → `{ clientId, id }`), not folded into `data`.
