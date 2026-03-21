import { Router } from "express";
import { all, get, run } from "../db.js";

const router = Router();

/**
 * 一致性校验：将回执货量与货物记录总量、进出港作业量进行比对，
 * 同时检查目的港和始发地是否匹配。
 */
async function checkConsistency(vesselName, quantityTons, origin, destination) {
  const warnings = [];

  /* 1. 该船舶下所有货物的总吨数 */
  const cargoSum = await get(
    "SELECT COALESCE(SUM(quantity_tons), 0) AS totalTons FROM cargoes WHERE vessel_name = ?",
    [vesselName]
  );
  if (cargoSum.totalTons === 0) {
    warnings.push(`船舶「${vesselName}」在货物管理中没有任何货物记录`);
  } else if (Math.abs(cargoSum.totalTons - quantityTons) > 0.01) {
    warnings.push(
      `回执货量 ${quantityTons} 吨与货物记录总量 ${cargoSum.totalTons} 吨不一致`
    );
  }

  /* 2. 进出港作业量比对：汇总该船舶进出港作业所关联货物的吨数 */
  const portCargoRows = await all(
    `SELECT DISTINCT c.name, c.quantity_tons
       FROM port_calls pc
       JOIN cargoes c ON c.name = pc.cargo_name AND c.vessel_name = pc.vessel_name
      WHERE pc.vessel_name = ?`,
    [vesselName]
  );
  if (portCargoRows.length > 0) {
    const portThroughput = portCargoRows.reduce((s, r) => s + r.quantity_tons, 0);
    if (Math.abs(portThroughput - quantityTons) > 0.01) {
      warnings.push(
        `回执货量 ${quantityTons} 吨与进出港作业量 ${portThroughput} 吨不一致`
      );
    }
  } else {
    warnings.push(`船舶「${vesselName}」暂无进出港作业记录，无法核验进出港量`);
  }

  /* 3. 目的港是否匹配货物的 destination_port */
  const destMatch = await get(
    "SELECT COUNT(*) AS cnt FROM cargoes WHERE vessel_name = ? AND destination_port = ?",
    [vesselName, destination]
  );
  if (destMatch.cnt === 0 && cargoSum.totalTons > 0) {
    warnings.push(`回执目的地「${destination}」与该船舶货物记录的目的港不一致`);
  }

  /* 4. 始发地是否匹配船舶的上一港口 */
  const vessel = await get("SELECT last_port FROM vessels WHERE name = ?", [vesselName]);
  if (vessel && vessel.last_port !== origin) {
    warnings.push(`回执始发地「${origin}」与船舶上一港口「${vessel.last_port}」不一致`);
  }

  return { consistent: warnings.length === 0, warnings };
}

function validateBody(body) {
  const { orderNo, quantityTons, amount, origin, destination, vesselName, tradeStatus } = body;
  const errors = [];
  if (!orderNo?.trim()) errors.push("订单号不能为空");
  if (!quantityTons || quantityTons <= 0) errors.push("货量必须大于 0");
  if (!amount || amount <= 0) errors.push("交易金额必须大于 0");
  if (!origin?.trim()) errors.push("始发地不能为空");
  if (!destination?.trim()) errors.push("目的地不能为空");
  if (!vesselName?.trim()) errors.push("船舶名称不能为空");
  if (!tradeStatus) errors.push("交易状态不能为空");
  return errors;
}

