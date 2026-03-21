import { Router } from "express";
import { all, get } from "../db.js";

const router = Router();

router.get("/", async (_request, response, next) => {
  try {
    const vesselStats = await get("SELECT COUNT(*) AS totalVessels FROM vessels");
    const cargoStats = await get("SELECT COUNT(*) AS totalCargoes FROM cargoes");
    const inPortStats = await get("SELECT COUNT(*) AS inPortVessels FROM vessels WHERE status IN ('在港','装卸中','靠泊中')");
    const pendingPortCalls = await get(
      "SELECT COUNT(*) AS totalPortCalls FROM port_calls WHERE status IN ('已排期', '作业中', '待放行')"
    );
    const delayedCount = await get(
      "SELECT COUNT(*) AS delayed FROM port_calls WHERE status IN ('已排期','作业中') AND scheduled_at < datetime('now','-2 hours')"
    );
    const categoryBreakdown = await all(
      "SELECT category, COUNT(*) AS count, SUM(quantity_tons) AS totalTons FROM cargoes GROUP BY category"
    );
    const recentPortCalls = await all(`
      SELECT vessel_name AS vesselName, direction, berth, cargo_name AS cargoName, scheduled_at AS scheduledAt, status
      FROM port_calls
      ORDER BY scheduled_at ASC
      LIMIT 5
    `);

    response.json({
      stats: {
        totalVessels: vesselStats.totalVessels,
        totalCargoes: cargoStats.totalCargoes,
        inPortVessels: inPortStats.inPortVessels,
        totalPortCalls: pendingPortCalls.totalPortCalls,
        delayedPortCalls: delayedCount.delayed
      },
      categoryBreakdown,
      recentPortCalls
    });
  } catch (error) {
    next(error);
  }
});

export default router;
