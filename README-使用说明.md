# 污泥处理工艺知识库 · 交付包

**当前版本：v2.0.0（2026-10-26）**

## v2.0.0 新增功能

- **公式手册清晰化**：65 条精选公式按公式主体、符号释义、参数范围与依据分区展示。
- **建一座水质净化厂**：第三菜单提供 10 个工艺单元、47 步联动计算；输入设计参数后自动计算，可展开查看公式、代入过程与单位，并跳转对应公式条目。
- **集团 Logo 星河开场**：细密流动粒子汇聚为 Logo 图形，点击「进入魔法世界」进入知识库。
- **主页面环境动效**：稀疏粒子漂移与随机线路，保持背景动态但不妨碍阅读。
- **完整保留最新知识数据**：37 个工艺大类、171 个变种分支，包括 2015 年 AOA 工艺。

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