/* GET /receipts?search=&page=1&pageSize=10 */
router.get("/", async (request, response, next) => {
  try {
    const { search = "", page = "1", pageSize = "10" } = request.query;
    const limit = Math.max(1, Number(pageSize));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    let where = "";
    const params = [];
    if (search.trim()) {
      where = "WHERE order_no LIKE ? OR vessel_name LIKE ? OR origin LIKE ? OR destination LIKE ? OR trade_status LIKE ?";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    const { total } = await get(`SELECT COUNT(*) AS total FROM receipts ${where}`, params);
    const data = await all(
      `SELECT id, order_no AS orderNo, quantity_tons AS quantityTons, amount, origin, destination, vessel_name AS vesselName, trade_status AS tradeStatus, created_at AS createdAt
       FROM receipts ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    response.json({ data, total, page: Number(page), pageSize: limit });
  } catch (error) {
    next(error);
  }
});

/* POST /receipts */
router.post("/", async (request, response, next) => {
  try {
    const { orderNo, quantityTons, amount, origin, destination, vesselName, tradeStatus = "待确认", forceSubmit } = request.body;

    const errors = validateBody(request.body);
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    /* 订单号唯一性检查 */
    const dup = await get("SELECT id FROM receipts WHERE order_no = ?", [orderNo.trim()]);
    if (dup) return response.status(400).json({ message: `订单号「${orderNo.trim()}」已存在` });

    const vessel = await get("SELECT id FROM vessels WHERE name = ?", [vesselName.trim()]);
    if (!vessel) return response.status(400).json({ message: `船舶「${vesselName}」不存在，请先在船舶管理中注册` });

    /* 每次提交都校验一致性（除非 forceSubmit） */
    if (!forceSubmit) {
      const { consistent, warnings } = await checkConsistency(vesselName.trim(), quantityTons, origin.trim(), destination.trim());
      if (!consistent) {
        return response.status(422).json({ type: "consistency_warning", warnings });
      }
    }

    const result = await run(
      `INSERT INTO receipts (order_no, quantity_tons, amount, origin, destination, vessel_name, trade_status) VALUES (?,?,?,?,?,?,?)`,
      [orderNo.trim(), quantityTons, amount, origin.trim(), destination.trim(), vesselName.trim(), tradeStatus]
    );

    const created = await get(
      "SELECT id, order_no AS orderNo, quantity_tons AS quantityTons, amount, origin, destination, vessel_name AS vesselName, trade_status AS tradeStatus, created_at AS createdAt FROM receipts WHERE id = ?",
      [result.lastID]
    );
    response.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

/* PUT /receipts/:id */
router.put("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const { orderNo, quantityTons, amount, origin, destination, vesselName, tradeStatus = "待确认", forceSubmit } = request.body;

    const errors = validateBody(request.body);
    if (errors.length) return response.status(400).json({ message: errors.join("；") });

    const receipt = await get("SELECT id FROM receipts WHERE id = ?", [id]);
    if (!receipt) return response.status(404).json({ message: "回执不存在" });

    /* 订单号唯一性（排除当前记录） */
    const dup = await get("SELECT id FROM receipts WHERE order_no = ? AND id != ?", [orderNo.trim(), id]);
    if (dup) return response.status(400).json({ message: `订单号「${orderNo.trim()}」已被其他回执使用` });

    const vessel = await get("SELECT id FROM vessels WHERE name = ?", [vesselName.trim()]);
    if (!vessel) return response.status(400).json({ message: `船舶「${vesselName}」不存在` });

    /* 每次提交都校验一致性（除非 forceSubmit） */
    if (!forceSubmit) {
      const { consistent, warnings } = await checkConsistency(vesselName.trim(), quantityTons, origin.trim(), destination.trim());
      if (!consistent) {
        return response.status(422).json({ type: "consistency_warning", warnings });
      }
    }

    await run(
      `UPDATE receipts SET order_no=?, quantity_tons=?, amount=?, origin=?, destination=?, vessel_name=?, trade_status=? WHERE id=?`,
      [orderNo.trim(), quantityTons, amount, origin.trim(), destination.trim(), vesselName.trim(), tradeStatus, id]
    );

    response.json({ id: Number(id), orderNo: orderNo.trim(), quantityTons, amount, origin: origin.trim(), destination: destination.trim(), vesselName: vesselName.trim(), tradeStatus });
  } catch (error) {
    next(error);
  }
});

/* DELETE /receipts/:id */
router.delete("/:id", async (request, response, next) => {
  try {
    const { id } = request.params;
    const receipt = await get("SELECT id FROM receipts WHERE id = ?", [id]);
    if (!receipt) return response.status(404).json({ message: "回执不存在" });

    await run("DELETE FROM receipts WHERE id = ?", [id]);
    response.json({ message: "删除成功" });
  } catch (error) {
    next(error);
  }
});

export default router;
