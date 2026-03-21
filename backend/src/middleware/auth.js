import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "petro-port-ops-secret-2026";

/**
 * 验证 JWT token，将 user { id, username, role } 挂到 request.user
 */
export function authenticate(request, response, next) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return response.status(401).json({ message: "请先登录" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    request.user = payload;
    next();
  } catch {
    return response.status(401).json({ message: "登录已过期，请重新登录" });
  }
}

/**
 * 生成角色守卫中间件：只允许指定角色的写操作（POST/PUT/DELETE）
 * GET 请求对所有已登录用户放行（只读可查看）
 */
export function requireRole(...roles) {
  return (request, response, next) => {
    // GET 请求：所有已登录用户都可查看
    if (request.method === "GET") return next();
    // 写操作：检查角色
    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ message: "您没有权限执行此操作" });
    }
    next();
  };
}

export { JWT_SECRET };
