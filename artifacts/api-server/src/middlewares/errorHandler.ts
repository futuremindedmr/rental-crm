import { type Request, type Response, type NextFunction } from "express";

/**
 * Catches requests that did not match any route and returns a clean JSON 404
 * instead of Express's default HTML response.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

/**
 * Centralized error-handling middleware. In Express 5, rejections thrown from
 * async route handlers are forwarded here automatically, so every handler is
 * protected without needing its own try/catch. Logs the error and returns a
 * clean, non-leaky JSON response.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  req.log?.error({ err }, "Unhandled request error");

  res.status(500).json({ error: "Internal server error" });
}
