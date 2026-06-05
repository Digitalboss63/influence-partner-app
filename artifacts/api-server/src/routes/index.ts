import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import creatorsRouter from "./creators";
import pipelineRouter from "./pipeline";
import outreachRouter from "./outreach";
import targetsRouter from "./targets";
import prospectsRouter from "./prospects";
import youtubeRouter from "./youtube";
import qualificationRouter from "./qualification";
import contactIntelligenceRouter from "./contact-intelligence";
import outreachOperationsRouter from "./outreach-operations";
import performanceRouter from "./performance";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(creatorsRouter);
router.use(pipelineRouter);
router.use(outreachRouter);
router.use(targetsRouter);
router.use(prospectsRouter);
router.use(youtubeRouter);
router.use(qualificationRouter);
router.use(contactIntelligenceRouter);
router.use(outreachOperationsRouter);
router.use(performanceRouter);
router.use(reportsRouter);

export default router;
