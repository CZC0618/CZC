import cors from "cors";
import express from "express";
import { initDatabase } from "./db.js";
import { authenticate, requireRole } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";
import cargoesRouter from "./routes/cargoes.js";
import dashboardRouter from "./routes/dashboard.js";
import portCallsRouter from "./routes/portCalls.js";
import receiptsRouter from "./routes/receipts.js";
import vesselsRouter from "./routes/vessels.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

/* 公开路由：认证 */
app.use("/api/auth", authRouter);

/* 以下路由需要登录 */
app.use("/api/dashboard", authenticate, dashboardRouter);
app.use("/api/vessels", authenticate, requireRole("super_admin", "port_admin"), vesselsRouter);
app.use("/api/cargoes", authenticate, requireRole("super_admin", "port_admin"), cargoesRouter);
app.use("/api/port-calls", authenticate, requireRole("super_admin", "port_admin"), portCallsRouter);
app.use("/api/receipts", authenticate, requireRole("super_admin", "finance_admin"), receiptsRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    message: "服务器发生错误，请检查输入或稍后重试。"
  });
});

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend server is running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
