---
name: CRM typecheck blocked state
description: Why pnpm --filter @workspace/crm run typecheck fails before checking source, and how to validate source anyway
---

`pnpm --filter @workspace/crm run typecheck` aborts early with TS6306
("Referenced project '.../lib/object-storage-web' must have setting composite: true")
because `artifacts/crm/tsconfig.json` references libs that aren't composite. This
abort happens *before* source files are checked, so it masks latent source type
errors.

**To validate CRM source without that abort**, use a throwaway config that clears
references:

```jsonc
// artifacts/crm/tsconfig.verify.json
{ "extends": "./tsconfig.json", "references": [], "compilerOptions": { "composite": false } }
```

Then `./node_modules/.bin/tsc -p artifacts/crm/tsconfig.verify.json --noEmit` and
delete the temp file. Filter out `object-storage-web`/`replit-auth-web` reference
noise to see real source errors.

**Why:** this is a pre-existing repo state (tsconfigs are committed unmodified), not
something a given task introduced. Don't "fix" the composite reference as a side
quest unless that's the actual task.
