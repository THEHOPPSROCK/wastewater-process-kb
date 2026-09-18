# 33. 厌氧氨氧化（Anammox） | Anaerobic Ammonium Oxidation

- 诞生: 1995（Mulder 等发表现象与机理）/ 2002 首座工程（鹿特丹 Dokhaven，Paques + TU Delft + STOWA）
- 成熟度: 商业化初期
- 族/周期: 厌氧生物 / 1990s
- 定位: 亚硝酸盐为电子受体直接把氨氮氧化成氮气，革新脱氮路径
- 简介: 厌氧氨氧化菌（Planctomycetes 门）在缺氧条件下以 NO₂⁻ 为电子受体将 NH₄⁺ 直接转化为 N₂，无需有机碳源、曝气量省约 60%、污泥产量极低。已在高氨氮侧流（污泥消化液、垃圾渗滤液）实现商业化（DEMON、ANITA Mox 等），主流污水（mainstream PNA/PDA）处于示范与早期全规模阶段。
- 来源:
  - Ovivo 白皮书《Deammonification》（ovivowater.com）
  - sohu.com 厌氧氨氧化工艺综述
  - PMC10126410（Anammox 工程化综述）

共 10 个变种。

### 变种: 两段式亚硝化-Anammox | Two-stage Nitritation-Anammox

- 年份: 2002
- 差异点: 亚硝化（SHARON 式）与 Anammox 分置两池，各自单独控制
- 流程: 污泥消化液〔水〕 → 亚硝化池（半亚硝化）〔水〕 → Anammox 反应器〔水〕 → 出水〔水〕
- 设计参数: 进水 NH₄⁺-N 500–2000 mg/L; TN 去除 80–90%; 无需碳源
- 适用: 污泥消化液、垃圾渗滤液等高氨氮侧流
- 优点: 两池各自最优控制；运行稳定；首座工程验证路线（Dokhaven 2002）
- 缺点: 两座反应器占地大；NOB 抑制依赖高温/短泥龄；仅适合高温高氨侧流

### 变种: 一段式 Anammox（单池） | One-stage Anammox

- 年份: 2006
- 差异点: AOB 与 Anammox 菌共存同一反应器（颗粒/生物膜），限氧运行
- 流程: 高氨氮进水〔水〕 → 单池限氧反应器〔水〕 → 沉淀/分离〔水〕 → 出水〔水〕
- 设计参数: DO 0.2–0.5 mg/L; 总氮负荷 0.5–2 kgN/(m³·d)
- 适用: 侧流消化液（首座 Olburgen 2006，Paques）
- 优点: 单池占地省；NO₂⁻ 就地利用抑制 NOB；能耗低
- 缺点: 菌种共培启动慢（数月）；曝气控制精度要求高

### 变种: DEMON | DEMON (DEamMONification)

- 年份: 2004
- 差异点: Wett 在 Strass 厂开发的 SBR 式一段工艺，pH 在线控制间歇曝气
- 流程: 消化液〔水〕 → DEMON SBR（间歇曝气）〔水〕 → 出水〔水〕
- 设计参数: NH₄⁺-N 去除 >90%; pH 控制曝气启停
- 适用: 污泥消化液侧流脱氮，全球装机量最大的 Anammox 商用品牌之一
- 优点: 自动化程度高；SBR 灵活适配水量波动
- 缺点: 间歇运行需调节池；依赖专有控制系统

### 变种: ANITA Mox | ANITA Mox

- 年份: 2010
- 差异点: MBBR 载体富集 Anammox 菌的一段式工艺（Veolia/Krüger）
- 流程: 消化液〔水〕 → ANITA Mox MBBR〔水〕 → 出水〔水〕
- 设计参数: 载体富集 Anammox 生物膜; TN 去除 80–90%
- 适用: 侧流消化液（首座 Sjölunda, Malmö 2010）
- 优点: 生物膜持留慢生长菌；抗冲击负荷
- 缺点: 载体成本高；需专有填料

### 变种: CANON | Completely Autotrophic Nitrogen removal Over Nitrite

