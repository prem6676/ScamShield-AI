import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scamshieldRouter from "./scamshield";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scamshieldRouter);

export default router;
