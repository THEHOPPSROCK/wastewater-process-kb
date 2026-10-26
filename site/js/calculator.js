/* 建一座水质净化厂：纯函数工艺计算引擎 + 原生交互。 */
'use strict';

(function (root) {
  const DEFAULTS = Object.freeze({
    Qavg: 50000, Kz: 1.58, KdDay: 1.3,
    BOD: 180, COD: 350, SS: 220, TN: 40, NH3: 30, TP: 4.5,
    outBOD: 10, outCOD: 50, outSS: 10, outNH3: 5, outTN: 15, outTP: 0.5,
    T: 15, MLSS: 3500, SRT: 20, Y: 0.6, KdDecay: 0.06,
    fVSS: 0.75, fSS: 0.6, R: 100, OTE: 20,
    alpha: 0.82, beta: 0.95, CL: 2, DO: 2,
    ratioAnaerobic: 1, ratioAnoxic: 2, ratioAerobic: 7,
    qClarifier: 1, clarifierDepth: 3.5, clarifierCount: 4,
    FeP: 2, carbonRatio: 4, alkalinity: 200,
    contactTime: 30, chlorineDose: 8,
    thickenedMoisture: 97, digestHRT: 25, VSDestruction: 50,
    gasYield: 0.9, cakeMoisture: 80, PAMDose: 5, solidRecovery: 98,
  });

  const GROUPS = [
    { title: '01 / 规模与变化系数', fields: [
      ['Qavg', '设计平均日水量 Q_avg', 'm³/d'], ['Kz', '总变化系数 K_z', '—', '随平均流量按 GB 50014-2021 表内插；手动输入后覆盖自动值'],
      ['KdDay', '日变化系数 K_d', '—'],
    ] },
    { title: '02 / 进水水质', fields: [
      ['BOD', 'BOD₅', 'mg/L'], ['COD', 'COD', 'mg/L'], ['SS', 'SS', 'mg/L'],
      ['TN', 'TN', 'mg/L'], ['NH3', 'NH₃-N', 'mg/L'], ['TP', 'TP', 'mg/L'],
    ] },
    { title: '03 / 出水目标（默认一级 A）', fields: [
      ['outBOD', 'BOD₅', 'mg/L'], ['outCOD', 'COD', 'mg/L'], ['outSS', 'SS', 'mg/L'],
      ['outNH3', 'NH₃-N（低温按 8 调整）', 'mg/L'], ['outTN', 'TN', 'mg/L'], ['outTP', 'TP', 'mg/L'],
    ] },
    { title: '04 / 生物池与污泥', fields: [
      ['T', '设计水温 T', '℃'], ['MLSS', 'MLSS', 'mg/L'], ['SRT', '设计污泥龄 θ_c', 'd'],
      ['Y', '产率系数 Y', 'kg/kg'], ['KdDecay', '衰减系数 K_d', 'd⁻¹'],
      ['fVSS', 'f = MLVSS / MLSS', '—'], ['fSS', '进水 SS 惰性转化率', '—'],
      ['R', '污泥回流比 R', '%', '100 表示 100%'], ['ratioAnaerobic', '厌氧区比例', '份'],
      ['ratioAnoxic', '缺氧区比例', '份'], ['ratioAerobic', '好氧区比例', '份'],
    ] },
    { title: '05 / 曝气、脱氮与除磷', fields: [
      ['OTE', '曝气器氧转移效率 OTE', '%'], ['alpha', '氧转移修正 α', '—'],
      ['beta', '饱和 DO 修正 β', '—'], ['CL', '池内控制 DO / C_L', 'mg/L'],
      ['DO', '硝化校核 DO', 'mg/L'], ['alkalinity', '进水碱度（CaCO₃ 计）', 'mg/L'],
      ['FeP', 'Fe / P 摩尔比', 'mol/mol'], ['carbonRatio', '碳源 COD / NO₃-N', 'kg/kg'],
    ] },
    { title: '06 / 二沉池与消毒', fields: [
      ['qClarifier', '二沉池表面负荷', 'm/h'], ['clarifierDepth', '二沉池有效水深', 'm'],
      ['clarifierCount', '二沉池座数 N', '座'], ['contactTime', '消毒接触时间', 'min'],
      ['chlorineDose', '加氯量', 'mg/L'],
    ] },
    { title: '07 / 污泥浓缩、消化与脱水', fields: [
      ['VSDestruction', '消化 VS 降解率', '%'], ['thickenedMoisture', '浓缩后含水率', '%'],
      ['digestHRT', '消化时间 HRT', 'd'], ['gasYield', '沼气产率', 'Nm³/kgVS'],
      ['cakeMoisture', '泥饼含水率', '%'], ['PAMDose', 'PAM 药耗', 'kg/tDS'],
      ['solidRecovery', '脱水固相回收率', '%'],
    ] },
  ];

  const LIMITS = {
    Qavg: [1, 1e7], Kz: [1, 4], KdDay: [1, 2], T: [1, 40], MLSS: [500, 15000],
    SRT: [0.5, 100], Y: [0.05, 2], KdDecay: [0, 1], fVSS: [0.1, 1], fSS: [0, 1],
    R: [0, 500], OTE: [1, 80], alpha: [0.1, 1], beta: [0.1, 1], CL: [0, 10], DO: [0.1, 10],
    ratioAnaerobic: [0.1, 20], ratioAnoxic: [0.1, 20], ratioAerobic: [0.1, 30],
    qClarifier: [0.1, 5], clarifierDepth: [1, 8], clarifierCount: [1, 30],
    FeP: [0.1, 10], carbonRatio: [0, 15], alkalinity: [0, 2000], contactTime: [1, 180],
    chlorineDose: [0, 100], thickenedMoisture: [50, 99.5], digestHRT: [1, 100],
    VSDestruction: [0, 90], gasYield: [0.1, 2], cakeMoisture: [20, 95],
    PAMDose: [0, 30], solidRecovery: [50, 100],
  };

  function kzAuto(Qavg) {
    const q = Qavg * 1000 / 86400;
    const xs = [5, 15, 40, 70, 100, 200, 500, 1000];
    const ys = [2.7, 2.4, 2.1, 2.0, 1.9, 1.8, 1.6, 1.5];
    if (q <= xs[0]) return ys[0];
    if (q >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (let i = 0; i < xs.length - 1; i++) {
      if (q >= xs[i] && q <= xs[i + 1]) {
        return ys[i] + (ys[i + 1] - ys[i]) * (q - xs[i]) / (xs[i + 1] - xs[i]);
      }
    }
    return 1.5;
  }

  function validate(raw) {
    const errors = [];
    const p = {};
    Object.keys(DEFAULTS).forEach((key) => {
      const value = typeof raw[key] === 'number' ? raw[key] : Number(raw[key]);
      if (!Number.isFinite(value)) errors.push(key + '：请输入有效数字');
      else p[key] = value;
    });
    Object.keys(LIMITS).forEach((key) => {
      if (!Number.isFinite(p[key])) return;
      const [min, max] = LIMITS[key];
      if (p[key] < min || p[key] > max) errors.push(key + '：允许范围 ' + min + '～' + max);
    });
    ['BOD', 'COD', 'SS', 'TN', 'NH3', 'TP', 'outBOD', 'outCOD', 'outSS', 'outNH3', 'outTN', 'outTP'].forEach((key) => {
      if (Number.isFinite(p[key]) && (p[key] < 0 || p[key] > 5000)) errors.push(key + '：允许范围 0～5000 mg/L');
    });
    [['BOD', 'outBOD'], ['COD', 'outCOD'], ['SS', 'outSS'], ['NH3', 'outNH3'], ['TN', 'outTN'], ['TP', 'outTP']].forEach(([a, b]) => {
      if (Number.isFinite(p[a]) && Number.isFinite(p[b]) && p[b] > p[a]) errors.push(b + '：出水浓度不应高于进水');
    });
    if (Number.isFinite(p.outTN) && Number.isFinite(p.outNH3) && p.outNH3 > p.outTN) errors.push('outTN：出水 TN 不应低于出水 NH₃-N');
    ['BOD', 'COD', 'TN', 'TP'].forEach((key) => { if (Number.isFinite(p[key]) && p[key] <= 0) errors.push(key + '：本工艺计算要求进水浓度大于 0'); });
    if (Number.isFinite(p.BOD) && Number.isFinite(p.outBOD) && p.outBOD >= p.BOD) errors.push('outBOD：SRT 法要求出水 BOD₅ 低于进水');
    if ([p.T, p.beta, p.CL].every(Number.isFinite)) {
      const CsT = 14.6 - 0.394 * p.T + 0.00714 * p.T * p.T - 0.0000646 * p.T * p.T * p.T;
      if (p.beta * CsT <= p.CL) errors.push('CL：控制 DO 过高，AOR→SOR 换算分母必须大于 0');
    }
    if (Number.isInteger(p.clarifierCount) === false) errors.push('clarifierCount：二沉池座数必须为整数');
    return { valid: errors.length === 0, errors, value: p };
  }

  function calculate(raw) {
    const checked = validate(Object.assign({}, DEFAULTS, raw || {}));
    if (!checked.valid) { const error = new Error(checked.errors.join('\n')); error.errors = checked.errors; throw error; }
    const p = checked.value;
    const r = p.R / 100;
    const sections = [];
    const warnings = [];
    const addSection = (id, title, en, metrics, steps) => sections.push({ id, title, en, metrics, steps });
    const st = (code, title, expr, substitution, value, unit) => ({ code, title, expr, substitution, value, unit });
    const mt = (label, value, unit) => ({ label, value, unit });
    const warn = (level, title, detail) => warnings.push({ level, title, detail });
    const num = (v, digits) => Number(v).toFixed(digits == null ? 2 : digits);
    const load = (Q, C) => Q * C / 1000;

    /* 01 设计水量 */
    const Qls = p.Qavg * 1000 / 86400;
    const QmaxDay = p.KdDay * p.Qavg;
    const QmaxHourDay = p.Kz * p.Qavg;
    const QmaxHour = QmaxHourDay / 24;
    addSection('flow', '设计水量', 'DESIGN FLOW', [
      mt('平均日水量 Q_avg', p.Qavg, 'm³/d'), mt('最大日水量 Q_max,d', QmaxDay, 'm³/d'),
      mt('最大时流量 Q_max,h', QmaxHour, 'm³/h'), mt('总变化系数 K_z', p.Kz, '—'),
    ], [
      st('F-1.4', '平均流量换算与 K_z 查表内插', 'Q_{avg}=\\dfrac{Q_d\\times1000}{86400}', num(p.Qavg, 0) + ' × 1000 / 86400；按表内插，当前采用 Kz = ' + num(p.Kz, 4), Qls, 'L/s'),
      st('F-1.6', '最大日设计流量', 'Q_{max,d}=K_d\\cdot Q_{avg}', num(p.KdDay, 2) + ' × ' + num(p.Qavg, 0), QmaxDay, 'm³/d'),
      st('F-1.6', '最高日最高时流量', 'Q_{max,h}=\\dfrac{K_z\\cdot Q_{avg}}{24}', num(p.Kz, 4) + ' × ' + num(p.Qavg, 0) + ' / 24', QmaxHour, 'm³/h'),
    ]);

    /* 02 污染负荷 */
    const quality = [
      ['BOD₅', p.BOD, p.outBOD], ['COD', p.COD, p.outCOD], ['SS', p.SS, p.outSS],
      ['TN', p.TN, p.outTN], ['NH₃-N', p.NH3, p.outNH3], ['TP', p.TP, p.outTP],
    ].map(([name, cin, cout]) => ({ name, cin, cout, lin: load(p.Qavg, cin), lout: load(p.Qavg, cout), removed: load(p.Qavg, cin - cout) }));
    const qmap = Object.fromEntries(quality.map((q) => [q.name, q]));
    const bodRemoved = qmap['BOD₅'].removed;
    const tnRemoved = qmap.TN.removed;
    addSection('loads', '污染负荷', 'MASS BALANCE', quality.slice(0, 4).map((q) => mt(q.name + ' 进水负荷', q.lin, 'kg/d')).concat([
      mt('BOD₅ 去除量', bodRemoved, 'kg/d'), mt('TN 去除量', tnRemoved, 'kg/d'),
    ]), [
      st('F-2.4', '单股设计进水加权校核', 'C_{mix}=\\dfrac{\\sum Q_i C_i}{\\sum Q_i}', num(p.Qavg, 0) + ' × ' + num(p.BOD, 1) + ' / ' + num(p.Qavg, 0) + '（BOD₅）', p.BOD, 'mg/L'),
      ...quality.map((q) => st('F-2.1', q.name + ' 进水 / 出水 / 去除负荷', 'L=\\dfrac{Q\\cdot C}{1000}', '进水 ' + num(q.lin, 2) + '；出水 ' + num(q.lout, 2) + '；去除 ' + num(q.removed, 2) + ' kg/d', q.removed, 'kg/d')),
    ]);
    const bodTn = p.BOD / p.TN;
    const bodTp = p.BOD / p.TP;
    const bc = p.BOD / p.COD;
    if (bodTn < 4) warn('critical', '碳源不足', 'BOD₅/TN = ' + num(bodTn, 2) + ' < 4，需外加碳源或采用低碳脱氮工艺。');
    if (bodTp < 17) warn('warning', '生物除磷碳源', 'BOD₅/TP = ' + num(bodTp, 2) + ' < 17，生物除磷可能受碳源限制。');
    if (bc < 0.25) warn('critical', '可生化性差', 'BOD₅/COD = ' + num(bc, 2) + ' < 0.25，不宜直接进入常规生物处理。');
    else if (bc < 0.3) warn('warning', '可生化性偏低', 'BOD₅/COD = ' + num(bc, 2) + '，建议预处理或补充易降解碳源。');

    /* 03 生物池（X_v 与 SRT 口径保持一致） */
    const X = p.MLSS / 1000;
    const Xv = X * p.fVSS;
    const V = p.SRT * p.Qavg * p.Y * (p.BOD - p.outBOD) / 1000 / (Xv * (1 + p.KdDecay * p.SRT));
    const ratioSum = p.ratioAnaerobic + p.ratioAnoxic + p.ratioAerobic;
    const Va = V * p.ratioAnaerobic / ratioSum;
    const Vx = V * p.ratioAnoxic / ratioSum;
    const Vo = V * p.ratioAerobic / ratioSum;
    const HRT = V / p.Qavg * 24;
    const aerobicHRT = Vo / p.Qavg * 24;
    addSection('bioreactor', '生物池（A²/O）', 'BIOREACTOR', [
      mt('曝气池总容积 V', V, 'm³'), mt('总 HRT', HRT, 'h'),
      mt('厌氧 / 缺氧 / 好氧', num(Va, 0) + ' / ' + num(Vx, 0) + ' / ' + num(Vo, 0), 'm³'),
      mt('好氧区 HRT', aerobicHRT, 'h'),
    ], [
      st('F-3.12', 'MLVSS 与 SRT 法总池容', 'V=\\dfrac{\\theta_c\\cdot Q\\cdot Y(S_0-S_e)}{X_v(1+K_d\\theta_c)}', 'Xv = ' + num(Xv, 3) + ' kg/m³；' + num(p.SRT, 1) + ' × ' + num(p.Qavg, 0) + ' × ' + num(p.Y, 2) + ' × (' + num(p.BOD, 1) + ' − ' + num(p.outBOD, 1) + ') × 10⁻³ / [' + num(Xv, 3) + ' × (1 + ' + num(p.KdDecay, 3) + ' × ' + num(p.SRT, 1) + ')]', V, 'm³'),
      st('F-3.12', '厌氧 / 缺氧 / 好氧分区', 'V_i=V\\cdot\\dfrac{r_i}{r_{ana}+r_{anox}+r_{aer}}', num(p.ratioAnaerobic, 1) + ' : ' + num(p.ratioAnoxic, 1) + ' : ' + num(p.ratioAerobic, 1) + '；分别为 ' + num(Va, 2) + ' / ' + num(Vx, 2) + ' / ' + num(Vo, 2) + ' m³', Vo, 'm³（好氧区）'),
      st('F-4.1', '总水力停留时间校核', '\\theta=\\dfrac{V}{Q}\\times24', num(V, 2) + ' / ' + num(p.Qavg, 0) + ' × 24', HRT, 'h'),
    ]);
    if (HRT < 4 || HRT > 16) warn('warning', '生物池 HRT 异常', '总 HRT = ' + num(HRT, 2) + ' h，超出本计算器 4～16 h 校核区间。');
    if (aerobicHRT < 4) warn('warning', '好氧区停留偏短', '好氧区 HRT = ' + num(aerobicHRT, 2) + ' h < 4 h，请复核硝化与池容分配。');

    /* 04 污泥系统 */
    const Yobs = p.Y / (1 + p.KdDecay * p.SRT);
    const dXv = Yobs * bodRemoved;
    const effSSLoad = load(p.Qavg, p.outSS);
    const effVSS = effSSLoad * p.fVSS;
    const wasteVSS = Math.max(0, dXv - effVSS);
    const inertSS = p.fSS * load(p.Qavg, p.SS - p.outSS);
    const totalDS = wasteVSS / p.fVSS + inertSS;
    const wetSludge = totalDS / (1 - 0.992) / 1000;
    const srtBack = V * Xv / (wasteVSS + effVSS);
    addSection('sludge', '污泥系统', 'SLUDGE PRODUCTION', [
      mt('表观产率 Y_obs', Yobs, 'kgVSS/kgBOD'), mt('挥发性剩余污泥 ΔX_v', dXv, 'kgVSS/d'),
      mt('总干污泥量', totalDS, 'kgDS/d'), mt('99.2% 含水率湿污泥', wetSludge, 'm³/d'),
      mt('SRT 定义式回算', srtBack, 'd'),
    ], [
      st('F-3.4', '表观产率', 'Y_{obs}=\\dfrac{Y}{1+K_d\\cdot\\theta_c}', num(p.Y, 2) + ' / (1 + ' + num(p.KdDecay, 3) + ' × ' + num(p.SRT, 1) + ')', Yobs, 'kgVSS/kgBOD'),
      st('F-9.1', '挥发性剩余污泥量', '\\Delta X_v=Y_{obs}\\cdot Q(S_0-S_e)\\times10^{-3}', num(Yobs, 4) + ' × ' + num(bodRemoved, 2), dXv, 'kgVSS/d'),
      st('F-9.2', '总干污泥量（扣除出水生物固体）', '\\Delta X=\\dfrac{\\Delta X_v-Q_eX_e f}{f}+f_{SS}\\cdot Q(SS_0-SS_e)\\times10^{-3}', '(' + num(dXv, 2) + ' − ' + num(effVSS, 2) + ') / ' + num(p.fVSS, 2) + ' + ' + num(inertSS, 2), totalDS, 'kgDS/d'),
      st('F-9.3', '99.2% 含水率湿污泥体积', 'V_s=\\dfrac{W_{DS}}{1000(1-P)}', num(totalDS, 2) + ' / [1000 × (1 − 0.992)]', wetSludge, 'm³/d'),
      st('F-3.6', 'SRT 定义式回算', '\\theta_c=\\dfrac{V\\cdot X_v}{Q_w\\cdot X_r+Q_e\\cdot X_e}', num(V, 2) + ' × ' + num(Xv, 3) + ' / (' + num(wasteVSS, 2) + ' + ' + num(effVSS, 2) + ')', srtBack, 'd'),
    ]);

    /* 05 需氧量、鼓风与碱度 */
    const nAssim = 0.12 * dXv;
    const nNitrified = Math.max(0, load(p.Qavg, p.NH3 - p.outNH3) - nAssim);
    const nDenitrified = Math.max(0, load(p.Qavg, p.TN - p.outTN) - nAssim);
    const oxygenCarbon = 1.47 * bodRemoved - 1.42 * dXv;
    const oxygenNit = 4.57 * nNitrified;
    const oxygenCredit = 2.86 * nDenitrified;
    const AOR = Math.max(0, oxygenCarbon + oxygenNit - oxygenCredit);
    const CsT = 14.6 - 0.394 * p.T + 0.00714 * p.T * p.T - 0.0000646 * p.T * p.T * p.T;
    const SOR = AOR * 9.17 / (p.alpha * (p.beta * CsT - p.CL) * Math.pow(1.024, p.T - 20));
    const air = SOR / (0.28 * p.OTE / 100) / 24;
    const alkConsumed = 7.14 * nNitrified / p.Qavg * 1000;
    const alkRecovered = 3.57 * nDenitrified / p.Qavg * 1000;
    const alkResidual = p.alkalinity - alkConsumed + alkRecovered;
    const alkDeficit = Math.max(0, 80 - alkResidual);
    const lime = load(p.Qavg, alkDeficit * 0.56);
    const bicarbonate = load(p.Qavg, alkDeficit * 1.68);
    addSection('aeration', '需氧量与鼓风', 'OXYGEN & AIR', [
      mt('实际需氧量 AOR', AOR, 'kgO₂/d'), mt('标准需氧量 SOR', SOR, 'kgO₂/d'),
      mt('鼓风量 G_s', air, 'm³/h'), mt('剩余碱度', alkResidual, 'mg/L'),
      mt('CaO / NaHCO₃ 补充量', num(lime, 0) + ' / ' + num(bicarbonate, 0), 'kg/d'),
    ], [
      st('F-5.1', '碳氧化需氧量', 'O_{2,c}=1.47\\Delta S-1.42\\Delta X_v', '1.47 × ' + num(bodRemoved, 2) + ' − 1.42 × ' + num(dXv, 2), oxygenCarbon, 'kgO₂/d'),
      st('F-5.2', '硝化需氧量', 'O_{2,n}=4.57\\left[0.001Q(NH_3-N_{in}-NH_3-N_e)-0.12\\Delta X_v\\right]', '4.57 × (' + num(load(p.Qavg, p.NH3 - p.outNH3), 2) + ' − ' + num(nAssim, 2) + ')', oxygenNit, 'kgO₂/d'),
      st('F-5.3', '反硝化回收氧', 'O_{2,d}=2.86\\left[0.001Q(TN_0-TN_e)-0.12\\Delta X_v\\right]', '2.86 × (' + num(tnRemoved, 2) + ' − ' + num(nAssim, 2) + ')', oxygenCredit, 'kgO₂/d'),
      st('F-5.4', '总实际需氧量 AOR', 'AOR=O_{2,c}+O_{2,n}-O_{2,d}', num(oxygenCarbon, 2) + ' + ' + num(oxygenNit, 2) + ' − ' + num(oxygenCredit, 2), AOR, 'kgO₂/d'),
      st('F-5.5', 'AOR → SOR 换算', 'SOR=\\dfrac{AOR\\cdot C_{s(20)}}{\\alpha[\\beta C_{s(T)}-C_L]1.024^{T-20}}', 'Cs(' + num(p.T, 1) + '℃) = ' + num(CsT, 3) + ' mg/L；' + num(AOR, 2) + ' × 9.17 / {' + num(p.alpha, 2) + ' × [' + num(p.beta, 2) + ' × ' + num(CsT, 3) + ' − ' + num(p.CL, 1) + '] × 1.024^(' + num(p.T - 20, 1) + ')}', SOR, 'kgO₂/d'),
      st('F-5.7', '鼓风量', 'G_s=\\dfrac{SOR}{24\\times0.28\\cdot E_A}', num(SOR, 2) + ' / [24 × 0.28 × ' + num(p.OTE / 100, 2) + ']', air, 'm³/h'),
      st('F-5.11', '硝化耗碱与剩余碱度', 'ALK_e=ALK_0-7.14\\Delta N_{nit}+3.57\\Delta N_{denit}', num(p.alkalinity, 1) + ' − ' + num(alkConsumed, 2) + ' + ' + num(alkRecovered, 2) + '；缺口按 80 mg/L 目标，CaO = 0.56 × 缺口，NaHCO₃ = 1.68 × 缺口', alkResidual, 'mg/L'),
    ]);
    if (alkResidual < 80) warn('critical', '碱度不足', '剩余碱度 ' + num(alkResidual, 1) + ' mg/L < 80 mg/L；估算 CaO ' + num(lime, 1) + ' kg/d 或 NaHCO₃ ' + num(bicarbonate, 1) + ' kg/d。');
    else if (alkResidual < 100) warn('warning', '碱度裕量偏低', '剩余碱度 ' + num(alkResidual, 1) + ' mg/L，建议保留 80～100 mg/L 以上裕量。');

    /* 06 脱氮与碳源 */
    const KN = Math.pow(10, 0.051 * p.T - 1.158);
    const muN = 0.47 * Math.exp(0.098 * (p.T - 15)) * (p.outNH3 / (KN + p.outNH3)) * (p.DO / (1.3 + p.DO));
    const srtMin = 1 / Math.max(0.001, muN - 0.04);
    const srtDesign = 2.5 * srtMin;
    const etaTN = (p.TN - p.outTN) / p.TN;
    const Ri = etaTN <= 0 ? 0 : etaTN >= 1 ? Infinity : etaTN * (1 + r) / (1 - etaTN) - r;
    const codDemand = p.carbonRatio * nDenitrified;
    const codAvailable = 1.5 * qmap['BOD₅'].lin;
    const codDeficit = Math.max(0, codDemand - codAvailable);
    const sodiumAcetate = codDeficit / 0.78;
    const methanol = codDeficit / 1.5;
    addSection('nitrogen', '脱氮校核', 'NITROGEN REMOVAL', [
      mt('硝化最低 / 设计泥龄', num(srtMin, 1) + ' / ' + num(srtDesign, 1), 'd'),
      mt('内回流比需求 R_i', Number.isFinite(Ri) ? Ri * 100 : Infinity, '%'),
      mt('反硝化 COD 需求', codDemand, 'kgCOD/d'),
      mt('乙酸钠 / 甲醇补充', num(sodiumAcetate, 0) + ' / ' + num(methanol, 0), 'kg/d'),
    ], [
      st('F-7.2', '硝化速率温度、基质与 DO 修正', '\\mu_n=0.47e^{0.098(T-15)}\\dfrac{N}{K_N+N}\\dfrac{DO}{K_O+DO}', 'KN = ' + num(KN, 3) + '；0.47 × e^[' + num(0.098 * (p.T - 15), 3) + '] × ' + num(p.outNH3 / (KN + p.outNH3), 4) + ' × ' + num(p.DO / (1.3 + p.DO), 4), muN, 'd⁻¹'),
      st('F-7.1', '硝化最低污泥龄', '\\theta_c^{min}=\\dfrac{1}{\\mu_n-b_n}', 'bn = 0.04 d⁻¹；1 / (' + num(muN, 4) + ' − 0.04)', srtMin, 'd'),
      st('F-7.3', '硝化设计污泥龄', '\\theta_c^{design}=SF\\cdot\\theta_c^{min}', '2.5 × ' + num(srtMin, 3), srtDesign, 'd'),
      st('F-7.6', '由 TN 去除率反算内回流比', 'R_i=\\dfrac{\\eta_{TN}(1+R)}{1-\\eta_{TN}}-R', 'η = ' + num(etaTN, 4) + '；' + num(etaTN, 4) + ' × (1 + ' + num(r, 2) + ') / (1 − ' + num(etaTN, 4) + ') − ' + num(r, 2), Ri, '—'),
      st('F-7.9', '脱氮碳源校核', 'COD_{需求}=k\\cdot\\Delta NO_3-N', num(p.carbonRatio, 2) + ' × ' + num(nDenitrified, 2) + '；可利用 COD 按 1.5 × 进水 BOD₅ 负荷估算 = ' + num(codAvailable, 2) + ' kg/d', codDeficit, 'kgCOD/d 缺口'),
      st('F-6.6', '外加碳源 COD 当量折算', 'D=\\dfrac{COD_{缺口}}{COD_{eq}}', '乙酸钠 COD 当量 0.78；甲醇 1.50 kgCOD/kg', sodiumAcetate, 'kg/d（乙酸钠）'),
    ]);
    if (p.SRT < srtMin) warn('critical', '泥龄低于硝化最低值', 'SRT = ' + num(p.SRT, 1) + ' d < 最低 ' + num(srtMin, 1) + ' d，硝化菌有洗出风险。');
    else if (p.SRT < srtDesign) warn('warning', '硝化泥龄裕量不足', 'SRT = ' + num(p.SRT, 1) + ' d < 设计建议 ' + num(srtDesign, 1) + ' d（SF = 2.5）。');
    if (!Number.isFinite(Ri) || Ri > 5) warn('critical', '内回流需求过高', 'R_i = ' + num(Ri * 100, 1) + '%，单纯提高内回流难以达标。');
    else if (Ri > 4) warn('warning', '内回流比偏高', 'R_i = ' + num(Ri * 100, 1) + '% > 400%，需复核缺氧区与运行能耗。');
    if (codDeficit > 0) warn('warning', '需外加碳源', '估算 COD 缺口 ' + num(codDeficit, 1) + ' kg/d；可折乙酸钠 ' + num(sodiumAcetate, 1) + ' kg/d 或甲醇 ' + num(methanol, 1) + ' kg/d。');

    /* 07 化学除磷 */
    const pRemoved = load(p.Qavg, p.TP - p.outTP);
    const kmolP = pRemoved / 31;
    const kmolFe = p.FeP * kmolP;
    const fecl3 = kmolFe * 162.2;
    const fecl3Hex = kmolFe * 270.3;
    const feSolution = fecl3 / 0.4;
    const alum = kmolFe * 666.5 / 2;
    const alumCommercial = alum / 0.95;
    addSection('phosphorus', '化学除磷', 'CHEMICAL P RECOVERY', [
      mt('化学除磷量', pRemoved, 'kgP/d'), mt('FeCl₃·6H₂O（纯品）', fecl3Hex, 'kg/d'),
      mt('40% FeCl₃ 溶液', feSolution, 'kg/d'), mt('18 水硫酸铝（95%）', alumCommercial, 'kg/d'),
    ], [
      st('F-6.1', '金属盐摩尔量', 'n_{Fe}=\\beta\\cdot n_P=\\beta\\dfrac{\\Delta P}{31}', num(p.FeP, 2) + ' × ' + num(pRemoved, 2) + ' / 31', kmolFe, 'kmolFe/d'),
      st('F-6.2', '三氯化铁及商品溶液折算', 'D=n_{Fe}\\cdot M_{FeCl_3}', '无水 FeCl₃ = ' + num(fecl3, 2) + ' kg/d；六水盐 = ' + num(fecl3Hex, 2) + ' kg/d；40% 溶液按无水盐 / 0.40', feSolution, 'kg/d（40% 溶液）'),
      st('F-6.2', '18 水硫酸铝折算', 'D=\\beta\\dfrac{\\Delta P}{31}\\dfrac{M_{药剂}}{n_{Al}}', num(kmolFe, 3) + ' × 666.5 / 2；95% 商品再 / 0.95', alumCommercial, 'kg/d'),
    ]);

    /* 08 二沉池 */
    const area = QmaxHour / p.qClarifier;
    const diameter = Math.sqrt(4 * area / (Math.PI * p.clarifierCount));
    const weirLength = Math.PI * diameter * p.clarifierCount;
    const weirLoad = QmaxHour * 1000 / 3600 / weirLength;
    const solidLoad = QmaxHourDay * (1 + r) * X / area;
    const settlingTime = p.clarifierDepth / p.qClarifier;
    addSection('clarifier', '二沉池', 'SECONDARY CLARIFIER', [
      mt('总表面积 A', area, 'm²'), mt('单池直径 D（' + p.clarifierCount + ' 座）', diameter, 'm'),
      mt('单侧堰负荷 q_w', weirLoad, 'L/(s·m)'), mt('固体负荷 G', solidLoad, 'kg/(m²·d)'),
      mt('理论沉淀时间', settlingTime, 'h'),
    ], [
      st('F-8.1', '按最高时流量计算总表面积', 'A=\\dfrac{Q_{max,h}}{q}', num(QmaxHour, 2) + ' / ' + num(p.qClarifier, 2), area, 'm²'),
      st('F-8.1', 'N 座圆形池直径', 'D=\\sqrt{\\dfrac{4A}{\\pi N}}', '√[4 × ' + num(area, 2) + ' / (π × ' + p.clarifierCount + ')]', diameter, 'm'),
      st('F-8.4', '单侧周边堰负荷', 'q_w=\\dfrac{Q_{max,h}}{L_w}', num(QmaxHour * 1000 / 3600, 2) + ' L/s / (π × ' + num(diameter, 2) + ' × ' + p.clarifierCount + ' m)', weirLoad, 'L/(s·m)'),
      st('F-8.3', '固体负荷校核', 'G=\\dfrac{Q_{max,h,d}(1+R)X}{A}', num(QmaxHourDay, 2) + ' × (1 + ' + num(r, 2) + ') × ' + num(X, 3) + ' / ' + num(area, 2), solidLoad, 'kg/(m²·d)'),
      st('F-8.2', '理论沉淀时间', 't=\\dfrac{H}{q}', num(p.clarifierDepth, 2) + ' / ' + num(p.qClarifier, 2), settlingTime, 'h'),
    ]);
    if (weirLoad > 1.7) warn('warning', '二沉池堰负荷超限', '单侧堰负荷 ' + num(weirLoad, 2) + ' L/(s·m) > 1.7，建议双侧堰或增加出水槽。');
    if (solidLoad > 150) warn('warning', '二沉池固体负荷超限', '固体负荷 ' + num(solidLoad, 1) + ' kg/(m²·d) > 150，请降低 MLSS、增加面积或复核设计口径。');

    /* 09 消毒 */
    const contactV = QmaxHour * p.contactTime / 60;
    const chlorine = p.chlorineDose * QmaxHourDay / 1000;
    addSection('disinfection', '消毒', 'DISINFECTION', [
      mt('氯接触池容积 V', contactV, 'm³'), mt('最高时加氯量', chlorine / 24, 'kg/h'),
      mt('峰值日加氯量', chlorine, 'kg/d'),
    ], [
      st('F-10.4', '接触池容积', 'V=Q_{max,h}\\cdot\\dfrac{T}{60}', num(QmaxHour, 2) + ' × ' + num(p.contactTime, 1) + ' / 60', contactV, 'm³'),
      st('F-10.1', '加氯量', 'D_{Cl_2}=a\\cdot Q', num(p.chlorineDose, 1) + ' mg/L × ' + num(QmaxHourDay, 2) + ' m³/d / 1000', chlorine, 'kg/d'),
    ]);

    /* 10 污泥处理 */
    const thickenedV = totalDS / (1 - p.thickenedMoisture / 100) / 1000;
    const digesterV = thickenedV * p.digestHRT;
    const VSin = totalDS * p.fVSS;
    const VSremoved = VSin * p.VSDestruction / 100;
    const biogas = VSremoved * p.gasYield;
    const digestedDS = totalDS - VSremoved;
    const cake = digestedDS * p.solidRecovery / 100 / (1 - p.cakeMoisture / 100) / 1000;
    const PAM = digestedDS / 1000 * p.PAMDose;
    addSection('sludgeTreatment', '污泥处理', 'THICKENING · DIGESTION · DEWATERING', [
      mt('浓缩后污泥体积', thickenedV, 'm³/d'), mt('消化池容积 V', digesterV, 'm³'),
      mt('沼气产量 G', biogas, 'Nm³/d'), mt('消化后干固体', digestedDS, 'kgDS/d'),
      mt('脱水泥饼量', cake, 't/d'), mt('PAM 药耗', PAM, 'kg/d'),
    ], [
      st('F-9.3', '浓缩后污泥体积', 'V_2=\\dfrac{W_{DS}}{1000(1-P_2)}', num(totalDS, 2) + ' / [1000 × (1 − ' + num(p.thickenedMoisture / 100, 3) + ')]', thickenedV, 'm³/d'),
      st('F-9.8', '消化池容积（HRT 法）', 'V=Q_s\\cdot\\theta', num(thickenedV, 2) + ' × ' + num(p.digestHRT, 1), digesterV, 'm³'),
      st('F-9.9', 'VS 去除量与消化后干固体', 'W_{out}=W_{in}(1-f_{VS}\\eta_{VS})', 'VS 进料 = ' + num(VSin, 2) + ' kg/d；VS 去除 = ' + num(VSremoved, 2) + ' kg/d', digestedDS, 'kgDS/d'),
      st('F-9.10', '沼气产量', 'G=\\eta_{VS}\\cdot W_{VS}\\cdot g', num(VSremoved, 2) + ' × ' + num(p.gasYield, 2), biogas, 'Nm³/d'),
      st('F-9.14', '脱水泥饼量', 'W_{cake}=\\dfrac{W_{DS}\\cdot R_s}{1-P_{cake}}', num(digestedDS, 2) + ' × ' + num(p.solidRecovery / 100, 3) + ' / (1 − ' + num(p.cakeMoisture / 100, 2) + ') / 1000', cake, 't/d'),
      st('F-6.4', 'PAM 药耗', 'D_{PAM}=W_{DS}\\cdot d', num(digestedDS / 1000, 3) + ' tDS/d × ' + num(p.PAMDose, 2) + ' kg/tDS', PAM, 'kg/d'),
    ]);
    if (p.digestHRT < 15) warn('warning', '消化时间偏短', '消化 HRT = ' + num(p.digestHRT, 1) + ' d < 15 d，产甲烷菌稳定性需重点复核。');
    if (p.VSDestruction < 40) warn('warning', 'VS 降解率偏低', 'VS 降解率 = ' + num(p.VSDestruction, 1) + '% < 40%，不满足稳定化校核目标。');

    const summary = { Qavg: p.Qavg, QmaxDay, QmaxHour, V, HRT, SRT: p.SRT, sludgeDS: totalDS, AOR, SOR, air, biogas, cake };
    return { inputs: p, summary, sections, warnings };
  }

  root.PlantCalculator = Object.freeze({ DEFAULTS, GROUPS, kzAuto, validate, calculate });
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PlantCalculator;
  if (!root.document) return;

  const host = root.document.getElementById('plantCalculator');
  if (!host) return;
  const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  let kzManual = false;
  let timer = null;
  let firstCalculation = true;

  function fmt(value) {
    if (typeof value === 'string') return value;
    if (!Number.isFinite(value)) return '∞';
    const a = Math.abs(value);
    const digits = a >= 1000 ? 1 : a >= 100 ? 2 : a >= 10 ? 2 : 3;
    return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: digits });
  }

  function inputMarkup(key, label, unit, hint) {
    let value = DEFAULTS[key];
    if (key === 'Kz') value = kzAuto(DEFAULTS.Qavg);
    return '<div class="param-row"><label for="pc-' + key + '">' + esc(label) + '</label>' +
      '<div class="param-field"><input id="pc-' + key + '" name="' + key + '" type="number" step="any" value="' + esc(numInput(value)) + '" data-key="' + key + '" inputmode="decimal"><span class="param-unit">' + esc(unit) + '</span></div>' +
      (hint ? '<small class="param-hint">' + esc(hint) + '</small>' : '') + '</div>';
  }

  function numInput(v) { return Number(v).toFixed(4).replace(/0+$/, '').replace(/\.$/, ''); }

  host.innerHTML = '<div class="builder-head"><div><div class="builder-title">建一座水质净化厂</div>' +
    '<div class="builder-sub">PLANT BUILDER / 方案阶段工艺参数计算器</div></div>' +
    '<div class="process-route" aria-label="工艺路线"><span>预处理</span><i>→</i><span>A²/O</span><i>→</i><span>二沉池</span><i>→</i><span>消毒</span><i>→</i><span>浓缩 / 消化 / 脱水</span></div></div>' +
    '<div class="builder-grid"><form class="input-deck" id="plantForm" novalidate>' +
    '<div class="preset-row"><button class="preset-btn" type="button" data-q="10000">1 万 m³/d</button><button class="preset-btn" type="button" data-q="50000">5 万 m³/d</button><button class="preset-btn" type="button" data-q="200000">20 万 m³/d</button></div>' +
    GROUPS.map((g) => '<fieldset class="param-group"><legend>' + esc(g.title) + '</legend>' + g.fields.map((f) => inputMarkup(...f)).join('') + '</fieldset>').join('') +
    '<div class="calc-actions"><button class="calc-primary" type="submit">开始计算 CALCULATE</button><button class="calc-secondary" id="plantReset" type="button">重置</button></div>' +
    '<div class="calc-errors" id="calcErrors" role="alert"></div><p class="calc-note">输入变化后自动重算。K_z 默认随 Q 内插，手动修改 K_z 后保持覆盖；点击预设可恢复自动取值。结果为方案估算，构筑物尺寸与药耗仍需结合试验和厂家参数复核。</p></form>' +
    '<div class="results-deck" id="plantResults" aria-live="polite"></div></div>';

  const form = root.document.getElementById('plantForm');
  const results = root.document.getElementById('plantResults');
  const errorBox = root.document.getElementById('calcErrors');

  function readInputs() {
    const data = {};
    form.querySelectorAll('input[data-key]').forEach((input) => { data[input.dataset.key] = input.value === '' ? NaN : Number(input.value); });
    return data;
  }

  function metricHTML(m) {
    return '<div class="metric"><span class="metric-label">' + esc(m.label) + '</span><strong class="metric-value">' + esc(fmt(m.value)) + '</strong><span class="metric-unit">' + esc(m.unit) + '</span></div>';
  }

  function stepHTML(step) {
    return '<div class="calc-step"><button class="step-code" type="button" data-formula="' + esc(step.code) + '" title="跳转公式手册 ' + esc(step.code) + '">' + esc(step.code) + '</button>' +
      '<div><div class="step-title">' + esc(step.title) + '</div><div class="step-expr">' + root.MathRender.render(step.expr) + '</div>' +
      '<div class="step-sub">代入 → ' + esc(step.substitution) + '</div><div class="step-result">结果 = ' + esc(fmt(step.value)) + ' ' + esc(step.unit) + '</div></div></div>';
  }

  function renderResult(model) {
    const s = model.summary;
    results.innerHTML = '<div class="builder-overview">' +
      [['平均日规模', s.Qavg, 'm³/d'], ['生物池总容积', s.V, 'm³'], ['实际需氧量', s.AOR, 'kgO₂/d'], ['沼气产量', s.biogas, 'Nm³/d']].map(([label, value, unit]) =>
        '<div class="overview-item"><span>' + label + '</span><strong>' + esc(fmt(value)) + '</strong><small>' + unit + '</small></div>').join('') + '</div>' +
      '<div class="warnings"><div class="warnings-title">工程合理性校核 / DESIGN CHECKS</div>' +
      (model.warnings.length ? model.warnings.map((w) => '<div class="warning-item ' + (w.level === 'critical' ? 'critical' : '') + '"><b>' + (w.level === 'critical' ? '警示' : '注意') + '</b><p><strong>' + esc(w.title) + '</strong> · ' + esc(w.detail) + '</p></div>').join('') : '<div class="all-clear">当前校核项均通过。</div>') + '</div>' +
      model.sections.map((section, i) => '<section class="unit-section" id="calc-' + esc(section.id) + '"><div class="unit-heading"><span class="unit-index">' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(section.title) + '</h3><span class="unit-en">' + esc(section.en) + '</span></div>' +
        '<div class="metric-grid">' + section.metrics.map(metricHTML).join('') + '</div><details class="calc-details"><summary>查看计算过程 · ' + section.steps.length + ' 步</summary><div class="steps">' + section.steps.map(stepHTML).join('') + '</div></details></section>').join('');

    if (firstCalculation) {
      firstCalculation = false;
      console.groupCollapsed('[PLANT BUILDER] 默认工况完整计算结果');
      console.table(s);
      console.log('输入参数', model.inputs);
      console.log('工艺单元（含逐步计算）', model.sections);
      console.log('工程校核', model.warnings);
      console.groupEnd();
    }
  }

  function runCalculation() {
    const data = readInputs();
    const check = root.PlantCalculator.validate(data);
    form.querySelectorAll('input[data-key]').forEach((input) => input.removeAttribute('aria-invalid'));
    if (!check.valid) {
      errorBox.textContent = check.errors.join('；');
      check.errors.forEach((message) => {
        const input = form.querySelector('[data-key="' + message.split('：')[0] + '"]');
        if (input) input.setAttribute('aria-invalid', 'true');
      });
      return false;
    }
    errorBox.textContent = '';
    try { renderResult(root.PlantCalculator.calculate(data)); return true; }
    catch (error) { errorBox.textContent = error.message; return false; }
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); runCalculation(); });
  form.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-key]');
    if (!input) return;
    if (input.dataset.key === 'Kz') kzManual = true;
    if (input.dataset.key === 'Qavg' && !kzManual && Number(input.value) > 0) form.elements.Kz.value = numInput(root.PlantCalculator.kzAuto(Number(input.value)));
    root.clearTimeout(timer);
    timer = root.setTimeout(runCalculation, 220);
  });
  form.querySelectorAll('.preset-btn').forEach((button) => button.addEventListener('click', () => {
    const q = Number(button.dataset.q);
    kzManual = false;
    Object.keys(DEFAULTS).forEach((key) => { form.elements[key].value = numInput(key === 'Qavg' ? q : key === 'Kz' ? root.PlantCalculator.kzAuto(q) : DEFAULTS[key]); });
    runCalculation();
  }));
  root.document.getElementById('plantReset').addEventListener('click', () => {
    kzManual = false;
    Object.keys(DEFAULTS).forEach((key) => { form.elements[key].value = numInput(key === 'Kz' ? root.PlantCalculator.kzAuto(DEFAULTS.Qavg) : DEFAULTS[key]); });
    runCalculation();
  });
  results.addEventListener('click', (event) => {
    const button = event.target.closest('.step-code');
    if (button && root.SludgeTech) root.SludgeTech.openFormula(button.dataset.formula);
  });

  runCalculation();
})(typeof window !== 'undefined' ? window : globalThis);
