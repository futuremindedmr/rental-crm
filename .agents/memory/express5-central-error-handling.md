---
name: Express 5 centralized error handling + React route error boundary
description: Why this API uses one error-middleware instead of per-handler try/catch, and where the frontend render-crash safety net lives.
---

**API:** This server runs Express 5 (`^5.2.x`). Express 5 automatically forwards rejections thrown from `async` route handlers to error-handling middleware — you do NOT need to wrap every handler in try/catch. The app registers, in order at the end of `app.ts`: the router, a JSON `notFoundHandler` on `/api`, then a 4-arg `errorHandler`. This single middleware turns any unhandled route error into a clean JSON 500 and logs via `req.log`.

**Why:** wrapping 50+ handlers in try/catch is noisy and easy to forget; the centralized handler covers all current and future routes uniformly.

**How to apply:**
- New routes need no try/catch for incidental failures — just `throw`/let DB rejections propagate and the central handler responds 500. Use explicit `res.status(4xx)` returns only for expected validation/auth/not-found cases (the routes already do this via zod `safeParse` + 404 checks).
- Keep `notFoundHandler` and `errorHandler` LAST in `app.ts`; order matters.
- Health route is `/api/healthz` (not `/health`).

**Frontend:** `artifacts/crm/src/App.tsx` wraps all routed pages in `<ErrorBoundary resetKey={location}>` (class component in `components/error-boundary.tsx`). It catches render-time crashes so one bad record shows a recoverable fallback instead of blanking the app. The `resetKey={location}` (wouter) clears the error on navigation so the fallback isn't sticky. Pair this with the safe helpers in `lib/utils.ts` (`safeFormatDate`, `toDateInputValue`, `safeToFixed`) for render-path values that may be null/corrupted — especially decimal columns (e.g. `monthlyRate`) which can arrive as strings where `.toFixed` would throw.
