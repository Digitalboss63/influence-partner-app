import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import creatorsRouter from "./creators";
import pipelineRouter from "./pipeline";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/products", productsRouter);
router.use("/creators", creatorsRouter);
router.use("/pipeline", pipelineRouter);

export default router;
