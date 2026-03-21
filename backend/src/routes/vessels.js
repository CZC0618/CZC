import { Router } from "express";
import { all, get, run } from "../db.js";

const router = Router();

/* GET /vessels?search=&page=1&pageSize=10 */
router.get("/", async (request, response, next) => {
  try {
    const { search = "", page = "1", pageSize = "10" } = request.query;
    const limit = Math.max(1, Number(pageSize));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    let where = "";
    const params = [];
    if (search.trim()) {
      where = "WHERE name LIKE ? OR imo LIKE ? OR status LIKE ? OR last_port LIKE ?";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    const { total } = await get(`SELECT COUNT(*) AS total FROM vessels ${where}`, params);
    const data = await all(
      `SELECT id, name, imo, status, capacity_tons AS capacityTons, last_port AS lastPort, eta
       FROM vessels ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    response.json({ data, total, page: Number(page), pageSize: limit });
  } catch (error) {
    next(error);
  }
});

/* POST /vessels */
router.post("/", async (request, response, next) => {
  try {
    const { name, imo, status, capacityTons, lastPort, eta } = request.body;

    const errors = [];
    if (!name?.trim()) errors.push("船舶名称不能为空");
    if (!imo?.trim()) errors.push("IMO 编号不能为空");
    if (!status) errors.push("状态不能为空");
    if (!capacityTons || capacityTons <= 0) errors.push("运力吨位必须大于 0");
    if (!lastPort?.trim()) errors.push("上一港口不能为空");
    if (!eta?.trim()) errors.push("ETA 不能为空");
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    const dup = await get("SELECT id FROM vessels WHERE imo = ?", [imo.trim()]);
    if (dup) return response.status(409).json({ message: `IMO 编号 ${imo} 已存在` });

    const result = await run(
      `INSERT INTO vessels (name, imo, status, capacity_tons, last_port, eta) VALUES (?,?,?,?,?,?)`,
      [name.trim(), imo.trim(), status, capacityTons, lastPort.trim(), eta.trim()]
    );

    response.status(201).json({ id: result.lastID, name: name.trim(), imo: imo.trim(), status, capacityTons, lastPort: lastPort.trim(), eta: eta.trim() });
  } catch (error) {
    next(error);
  }
});

/* PUT /vessels/:id */
router.put("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const { name, imo, status, capacityTons, lastPort, eta } = request.body;

    const errors = [];
    if (!name?.trim()) errors.push("船舶名称不能为空");
    if (!imo?.trim()) errors.push("IMO 编号不能为空");
    if (!status) errors.push("状态不能为空");
    if (!capacityTons || capacityTons <= 0) errors.push("运力吨位必须大于 0");
    if (!lastPort?.trim()) errors.push("上一港口不能为空");
    if (!eta?.trim()) errors.push("ETA 不能为空");
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    const vessel = await get("SELECT id FROM vessels WHERE id = ?", [id]);
    if (!vessel) return response.status(404).json({ message: "船舶不存在" });

    const dup = await get("SELECT id FROM vessels WHERE imo = ? AND id != ?", [imo.trim(), id]);
    if (dup) return response.status(409).json({ message: `IMO 编号 ${imo} 已存在` });

    await run(
      `UPDATE vessels SET name=?, imo=?, status=?, capacity_tons=?, last_port=?, eta=? WHERE id=?`,
      [name.trim(), imo.trim(), status, capacityTons, lastPort.trim(), eta.trim(), id]
    );

    response.json({ id: Number(id), name: name.trim(), imo: imo.trim(), status, capacityTons, lastPort: lastPort.trim(), eta: eta.trim() });
  } catch (error) {
    next(error);
  }
});

/* DELETE /vessels/:id */
router.delete("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const vessel = await get("SELECT id FROM vessels WHERE id = ?", [id]);
    if (!vessel) return response.status(404).json({ message: "船舶不存在" });

    await run("DELETE FROM vessels WHERE id = ?", [id]);
    response.json({ message: "删除成功" });
  } catch (error) {
    next(error);
  }
});

export default router;
