import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tenantsRouter from "./tenants";
import storageRouter from "./storage";
import clientsRouter from "./clients";
import propertiesRouter from "./properties";
import leadsRouter from "./leads";
import rentalsRouter from "./rentals";
import agreementsRouter from "./agreements";
import squareRouter from "./square";
import dashboardRouter from "./dashboard";
import manualPaymentsRouter from "./manual_payments";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(tenantsRouter);
router.use(storageRouter);
router.use(clientsRouter);
router.use(propertiesRouter);
router.use(leadsRouter);
router.use(rentalsRouter);
router.use(agreementsRouter);
router.use(squareRouter);
router.use(dashboardRouter);
router.use(manualPaymentsRouter);

export default router;
