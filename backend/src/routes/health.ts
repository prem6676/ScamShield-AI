import { Router, type IRouter, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { checkPersistence, isDatabaseConfigured } from "../services/scamshield-storage";
import { isAiConfigured } from "../services/scamshield-analysis";

const router: IRouter = Router();

const sendHealth = async (req: Request, res: Response): Promise<void> => {
  const persistenceAvailable = await checkPersistence();
  if (isDatabaseConfigured() && !persistenceAvailable) {
    req.log.warn("Supabase is configured but its scans table is not reachable");
  }
  const data = HealthCheckResponse.parse({
    status: "ok",
    databaseConfigured: isDatabaseConfigured(),
    persistenceAvailable,
    aiConfigured: isAiConfigured(),
  });
  res.json(data);
};

router.get("/health", sendHealth);
router.get("/healthz", sendHealth);

export default router;
