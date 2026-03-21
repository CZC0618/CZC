import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { all, get, run } from "../db.js";
import { authenticate, JWT_SECRET, requireRole } from "../middleware/auth.js";

const router = Router();

/* POST /auth/login */
router.post("/login", async (request, response, next) => {
  try {
    const { username, password } = request.body;
    if (!username?.trim() || !password) {
      return response.status(400).json({ message: "用户名和密码不能为空" });
    }
    const user = await get("SELECT * FROM users WHERE username = ?", [username.trim()]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return response.status(401).json({ message: "用户名或密码错误" });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    response.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

/* POST /auth/users — 添加用户（仅超级管理员） */
router.post("/users", authenticate, requireRole("super_admin"), async (request, response, next) => {
  try {
    const { username, password, role = "port_admin" } = request.body;
    if (!username?.trim()) return response.status(400).json({ message: "用户名不能为空" });
    if (!password || password.length < 6) return response.status(400).json({ message: "密码长度至少 6 位" });
    const validRoles = ["super_admin", "port_admin", "finance_admin"];
    if (!validRoles.includes(role)) return response.status(400).json({ message: "无效的角色" });

    const exists = await get("SELECT id FROM users WHERE username = ?", [username.trim()]);
    if (exists) return response.status(400).json({ message: "用户名已存在" });

    const hash = bcrypt.hashSync(password, 10);
    const result = await run(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username.trim(), hash, role]
    );
    response.status(201).json({ id: result.lastID, username: username.trim(), role });
  } catch (error) {
    next(error);
  }
});

/* GET /auth/me — 获取当前用户信息 */
router.get("/me", authenticate, (request, response) => {
  response.json(request.user);
});

/* ========== 用户管理（仅超级管理员） ========== */

/* GET /auth/users — 获取所有用户 */
router.get("/users", authenticate, requireRole("super_admin"), async (request, response, next) => {
  try {
    const users = await all("SELECT id, username, role, created_at AS createdAt FROM users ORDER BY id ASC");
    response.json(users);
  } catch (error) {
    next(error);
  }
});

/* PUT /auth/users/:id — 修改用户角色 */
router.put("/users/:id", authenticate, requireRole("super_admin"), async (request, response, next) => {
  try {
    const { id } = request.params;
    const { role, password } = request.body;
    const user = await get("SELECT id FROM users WHERE id = ?", [id]);
    if (!user) return response.status(404).json({ message: "用户不存在" });

    const validRoles = ["super_admin", "port_admin", "finance_admin"];
    if (role && !validRoles.includes(role)) return response.status(400).json({ message: "无效的角色" });

    if (role) {
      await run("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    }
    if (password) {
      if (password.length < 6) return response.status(400).json({ message: "密码长度至少 6 位" });
      const hash = bcrypt.hashSync(password, 10);
      await run("UPDATE users SET password = ? WHERE id = ?", [hash, id]);
    }
    const updated = await get("SELECT id, username, role, created_at AS createdAt FROM users WHERE id = ?", [id]);
    response.json(updated);
  } catch (error) {
    next(error);
  }
});

/* DELETE /auth/users/:id — 删除用户 */
router.delete("/users/:id", authenticate, requireRole("super_admin"), async (request, response, next) => {
  try {
    const { id } = request.params;
    if (Number(id) === request.user.id) {
      return response.status(400).json({ message: "不能删除自己的账户" });
    }
    const user = await get("SELECT id FROM users WHERE id = ?", [id]);
    if (!user) return response.status(404).json({ message: "用户不存在" });
    await run("DELETE FROM users WHERE id = ?", [id]);
    response.json({ message: "删除成功" });
  } catch (error) {
    next(error);
  }
});

export default router;
