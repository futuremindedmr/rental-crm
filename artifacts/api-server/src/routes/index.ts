import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contactsRouter from "./contacts";
import companiesRouter from "./companies";
import dealsRouter from "./deals";
import activitiesRouter from "./activities";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contactsRouter);
router.use(companiesRouter);
router.use(dealsRouter);
router.use(activitiesRouter);
router.use(dashboardRouter);

export default router;
