import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import creatorsRouter from "./creators";
import pipelineRouter from "./pipeline";
import outreachRouter from "./outreach";
import targetsRouter from "./targets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(creatorsRouter);
router.use(pipelineRouter);
router.use(outreachRouter);
router.use(targetsRouter);

export default router;
