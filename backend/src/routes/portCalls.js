import { Router } from "express";
import { all, get, run } from "../db.js";

const router = Router();

/* GET /port-calls?search=&page=1&pageSize=10 */
router.get("/", async (request, response, next) => {
  try {
    const { search = "", page = "1", pageSize = "10" } = request.query;
    const limit = Math.max(1, Number(pageSize));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    let where = "";
    const params = [];
    if (search.trim()) {
      where = "WHERE vessel_name LIKE ? OR direction LIKE ? OR berth LIKE ? OR cargo_name LIKE ? OR status LIKE ?";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    const { total } = await get(`SELECT COUNT(*) AS total FROM port_calls ${where}`, params);
    const data = await all(
      `SELECT id, vessel_name AS vesselName, direction, berth, cargo_name AS cargoName, scheduled_at AS scheduledAt, status
       FROM port_calls ${where} ORDER BY scheduled_at ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    response.json({ data, total, page: Number(page), pageSize: limit });
  } catch (error) {
    next(error);
  }
});

/* POST /port-calls */
router.post("/", async (request, response, next) => {
  try {
    const { vesselName, direction, berth, cargoName, scheduledAt, status } = request.body;

    const errors = [];
    if (!vesselName?.trim()) errors.push("船舶名称不能为空");
    if (!direction) errors.push("作业方向不能为空");
    if (!berth?.trim()) errors.push("泊位不能为空");
    if (!cargoName?.trim()) errors.push("关联货物不能为空");
    if (!scheduledAt?.trim()) errors.push("计划时间不能为空");
    if (!status) errors.push("状态不能为空");
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    /* 计划时间不能是过去 */
    if (new Date(scheduledAt) < new Date()) {
      return response.status(400).json({ message: "计划时间不能早于当前时间" });
    }

    /* 泊位冲突检测：同一泊位 ±2 小时内不能有其他作业 */
    const conflict = await get(
      `SELECT id, vessel_name FROM port_calls
       WHERE berth = ? AND status NOT IN ('已完成','已取消')
       AND ABS(julianday(scheduled_at) - julianday(?)) < (2.0/24.0)`,
      [berth.trim(), scheduledAt.trim()]
    );
    if (conflict) {
      return response.status(409).json({
        message: `泊位 ${berth} 在该时间段已有作业安排（船舶：${conflict.vessel_name}），请更换泊位或调整时间`
      });
    }

    const result = await run(
      `INSERT INTO port_calls (vessel_name, direction, berth, cargo_name, scheduled_at, status) VALUES (?,?,?,?,?,?)`,
      [vesselName.trim(), direction, berth.trim(), cargoName.trim(), scheduledAt.trim(), status]
    );

    response.status(201).json({ id: result.lastID, vesselName: vesselName.trim(), direction, berth: berth.trim(), cargoName: cargoName.trim(), scheduledAt: scheduledAt.trim(), status });
  } catch (error) {
    next(error);
  }
});

/* PUT /port-calls/:id */
router.put("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const { vesselName, direction, berth, cargoName, scheduledAt, status } = request.body;

    const errors = [];
    if (!vesselName?.trim()) errors.push("船舶名称不能为空");
    if (!direction) errors.push("作业方向不能为空");
    if (!berth?.trim()) errors.push("泊位不能为空");
    if (!cargoName?.trim()) errors.push("关联货物不能为空");
    if (!scheduledAt?.trim()) errors.push("计划时间不能为空");
    if (!status) errors.push("状态不能为空");
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    const portCall = await get("SELECT id FROM port_calls WHERE id = ?", [id]);
    if (!portCall) return response.status(404).json({ message: "作业单不存在" });

    /* 泊位冲突检测（排除自身） */
    const conflict = await get(
      `SELECT id, vessel_name FROM port_calls
       WHERE berth = ? AND id != ? AND status NOT IN ('已完成','已取消')
       AND ABS(julianday(scheduled_at) - julianday(?)) < (2.0/24.0)`,
      [berth.trim(), id, scheduledAt.trim()]
    );
    if (conflict) {
      return response.status(409).json({
        message: `泊位 ${berth} 在该时间段已有作业安排（船舶：${conflict.vessel_name}），请更换泊位或调整时间`
      });
    }

    await run(
      `UPDATE port_calls SET vessel_name=?, direction=?, berth=?, cargo_name=?, scheduled_at=?, status=? WHERE id=?`,
      [vesselName.trim(), direction, berth.trim(), cargoName.trim(), scheduledAt.trim(), status, id]
    );

    response.json({ id: Number(id), vesselName: vesselName.trim(), direction, berth: berth.trim(), cargoName: cargoName.trim(), scheduledAt: scheduledAt.trim(), status });
  } catch (error) {
    next(error);
  }
});

/* DELETE /port-calls/:id */
router.delete("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const portCall = await get("SELECT id FROM port_calls WHERE id = ?", [id]);
    if (!portCall) return response.status(404).json({ message: "作业单不存在" });

    await run("DELETE FROM port_calls WHERE id = ?", [id]);
    response.json({ message: "删除成功" });
  } catch (error) {
    next(error);
  }
});

export default router;