- 年份: 2001–2002
- 差异点: TU Delft 提出的单池全自养脱氮概念，颗粒污泥内层 Anammox、外层 AOB
- 流程: 高氨氮进水〔水〕 → CANON 颗粒污泥反应器〔水〕 → 出水〔水〕
- 设计参数: 限氧; 颗粒粒径决定氧梯度分层
- 适用: 概念工艺，催生一段式商用路线
- 优点: 理论框架完整；为颗粒污泥路线奠基
- 缺点: 实验室概念为主；直接工程化少

### 变种: OLAND | Oxygen-Limited Autotrophic Nitrification-Denitrification

- 年份: 1998
- 差异点: 根特大学开发的限氧自养硝化反硝化，低 DO 单池
- 流程: 高氨氮进水〔水〕 → OLAND 限氧反应器〔水〕 → 出水〔水〕
- 设计参数: DO <0.2 mg/L
- 适用: 早期自养脱氮探索
- 优点: 证明低 DO 选择性富集路线可行
- 缺点: 脱氮速率低；后被颗粒/生物膜路线取代

### 变种: Cleargreen 等专有品牌 | Cleargreen Deammonification & Proprietary Brands

- 年份: 约2000s–2010s
- 差异点: 各厂商在 DEMON/ANITA Mox 之外推出的专有侧流/主流方案（含 TERRA 等，年份与装机数据公开资料少）
- 流程: 高氨氮进水〔水〕 → 专有反应器〔水〕 → 出水〔水〕
- 设计参数: 依厂商而定
- 适用: 侧流消化液脱氮
- 优点: 品牌工程经验丰富
- 缺点: 公开数据有限；技术路线细节不透明

### 变种: 主流亚硝化-Anammox（PNA） | Mainstream Partial Nitritation-Anammox

- 年份: 约2011–2017
- 差异点: 将 Anammox 引入主流线：低氨氮、低温、低基质下维持 AOB/Anammox 优势，抑制 NOB
- 流程: 碳捕获得出水（低 C/N）〔水〕 → 主流 PNA 反应器〔水〕 → 二沉池〔水〕 → 出水〔水〕
- 设计参数: 进水 NH₄⁺-N 20–50 mg/L; 10–15 °C 仍可运行（示范）
- 适用: 约2011 Strass 主流示范; 2015–17 新加坡樟宜再生水厂全规模
- 优点: 曝气能耗降 60%；无需碳源；与 AB 碳捕获衔接实现能源中和
- 缺点: NOB 抑制是最大难点；低温启动慢；全球全规模案例仍少

### 变种: 主流部分反硝化-Anammox（PDA） | Mainstream Partial Denitrification-Anammox

- 年份: 约2015–2018
- 差异点: 以部分反硝化（NO₃⁻→NO₂⁻）为 Anammox 供亚硝，绕开 NOB 抑制难题；中国团队（哈工大/北工大等）推动
- 流程: 硝化出水（NO₃⁻）〔水〕 → 部分反硝化池〔水〕 → Anammox 反应器〔水〕 → 出水〔水〕
- 设计参数: NO₃⁻→NO₂⁻ 转化率 60–80%; 碳源投加量比全程反硝化省 50%
- 适用: 主流污水深度脱氮示范
- 优点: 避开 NOB 竞争问题；可利用内碳源；碳源需求低于传统反硝化
- 缺点: 仍在示范阶段；多单元耦合控制复杂

### 变种: NAIN（术语未标准化） | NAIN (Nitritation-Anammox Integration, tentative term)

- 年份: 约2010s末–2020s
- 差异点: 草稿收录的新兴集成术语，指亚硝化-Anammox 与其他单元（如 PDA、膜分离）的深度耦合；命名尚未标准化，保留待跟踪
- 流程: 进水〔水〕 → 集成反应器〔水〕 → 出水〔水〕
- 设计参数: 暂无标准化参数
- 适用: 研发/早期示范
- 优点: 耦合灵活
- 缺点: 术语未标准化；公开工程数据缺乏
