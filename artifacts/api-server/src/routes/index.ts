import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import authRouter from "./auth";
import healthRouter from "./health";
import departmentsRouter from "./departments";
import usersRouter from "./users";
import rolesRouter from "./roles";
import dashboardRouter from "./dashboard";
import documentsRouter from "./documents";
import chatRouter from "./chat";
import importRouter from "./import";
import reportsRouter from "./reports";
import leavesRouter from "./leaves";
import notificationsRouter from "./notifications";
import permissionsRouter from "./permissions";

const router: IRouter = Router();

// Public routes
router.use(authRouter);
router.use(healthRouter);

// Protected routes — require a valid session
router.use(requireAuth);
router.use(departmentsRouter);
router.use(usersRouter);
router.use(rolesRouter);
router.use(dashboardRouter);
router.use(documentsRouter);
router.use(chatRouter);
router.use(importRouter);
router.use(reportsRouter);
router.use(leavesRouter);
router.use(notificationsRouter);
router.use(permissionsRouter);

export default router;
