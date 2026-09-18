#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 site/data/processes.json 生成 kb/processes/ 下 37 个大类 md 文件。

用法: python3 build_kb.py
输入: site/data/processes.json（主数据源，37 大类 / 171 变种）
输出: kb/processes/NN-{id}.md（NN 按诞生年排序，01–37 补零）

flow 步骤的 k 值渲染为线型标注: w=〔水〕 s=〔泥〕 r=〔回流〕 m=〔辅助〕
重新生成会覆盖 kb/processes/ 下同名单文件；手工修改请改 JSON 后再跑本脚本。
注意: 网页端还需运行 site/tools/embed_data.py 重新生成 data/processes.js。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "site" / "data" / "processes.json"
OUT_DIR = ROOT / "kb" / "processes"

K_LABEL = {"w": "〔水〕", "s": "〔泥〕", "r": "〔回流〕", "m": "〔辅助〕"}


def render_flow(flow):
    parts = []
    for step in flow:
        label = K_LABEL.get(step.get("k", ""), "")
        parts.append(f"{step['t']}{label}")
    return " → ".join(parts)


def render_variant(v):
    lines = []
    lines.append(f"### 变种: {v['name_zh']} | {v['name_en']}")
    lines.append("")
    lines.append(f"- 年份: {v['year']}")
    lines.append(f"- 差异点: {v['diff']}")
    if v.get("flow"):
        lines.append(f"- 流程: {render_flow(v['flow'])}")
    lines.append(f"- 设计参数: {v['params']}")
    lines.append(f"- 适用: {v['application']}")
    lines.append(f"- 优点: {'；'.join(v['pros'])}")
    lines.append(f"- 缺点: {'；'.join(v['cons'])}")
    lines.append("")
    return "\n".join(lines)


def render_category(idx, c):
    lines = []
    lines.append(f"# {idx:02d}. {c['name_zh']} | {c['name_en']}")
    lines.append("")
    lines.append(f"- 诞生: {c['year_label']}")
    lines.append(f"- 成熟度: {c['maturity']}")
    lines.append(f"- 族/周期: {c['family']} / {c['era']}")
    lines.append(f"- 定位: {c['tagline']}")
    lines.append(f"- 简介: {c['summary']}")
    lines.append("- 来源:")
    for s in c["sources"]:
        lines.append(f"  - {s}")
    lines.append("")
    lines.append(f"共 {len(c['variants'])} 个变种。")
    lines.append("")
    for v in c["variants"]:
        lines.append(render_variant(v))
    return "\n".join(lines).rstrip() + "\n"


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    cats = data["categories"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for idx, c in enumerate(cats, start=1):
        path = OUT_DIR / f"{idx:02d}-{c['id']}.md"
        path.write_text(render_category(idx, c), encoding="utf-8")
        print(f"written {path.name} ({len(c['variants'])} variants)")
    print(f"done: {len(cats)} files")


if __name__ == "__main__":
    main()
