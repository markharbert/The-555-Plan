import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accountRouter from "./account";
import journeyRouter from "./journey";
import { requireIdentity } from "../middlewares/member";
import { getProgram } from "../lib/journey";
import { GetContentResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.use(healthRouter);
router.get("/content", async (_req, res): Promise<void> => {
  res.json(GetContentResponse.parse(await getProgram()));
});
router.use(requireIdentity);
router.use(accountRouter);
router.use(journeyRouter);

export default router;
