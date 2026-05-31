import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tenantsRouter from "./tenants";
import storageRouter from "./storage";
import clientsRouter from "./clients";
import leadsRouter from "./leads";
import rentalsRouter from "./rentals";
import agreementsRouter from "./agreements";
import squareRouter from "./square";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tenantsRouter);
router.use(storageRouter);
router.use(clientsRouter);
router.use(leadsRouter);
router.use(rentalsRouter);
router.use(agreementsRouter);
router.use(squareRouter);
router.use(dashboardRouter);

export default router;
