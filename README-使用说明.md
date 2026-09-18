# 污泥处理工艺知识库 · 交付包

## 目录结构

- `kb/` —— Markdown 知识库（人类可读主档）
  - `README.md` —— 总览、37 大类分类树、交叉审核结论、后续增补记录、存疑清单
  - `processes/01–37-*.md` —— 37 个工艺大类文档（按诞生年排序，含 171 个变种分支）
  - `design_calculation_handbook.md` —— 设计计算公式手册（10 章 104 条，含污泥专题）
- `site/` —— Cyberpunk 2077 风格可视化站点
  - 直接双击 `index.html` 即可离线打开（数据已内嵌为 JS，无需服务器）
  - 或在 `site/` 下运行 `npm run dev`（等价 `node server.js --port 7100`）获得预览服务
  - `data/processes.json` / `formulas.json` —— 机器可读数据源；改动 JSON 后运行 `python3 tools/embed_data.py` 重新生成内嵌 JS
- `尽调底稿-research/` —— 三路尽调原始草稿与来源链接（审核追溯用）
- `build_kb.py` —— 由 processes.json 重新生成 kb/processes/*.md 的脚本

## 数据规模

37 工艺大类 / 171 变种分支 / 104 条设计公式（站点展示精选 65 条）

## 维护工作流

改 `site/data/processes.json` → `python3 tools/embed_data.py`（更新站点）→ `python3 build_kb.py`（更新 Markdown）。
