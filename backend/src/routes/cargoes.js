import { Router } from "express";
import { all, get, run } from "../db.js";

const router = Router();

/* GET /cargoes?search=&page=1&pageSize=10 */
router.get("/", async (request, response, next) => {
  try {
    const { search = "", page = "1", pageSize = "10" } = request.query;
    const limit = Math.max(1, Number(pageSize));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    let where = "";
    const params = [];
    if (search.trim()) {
      where = "WHERE name LIKE ? OR category LIKE ? OR vessel_name LIKE ? OR status LIKE ? OR destination_port LIKE ?";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    const { total } = await get(`SELECT COUNT(*) AS total FROM cargoes ${where}`, params);
    const data = await all(
      `SELECT id, name, category, quantity_tons AS quantityTons, vessel_name AS vesselName, status, destination_port AS destinationPort
       FROM cargoes ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    response.json({ data, total, page: Number(page), pageSize: limit });
  } catch (error) {
    next(error);
  }
});

/* POST /cargoes */
router.post("/", async (request, response, next) => {
  try {
    const { name, category, quantityTons, vesselName, status, destinationPort } = request.body;

    const errors = [];
    if (!name?.trim()) errors.push("货物名称不能为空");
    if (!category) errors.push("货物类别不能为空");
    if (!quantityTons || quantityTons <= 0) errors.push("吨位必须大于 0");
    if (!vesselName?.trim()) errors.push("所属船舶不能为空");
    if (!status) errors.push("状态不能为空");
    if (!destinationPort?.trim()) errors.push("目的港不能为空");
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    /* 校验船舶是否存在 */
    const vessel = await get("SELECT id, capacity_tons FROM vessels WHERE name = ?", [vesselName.trim()]);
    if (!vessel) return response.status(400).json({ message: `船舶「${vesselName}」不存在，请先在船舶管理中注册` });

    /* 校验吨位不超过船舶运力 */
    const { loaded } = await get(
      "SELECT COALESCE(SUM(quantity_tons),0) AS loaded FROM cargoes WHERE vessel_name = ?",
      [vesselName.trim()]
    );
    if (loaded + quantityTons > vessel.capacity_tons) {
      return response.status(400).json({
        message: `超出船舶运力：该船运力 ${vessel.capacity_tons} 吨，已载 ${loaded} 吨，剩余 ${vessel.capacity_tons - loaded} 吨`
      });
    }

    const result = await run(
      `INSERT INTO cargoes (name, category, quantity_tons, vessel_name, status, destination_port) VALUES (?,?,?,?,?,?)`,
      [name.trim(), category, quantityTons, vesselName.trim(), status, destinationPort.trim()]
    );

    response.status(201).json({ id: result.lastID, name: name.trim(), category, quantityTons, vesselName: vesselName.trim(), status, destinationPort: destinationPort.trim() });
  } catch (error) {
    next(error);
  }
});

/* PUT /cargoes/:id */
router.put("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const { name, category, quantityTons, vesselName, status, destinationPort } = request.body;

    const errors = [];
    if (!name?.trim()) errors.push("货物名称不能为空");
    if (!category) errors.push("货物类别不能为空");
    if (!quantityTons || quantityTons <= 0) errors.push("吨位必须大于 0");
    if (!vesselName?.trim()) errors.push("所属船舶不能为空");
    if (!status) errors.push("状态不能为空");
    if (!destinationPort?.trim()) errors.push("目的港不能为空");
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    const cargo = await get("SELECT id FROM cargoes WHERE id = ?", [id]);
    if (!cargo) return response.status(404).json({ message: "货物不存在" });

    const vessel = await get("SELECT id, capacity_tons FROM vessels WHERE name = ?", [vesselName.trim()]);
    if (!vessel) return response.status(400).json({ message: `船舶「${vesselName}」不存在` });

    /* 吨位校验（排除自身） */
    const { loaded } = await get(
      "SELECT COALESCE(SUM(quantity_tons),0) AS loaded FROM cargoes WHERE vessel_name = ? AND id != ?",
      [vesselName.trim(), id]
    );
    if (loaded + quantityTons > vessel.capacity_tons) {
      return response.status(400).json({
        message: `超出船舶运力：该船运力 ${vessel.capacity_tons} 吨，已载 ${loaded} 吨，剩余 ${vessel.capacity_tons - loaded} 吨`
      });
    }

    await run(
      `UPDATE cargoes SET name=?, category=?, quantity_tons=?, vessel_name=?, status=?, destination_port=? WHERE id=?`,
      [name.trim(), category, quantityTons, vesselName.trim(), status, destinationPort.trim(), id]
    );

    response.json({ id: Number(id), name: name.trim(), category, quantityTons, vesselName: vesselName.trim(), status, destinationPort: destinationPort.trim() });
  } catch (error) {
    next(error);
  }
});

/* DELETE /cargoes/:id */
router.delete("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const cargo = await get("SELECT id FROM cargoes WHERE id = ?", [id]);
    if (!cargo) return response.status(404).json({ message: "货物不存在" });

    await run("DELETE FROM cargoes WHERE id = ?", [id]);
    response.json({ message: "删除成功" });
  } catch (error) {
    next(error);
  }
});

export default router;
