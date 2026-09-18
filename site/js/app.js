/* ============================================================
   SLUDGE-TECH DATABASE // 2077 — 渲染与交互（原生 ES6+）
   ============================================================ */
'use strict';

(function () {
  const PROC = window.__PROCESSES__;
  const FORM = window.__FORMULAS__;

  if (!PROC || !FORM) {
    document.body.innerHTML =
      '<p style="color:#FF003C;padding:40px;font-family:monospace">' +
      '数据未加载：请先运行 tools/embed_data.py 生成 data/*.js</p>';
    return;
  }

  /* ---------- 常量 ---------- */
  // 数据完整性基准值：增删大类或变种后请同步更新（当前 37 大类 / 171 变种）
  const EXPECTED = { cats: 37, variants: 171 };
  const FAMILY_ORDER = [
    '预处理物化', '悬浮生长生物', '固着生长生物', '厌氧生物', '自然生态',
    '膜法', '高级氧化与深度', '污泥处理处置', '资源能源回收',
  ];
  const FAMILY_EN = {
    '预处理物化': 'PHYS-CHEM PRE',
    '悬浮生长生物': 'SUSPENDED BIO',
    '固着生长生物': 'ATTACHED BIO',
    '厌氧生物': 'ANAEROBIC',
    '自然生态': 'NATURAL ECO',
    '膜法': 'MEMBRANE',
    '高级氧化与深度': 'AOP / POLISH',
    '污泥处理处置': 'SLUDGE',
    '资源能源回收': 'RESOURCE',
  };
  const ERA_ORDER = [
    '1840s-1870s', '1880-1909', '1910s-1940s', '1950s-1960s',
    '1970s', '1980s', '1990s', '2000s', '2010s-至今',
  ];
  const MATURITY_COLOR = {
    '成熟经典': '#00F0FF',
    '成熟主流': '#FCEE0A',
    '商业化初期': '#FF9F1C',
    '前沿研发': '#FF003C',
  };
  const FLOW_KIND = {
    w: { c: '#00F0FF', label: '水线 WATER' },
    s: { c: '#FCEE0A', label: '污泥线 SLUDGE' },
    r: { c: '#FF003C', label: '回流线 RETURN', dash: true },
    m: { c: '#00FF9C', label: '辅助线 AUX' },
  };

  const cats = PROC.categories.slice().sort((a, b) => a.year - b.year);
  const eras = ERA_ORDER.filter((e) => cats.some((c) => c.era === e))
    .concat([...new Set(cats.map((c) => c.era))].filter((e) => !ERA_ORDER.includes(e)));
  const fams = FAMILY_ORDER.filter((f) => cats.some((c) => c.family === f))
    .concat([...new Set(cats.map((c) => c.family))].filter((f) => !FAMILY_ORDER.includes(f)));
  const famIdx = new Map(fams.map((f, i) => [f, i]));

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ---------- 元素符号：2-3 大写字母缩写，保证唯一 ---------- */
  function makeSymbols(list) {
    const used = new Set();
    const map = new Map();
    for (const c of list) {
      const words = String(c.name_en || '')
        .replace(/[^A-Za-z\s-]/g, ' ')
        .split(/[\s-]+/)
        .filter(Boolean);
      const w1 = words[0] || 'X';
      const cand = [];
      if (words.length >= 2) cand.push(w1[0] + words[1][0]);               // As
      cand.push(w1.slice(0, 2));                                             // Ac
      if (words.length >= 2) cand.push(w1[0] + words[1].slice(0, 2));        // Asl
      cand.push(w1.slice(0, 3));                                             // Act
      if (words.length >= 3) cand.push(w1[0] + words[1][0] + words[2][0]);   // Asm
      cand.push(w1[0] + w1[w1.length - 1] + (words[1] ? words[1][0] : 'x'));
      let sym = null;
      for (const raw of cand) {
        const s = (raw[0].toUpperCase() + raw.slice(1).toLowerCase()).slice(0, 3);
        if (!used.has(s)) { sym = s; break; }
      }
      if (!sym) {
        let i = 2;
        while (used.has((w1[0].toUpperCase() + w1[1].toLowerCase()) + i)) i++;
        sym = (w1[0].toUpperCase() + w1[1].toLowerCase()) + i;
      }
      used.add(sym);
      map.set(c.id, sym);
    }
    return map;
  }
  const symbols = makeSymbols(cats);

  /* ---------- Header 统计 ---------- */
  const totalVariants = cats.reduce((n, c) => n + c.variants.length, 0);
  const totalFormulas = FORM.chapters.reduce((n, ch) => n + ch.formulas.length, 0);
  $('#statCats').textContent = cats.length;
  $('#statVars').textContent = totalVariants;
  $('#statForms').textContent = totalFormulas;

  /* ============================================================
     周期表
     ============================================================ */
  const ptable = $('#ptable');
  ptable.style.gridTemplateColumns = '108px repeat(' + fams.length + ', minmax(158px, 1fr))';

  function renderTable() {
    ptable.innerHTML = '';
    // 左上角 sticky corner
    const corner = document.createElement('div');
    corner.className = 'cell-corner';
    corner.style.gridRow = '1';
    corner.style.gridColumn = '1';
    corner.textContent = 'ERA \\ FAMILY';
    ptable.appendChild(corner);
    // family 列头
    fams.forEach((f, i) => {
      const h = document.createElement('div');
      h.className = 'cell-head';
      h.style.gridRow = '1';
      h.style.gridColumn = String(i + 2);
      h.style.setProperty('--fam', 'var(--fam-' + i + ')');
      h.innerHTML = '<div class="fam-zh">' + esc(f) + '</div>' +
        '<div class="fam-en">' + esc(FAMILY_EN[f] || f) + '</div>';
      ptable.appendChild(h);
    });
    // era 行标签 + 交叉格
    eras.forEach((e, r) => {
      const lab = document.createElement('div');
      lab.className = 'cell-era';
      lab.style.gridRow = String(r + 2);
      lab.style.gridColumn = '1';
      lab.textContent = e;
      ptable.appendChild(lab);
      fams.forEach((f, ci) => {
        const slot = document.createElement('div');
        slot.className = 'cell-slot';
        slot.style.gridRow = String(r + 2);
        slot.style.gridColumn = String(ci + 2);
        slot.dataset.era = e;
        slot.dataset.family = f;
        ptable.appendChild(slot);
      });
    });
    // 卡片
    let rendered = 0;
    for (const c of cats) {
      const slot = ptable.querySelector(
        '.cell-slot[data-era="' + cssEsc(c.era) + '"][data-family="' + cssEsc(c.family) + '"]');
      if (!slot) continue;
      slot.appendChild(buildCard(c));
      rendered++;
    }
    // 校验
    console.log('[校验] 渲染卡片数 = ' + rendered + ' / categories.length = ' + cats.length +
      (rendered === cats.length ? ' ✔ 一致' : ' ✘ 不一致') +
      '，期望 ' + EXPECTED.cats + (cats.length === EXPECTED.cats ? ' ✔' : ' ✘'));
    console.log('[校验] 变种总数 = ' + totalVariants + '（期望 ' + EXPECTED.variants + '）' +
      (totalVariants === EXPECTED.variants ? ' ✔' : ' ✘'));
    console.log('[校验] 公式条目数 = ' + totalFormulas + '（formulas.json 实际值）');
  }

  function cssEsc(s) { return String(s).replace(/"/g, '\\"'); }

  function buildCard(c) {
    const fi = famIdx.get(c.family);
    const btn = document.createElement('button');
    btn.className = 'card';
    btn.type = 'button';
    btn.style.setProperty('--fam', 'var(--fam-' + fi + ')');
    btn.dataset.id = c.id;
    btn.dataset.search =
      (c.name_zh + ' ' + c.name_en + ' ' + c.year_label + ' ' + c.year + ' ' + c.family).toLowerCase();
    const mc = MATURITY_COLOR[c.maturity] || '#6a6a72';
    btn.innerHTML =
      '<span class="card-top">' +
        '<span class="card-year">' + esc(c.year_label) + '</span>' +
        '<span class="card-mat"><i class="mat-dot" style="background:' + mc +
          ';box-shadow:0 0 6px ' + mc + '"></i>' + esc(c.maturity) + '</span>' +
      '</span>' +
      '<span class="card-symbol">' + esc(symbols.get(c.id)) + '</span>' +
      '<span class="card-name">' + esc(c.name_zh) + '</span>' +
      '<span class="card-vars">' + c.variants.length + ' 变种</span>';
    btn.setAttribute('aria-label', c.name_zh + ' ' + c.name_en);
    btn.addEventListener('click', () => openDrawer(c));
    return btn;
  }

  renderTable();

  // family 图例
  $('#familyLegend').innerHTML = fams.map((f, i) =>
    '<span class="legend-item"><i class="legend-bar" style="--c:var(--fam-' + i + ')"></i>' +
    esc(f) + '</span>').join('');

  /* ---------- 搜索过滤 ---------- */
  $('#searchInput').addEventListener('input', (ev) => {
    const q = ev.target.value.trim().toLowerCase();
    document.querySelectorAll('.card').forEach((card) => {
      const hit = !q || card.dataset.search.includes(q);
      card.classList.toggle('dim', !hit);
      card.classList.toggle('hit', !!q && hit);
    });
  });

  /* ============================================================
     视图切换
     ============================================================ */
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      $('#viewPeriodic').classList.toggle('active', tab.dataset.view === 'periodic');
      $('#viewFormulas').classList.toggle('active', tab.dataset.view === 'formulas');
    });
  });

  /* ============================================================
     Drawer（二级：大类 + 变种列表）
     ============================================================ */
  const drawer = $('#drawer');
  const drawerMask = $('#drawerMask');
  const drawerInner = $('#drawerInner');
  let drawerCat = null;

  function openDrawer(c) {
    drawerCat = c;
    const fi = famIdx.get(c.family);
    drawerInner.innerHTML =
      '<button class="drawer-close" id="drawerClose" type="button">关闭 ESC</button>' +
      '<div class="d-kicker">' + esc(c.era) + ' · ' + esc(c.family) + ' · ' +
        esc(symbols.get(c.id)) + '</div>' +
      '<h2 class="d-title">' + esc(c.name_zh) + '</h2>' +
      '<div class="d-title-en">' + esc(c.name_en) + '</div>' +
      '<dl class="d-meta">' +
        '<dt>诞生 ORIGIN</dt><dd>' + esc(c.origin) + '</dd>' +
        '<dt>成熟度</dt><dd><i class="mat-dot" style="display:inline-block;width:8px;height:8px;background:' +
          (MATURITY_COLOR[c.maturity] || '#888') + ';box-shadow:0 0 6px ' +
          (MATURITY_COLOR[c.maturity] || '#888') + '"></i> ' + esc(c.maturity) + '</dd>' +
        '<dt>年份 YEAR</dt><dd>' + esc(c.year_label) + '</dd>' +
      '</dl>' +
      '<div class="d-tagline">' + esc(c.tagline) + '</div>' +
      '<p class="d-summary">' + esc(c.summary) + '</p>' +
      (c.sources && c.sources.length ?
        '<div class="d-sources"><h4>来源 SOURCES</h4><ul>' +
          c.sources.map((s) =>
            '<li><a href="' + esc(s) + '" target="_blank" rel="noopener">' + esc(s) + '</a></li>'
          ).join('') + '</ul></div>' : '') +
      '<div class="d-variants"><h4>变种分支 VARIANTS · ' + c.variants.length + '</h4>' +
        c.variants.map((v, i) =>
          '<button class="variant-item" type="button" data-vi="' + i + '" ' +
            'style="--fam:var(--fam-' + fi + ')">' +
            '<span class="v-head"><span class="v-year">' + esc(v.year) + '</span>' +
            '<span class="v-name">' + esc(v.name_zh) + '</span></span>' +
            '<div class="v-name-en">' + esc(v.name_en) + '</div>' +
            '<div class="v-diff">' + esc(v.diff) + '</div>' +
          '</button>'
        ).join('') +
      '</div>';

    drawer.hidden = false;
    drawerMask.hidden = false;
    drawer.classList.remove('closing');
    $('#drawerClose').addEventListener('click', closeDrawer);
    drawerInner.querySelectorAll('.variant-item').forEach((el) => {
      el.addEventListener('click', () => openModal(c, c.variants[+el.dataset.vi]));
    });
    $('#drawerClose').focus();
  }

  function closeDrawer() {
    drawer.classList.add('closing');
    drawerMask.hidden = true;
    setTimeout(() => { drawer.hidden = true; }, 220);
    drawerCat = null;
  }
  drawerMask.addEventListener('click', closeDrawer);

  /* ============================================================
     Modal（三级：变种详情 + SVG 流程图）
     ============================================================ */
  const modal = $('#modal');
  const modalPanel = $('#modalPanel');

  function openModal(c, v) {
    const fi = famIdx.get(c.family);
    modalPanel.innerHTML =
      '<div class="m-crumb"><b>' + esc(c.name_zh) + '</b> / ' + esc(c.name_en) +
        ' / ' + esc(c.era) + ' / ' + esc(c.family) + '</div>' +
      '<div class="m-title-row">' +
        '<h2 class="m-title">' + esc(v.name_zh) + '</h2>' +
        '<span class="m-title-en">' + esc(v.name_en) + '</span>' +
        '<span class="m-year">' + esc(v.year) + '</span>' +
      '</div>' +
      '<div class="m-section"><h3>流程概要 PROCESS FLOW</h3>' +
        '<div class="flow-wrap">' + flowSVG(v.flow) + '</div>' +
        '<div class="flow-legend">' +
          Object.keys(FLOW_KIND).map((k) => {
            const kd = FLOW_KIND[k];
            return '<span class="fl-item"><i class="' + (kd.dash ? 'fl-dash' : 'fl-chip') +
              '" style="--c:' + kd.c + '"></i>' + esc(kd.label) + '</span>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="m-section m-grid">' +
        '<div class="full"><h3>设计参数 PARAMETERS</h3>' +
          '<div class="params-block">' + esc(v.params) + '</div></div>' +
        '<div><h3>适用场景 APPLICATION</h3><p class="txt-block">' + esc(v.application) + '</p></div>' +
        '<div><h3>差异点 DIFF</h3><p class="txt-block">' + esc(v.diff) + '</p></div>' +
        '<div><h3>优点 PROS</h3><ul class="pc-list pros">' +
          (v.pros || []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></div>' +
        '<div><h3>缺点 CONS</h3><ul class="pc-list cons">' +
          (v.cons || []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul></div>' +
      '</div>' +
      '<button class="m-back" id="modalBack" type="button">◂ 返回变种列表</button>';

    modal.hidden = false;
    $('#modalBack').addEventListener('click', closeModal);
    $('#modalBack').focus();
  }

  function closeModal() { modal.hidden = true; }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  /* ---------- SVG 流程图（蛇形布局，每行最多 6 节点） ---------- */
  function flowSVG(flow) {
    if (!flow || !flow.length) return '<p class="txt-block">无流程数据</p>';
    const PER_ROW = 6, NW = 150, NH = 44, GAP = 30, RGAP = 52, PAD = 14;
    const rows = [];
    for (let i = 0; i < flow.length; i += PER_ROW) rows.push(flow.slice(i, i + PER_ROW));
    const W = PER_ROW * NW + (PER_ROW - 1) * GAP + PAD * 2;
    const H = rows.length * NH + (rows.length - 1) * RGAP + PAD * 2;

    const nodeXY = (gi) => {
      const r = Math.floor(gi / PER_ROW);
      const col = gi % PER_ROW;
      const cc = (r % 2 === 0) ? col : (rows[r].length - 1 - col); // 蛇形
      return { x: PAD + cc * (NW + GAP), y: PAD + r * (NH + RGAP) };
    };

    let defs = '<defs>';
    for (const k of Object.keys(FLOW_KIND)) {
      defs += '<marker id="ar-' + k + '" viewBox="0 0 10 10" refX="9" refY="5" ' +
        'markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
        '<path d="M0,0 L10,5 L0,10 z" fill="' + FLOW_KIND[k].c + '"/></marker>';
    }
    defs += '</defs>';

    let edges = '', nodes = '';
    for (let i = 0; i < flow.length; i++) {
      const st = flow[i];
      const kd = FLOW_KIND[st.k] || FLOW_KIND.w;
      const p = nodeXY(i);
      const cham = 9;
      // 切角矩形
      nodes += '<path d="M' + (p.x + cham) + ',' + p.y +
        ' H' + (p.x + NW - cham) + ' L' + (p.x + NW) + ',' + (p.y + cham) +
        ' V' + (p.y + NH - cham) + ' L' + (p.x + NW - cham) + ',' + (p.y + NH) +
        ' H' + (p.x + cham) + ' L' + p.x + ',' + (p.y + NH - cham) +
        ' V' + (p.y + cham) + ' Z" ' +
        'fill="#0d0d12" stroke="' + kd.c + '" stroke-width="1.6"/>';
      // 文本（长文本两行）
      const t = String(st.t);
      const cx = p.x + NW / 2, cy = p.y + NH / 2;
      if (t.length > 8 && t.length > 0) {
        const mid = Math.ceil(t.length / 2);
        nodes += '<text x="' + cx + '" y="' + (cy - 5) + '" text-anchor="middle" ' +
          'font-size="11" fill="#d8d8d0" font-family="inherit">' + esc(t.slice(0, mid)) + '</text>' +
          '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" ' +
          'font-size="11" fill="#d8d8d0" font-family="inherit">' + esc(t.slice(mid)) + '</text>';
      } else {
        nodes += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" ' +
          'font-size="11.5" fill="#d8d8d0" font-family="inherit">' + esc(t) + '</text>';
      }
      // 序号角标
      nodes += '<text x="' + (p.x + 7) + '" y="' + (p.y + 13) + '" font-size="8.5" ' +
        'fill="' + kd.c + '" font-family="inherit">' + String(i + 1).padStart(2, '0') + '</text>';

      // 连线（指向下一个节点，样式取下一节点的 k）
      if (i < flow.length - 1) {
        const nk = FLOW_KIND[flow[i + 1].k] || FLOW_KIND.w;
        const q = nodeXY(i + 1);
        const sameRow = Math.floor(i / PER_ROW) === Math.floor((i + 1) / PER_ROW);
        let d;
        if (sameRow) {
          const x1 = p.x + NW, y1 = p.y + NH / 2, x2 = q.x - 3, y2 = q.y + NH / 2;
          d = 'M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2;
        } else {
          // 跨行：从底部垂直向下再折到下一行端点
          const x1 = p.x + NW / 2, y1 = p.y + NH, x2 = q.x + NW / 2, y2 = q.y - 4;
          d = 'M' + x1 + ',' + y1 + ' L' + x1 + ',' + (y1 + RGAP / 2) +
              ' L' + x2 + ',' + (y1 + RGAP / 2) + ' L' + x2 + ',' + y2;
        }
        edges += '<path d="' + d + '" fill="none" stroke="' + nk.c + '" stroke-width="1.6" ' +
          (nk.dash ? 'stroke-dasharray="5,4" ' : '') +
          'marker-end="url(#ar-' + (flow[i + 1].k in FLOW_KIND ? flow[i + 1].k : 'w') + ')"/>';
      }
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" ' +
      'role="img" aria-label="工艺流程图">' + defs + edges + nodes + '</svg>';
  }

  /* ---------- Esc 关闭 ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    else if (!drawer.hidden) closeDrawer();
  });

  /* ============================================================
     公式手册
     ============================================================ */
  const fchapters = $('#fchapters');
  const flist = $('#flist');
  let activeCh = 0;

  function renderChapters() {
    fchapters.innerHTML = '';
    FORM.chapters.forEach((ch, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = i === activeCh ? 'active' : '';
      b.innerHTML = '<span class="ch-id">' + esc(ch.id) + '</span>' + esc(ch.title_zh);
      b.addEventListener('click', () => {
        activeCh = i;
        $('#formulaSearch').value = '';
        renderChapters();
        renderFormulas('');
      });
      fchapters.appendChild(b);
    });
  }

  function renderFormulas(q) {
    const ch = FORM.chapters[activeCh];
    const query = (q || '').trim().toLowerCase();
    let shown = 0;
    flist.innerHTML = '<div class="f-count">CHAPTER ' + esc(ch.id) + ' · ' + esc(ch.title_zh) +
      ' · <span id="fShown">' + ch.formulas.length + '</span>/' + ch.formulas.length + ' 条</div>';
    for (const f of ch.formulas) {
      const hay = (f.code + ' ' + f.name + ' ' + f.expr + ' ' +
        (f.symbols || []).map((s) => s.s + ' ' + s.d).join(' ')).toLowerCase();
      if (query && !hay.includes(query)) continue;
      shown++;
      const card = document.createElement('article');
      card.className = 'formula-card';
      card.innerHTML =
        '<div class="f-head"><span class="f-code">' + esc(f.code) + '</span>' +
          '<span class="f-name">' + esc(f.name) + '</span></div>' +
        '<div class="f-expr"><span class="f-expr-tag">公式</span>' + esc(f.expr) + '</div>' +
        (f.symbols && f.symbols.length ?
          '<table class="f-symbols"><thead><tr><th>符号</th><th>含义</th><th>单位</th></tr></thead>' +
          '<tbody>' + f.symbols.map((s) =>
            '<tr><td>' + esc(s.s) + '</td><td>' + esc(s.d) + '</td><td>' + esc(s.u) + '</td></tr>'
          ).join('') + '</tbody></table>' : '') +
        '<dl class="f-extra">' +
          (f.range ? '<dt>取值范围</dt><dd>' + esc(f.range) + '</dd>' : '') +
          (f.note ? '<dt>备注 NOTE</dt><dd>' + esc(f.note) + '</dd>' : '') +
        '</dl>';
      flist.appendChild(card);
    }
    const counter = $('#fShown');
    if (counter) counter.textContent = shown;
  }

  $('#formulaSearch').addEventListener('input', (e) => renderFormulas(e.target.value));
  renderChapters();
  renderFormulas('');

  console.log('[SLUDGE-TECH] 初始化完成 · eras=' + eras.length + ' fams=' + fams.length);

  /* ---------- 深链：#view=formulas / #cat=<id> / #var=<catId>:<varId> ---------- */
  (function deepLink() {
    const h = location.hash || '';
    const mView = h.match(/view=formulas/);
    if (mView) $('#tabFormulas').click();
    const mCat = h.match(/cat=([A-Za-z0-9-]+)/);
    const mVar = h.match(/var=([A-Za-z0-9-]+):([A-Za-z0-9-]+)/);
    if (mCat) {
      const c = cats.find((x) => x.id === mCat[1]);
      if (c) openDrawer(c);
    } else if (mVar) {
      const c = cats.find((x) => x.id === mVar[1]);
      if (!c) return;
      const v = c.variants.find((x) => x.id === mVar[2]);
      if (v) { openDrawer(c); openModal(c, v); }
    }
  })();
})();
