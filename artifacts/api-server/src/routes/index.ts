import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import categoriesRouter from "./categories.js";
import productsRouter from "./products.js";
import customersRouter from "./customers.js";
import suppliersRouter from "./suppliers.js";
import salesRouter from "./sales.js";
import purchasesRouter from "./purchases.js";
import expensesRouter from "./expenses.js";
import reportsRouter from "./reports.js";
import settingsRouter from "./settings.js";
import backupRouter from "./backup.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(suppliersRouter);
router.use(salesRouter);
router.use(purchasesRouter);
router.use(expensesRouter);
router.use(reportsRouter);
router.use(settingsRouter);
router.use(backupRouter);

export default router;
