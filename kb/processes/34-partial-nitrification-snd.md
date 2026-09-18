# 34. 短程硝化与同步硝化反硝化 | Partial Nitrification & Simultaneous Nitrification-Denitrification

- 诞生: 1997–1998（TU Delft，SHARON 专利 WO9807664 于 1997 申请）
- 成熟度: 成熟主流
- 族/周期: 悬浮生长生物 / 1990s
- 定位: 把硝化停在亚硝态氮，省曝气省碳源的短程脱氮路线
- 简介: 短程硝化（亚硝化）将 NH₄⁺ 只氧化到 NO₂⁻ 即反硝化，相比全程硝化反硝化省曝气约 25%、省碳源约 40%。SHARON 工艺开创了以高温、短泥龄选择性淘洗 NOB 的路线，并与 Anammox 耦合成为侧流脱氮主流；SND 则利用絮体/颗粒内氧梯度在单池同步完成硝化反硝化。注意：SND 作为现象观察早于本大类诞生年（约 1980s–90s），此处大类年份以工艺化（SHARON）为准。
- 来源:
  - repository.tudelft.nl（SHARON/Anammox 论文库）
  - digibug.ugr.es（短程脱氮综述）
  - edie.net（SHARON 工程报道）

共 4 个变种。

### 变种: SHARON | Single reactor High activity Ammonia Removal Over Nitrite

- 年份: 1998
- 差异点: 高温（30–35 °C）、短泥龄（1–1.5 d）淘洗 NOB，单池无污泥停留
- 流程: 污泥消化液〔水〕 → SHARON 反应器（间歇曝气）〔水〕 → 出水（NO₂⁻ 回流反硝化）〔回流〕
- 设计参数: 30–35 °C; SRT 1–1.5 d; pH 7–8
- 适用: 高温高氨氮侧流（首座 Dokhaven 1998）
- 优点: 曝气省 25%；碳源省 40%；结构简单无沉淀
- 缺点: 仅适合高温侧流；需外加碱度

### 变种: 部分亚硝化 | Partial Nitritation

- 年份: 约2001
- 差异点: van Dongen 等将 SHARON 概念扩展为半亚硝化（约一半 NH₄⁺→NO₂⁻），直接为下游 Anammox 配比基质
- 流程: 高氨氮进水〔水〕 → 部分亚硝化池〔水〕 → （接 Anammox）〔水〕
- 设计参数: 出水 NH₄⁺:NO₂⁻ ≈ 1:1.32
- 适用: Anammox 前置单元
- 优点: 与 Anammox 精准耦合；无需严格淘洗 NOB
- 缺点: 比例控制要求高

### 变种: 同步硝化反硝化 | Simultaneous Nitrification-Denitrification (SND)

- 年份: 约1980s–1990s
- 差异点: 利用絮体/生物膜内溶解氧梯度，同一曝气池内硝化与反硝化同步发生；低 DO、大絮体是关键
- 流程: 进水〔水〕 → 低 DO 曝气池〔水〕 → 二沉池〔水〕 → 出水〔水〕
- 设计参数: DO 0.5–1.5 mg/L; 絮体粒径 >100 μm 利于内缺氧区
- 适用: 氧化沟、SBR、MBBR 等低 DO 运行工况
- 优点: 无需单独缺氧池；碱度自平衡部分回收
- 缺点: 脱氮率不稳定；DO 窗口窄；机理依赖絮体结构

### 变种: 部分反硝化 | Partial Denitrification (NO₃⁻→NO₂⁻)

- 年份: 约2010s中
- 差异点: 控制碳源与电子供体使反硝化止于 NO₂⁻，为 Anammox 供基质；中国哈工大/北工大团队推动工程化
- 流程: 含 NO₃⁻ 出水〔水〕 → 部分反硝化池（限碳）〔水〕 → （接 Anammox）〔水〕
- 设计参数: C/N 控制在 2–3; NO₂⁻ 积累率 >70%
- 适用: 主流/侧流 Anammox 供亚硝
- 优点: 绕开 NOB 抑制；可利用内碳源
- 缺点: 碳源投加精度要求高；NO₂⁻ 积累窗口窄
