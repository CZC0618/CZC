# 石油公司进出港管理系统

这是一个简易的进出港管理系统框架，面向石油公司港口业务场景，核心用于管理货轮、货物以及进港/出港作业单。

## 技术栈

- 前端：Vue 3 + Vite + Vue Router
- 后端：Node.js + Express
- 数据库：SQLite

## 当前模块

- 概览看板：统计船舶、货物、今日进出港作业数量
- 船舶管理：查看船舶基础信息与靠港状态
- 货物管理：查看货物种类、吨位、目的港与状态
- 进出港管理：查看靠泊位置、作业方向、计划时间与状态

## 目录结构

```text
demo
├─ backend
│  ├─ data
│  ├─ src
│  │  ├─ routes
│  │  ├─ db.js
│  │  └─ server.js
├─ frontend
│  ├─ src
│  │  ├─ api
│  │  ├─ components
│  │  ├─ router
│  │  └─ views
└─ package.json
```

## 启动方式

先分别安装依赖：

```bash
npm run install:all
```

启动后端：

```bash
npm run dev:backend
```

启动前端：

```bash
npm run dev:frontend
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

## 后续可扩展方向

- 增加登录鉴权与角色权限
- 增加船期审批、泊位排班、装卸作业流程
- 增加报表导出与告警提醒
- 对接企业内部 ERP / 物流系统
