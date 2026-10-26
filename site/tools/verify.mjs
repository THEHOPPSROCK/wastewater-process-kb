/* 无外部依赖：数值抽查 + 65 条公式与计算器浏览器回归。 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pc = require(path.join(root, 'js/calculator.js'));
const input = { ...pc.DEFAULTS, Kz: pc.kzAuto(pc.DEFAULTS.Qavg) };
const model = pc.calculate(input);
const near = (actual, expected, label, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${label}: ${actual} != ${expected}`);
  console.log(`[数值抽查] ${label}: ${actual.toFixed(4)} ✓`);
};

/* 独立手算/量纲抽查，不调用计算引擎中间值。 */
const Qmax = input.Kz * 50000 / 24;
const V = 20 * 50000 * 0.6 * (180 - 10) / 1000 / ((3500 / 1000 * 0.75) * (1 + 0.06 * 20));
const Yobs = 0.6 / (1 + 0.06 * 20);
const dXv = Yobs * 50000 * (180 - 10) / 1000;
const totalDS = (dXv - 50000 * 10 / 1000 * 0.75) / 0.75 + 0.6 * 50000 * (220 - 10) / 1000;
const AOR = 1.47 * 8500 - 1.42 * dXv + 4.57 * (1250 - 0.12 * dXv) - 2.86 * (1250 - 0.12 * dXv);
const gas = totalDS * 0.75 * 0.5 * 0.9;
near(model.summary.QmaxHour, Qmax, '最大时流量 m³/h');
near(model.summary.V, V, 'SRT 法生物池容积 m³');
near(model.summary.HRT, V / 50000 * 24, 'HRT = V/Q × 24 h');
near(model.summary.sludgeDS, totalDS, '干污泥量 kgDS/d');
near(model.summary.AOR, AOR, '碳化 + 硝化 − 反硝化需氧量 kgO₂/d');
near(model.summary.biogas, gas, '沼气 = DS × VS/DS × VS 降解率 × 产率');
near(model.summary.air, model.summary.SOR / (0.28 * 0.2) / 24, '风量量纲换算 m³/h');
near(model.sections[3].steps[4].value, 20, 'SRT 定义式回算 d');
assert.equal(model.sections.length, 10);
assert.equal(new Set(model.sections.flatMap(s => s.steps.map(x => x.code))).size > 20, true);
assert.ok(pc.calculate({ ...input, BOD: 40 }).warnings.some(w => w.title === '碳源不足'));
assert.ok(pc.calculate({ ...input, SRT: 2 }).warnings.some(w => w.title === '泥龄低于硝化最低值'));
assert.ok(pc.calculate({ ...input, alkalinity: 0 }).warnings.some(w => w.title === '碱度不足'));
assert.equal(pc.validate({ ...input, Qavg: NaN }).valid, false);

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = path.join(root, 'tools', '.chrome-verify');
fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(profile, { recursive: true });
const server = spawn(process.execPath, ['server.js', '--port', '7124'], { cwd: root, stdio: 'ignore' });
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=9224', `--user-data-dir=${profile}`, '--window-size=1600,1000',
  'about:blank',
], { cwd: root, stdio: 'ignore' });
let ws;
const errors = [];

async function waitFor(url) {
  for (let i = 0; i < 100; i++) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('等待服务超时: ' + url);
}

async function main() {
  await waitFor('http://127.0.0.1:7124/');
  await waitFor('http://127.0.0.1:9224/json/version');
  const targets = await (await fetch('http://127.0.0.1:9224/json/list')).json();
  const page = targets.find(t => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id; pending.set(next, { resolve, reject }); ws.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const shot = async (name) => {
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(root, 'tools', name), Buffer.from(image.data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:7124/#view=formulas' });
  await new Promise(resolve => setTimeout(resolve, 600));
  assert.equal(await evaluate(`document.getElementById('statCats').textContent`), '37');
  assert.equal(await evaluate(`document.getElementById('statVars').textContent`), '171');
  await evaluate(`document.querySelector('.intro-enter-button').click()`);
  await new Promise(resolve => setTimeout(resolve, 1250));
  assert.equal(await evaluate(`document.getElementById('intro-overlay') === null`), true);
  console.log('[入口与数据] Logo 开场可进入；37 大类 / 171 变种加载正确 ✓');

  const formulaReport = await evaluate(`(() => {
    const report = { count: 0, fallbacks: 0, raw: [], chapters: [] };
    const buttons = [...document.querySelectorAll('#fchapters button')];
    for (const button of buttons) {
      button.click();
      const cards = [...document.querySelectorAll('.formula-card')];
      report.chapters.push(cards.length); report.count += cards.length;
      report.fallbacks += document.querySelectorAll('.math-fallback').length;
      for (const card of cards) {
        const text = card.querySelector('.f-expr-body').textContent;
        if (/\\\\[A-Za-z]+/.test(text)) report.raw.push(card.dataset.code + ':' + text);
      }
    }
    return report;
  })()`);
  assert.equal(formulaReport.count, 65);
  assert.equal(formulaReport.fallbacks, 0);
  assert.deepEqual(formulaReport.raw, []);
  console.log('[公式覆盖] 65/65，无回退、无原始 LaTeX 反斜杠残留 ✓', formulaReport.chapters.join('/'));
  await evaluate(`document.querySelectorAll('#fchapters button')[2].click(); document.getElementById('flist').scrollTop=0;`);
  await shot('formulas-verify.png');

  await evaluate(`document.getElementById('tabCalculator').click()`);
  const initial = await evaluate(`({
    sections: document.querySelectorAll('.unit-section').length,
    details: document.querySelectorAll('.calc-details').length,
    closed: [...document.querySelectorAll('.calc-details')].every(d => !d.open),
    metrics: document.querySelectorAll('.builder-overview .overview-item').length,
    errors: document.getElementById('calcErrors').textContent,
    raw: /\\\\[A-Za-z]+/.test(document.getElementById('plantResults').textContent)
  })`);
  assert.deepEqual(initial, { sections: 10, details: 10, closed: true, metrics: 4, errors: '', raw: false });
  await evaluate(`document.querySelector('.calc-details').open = true`);
  assert.equal(await evaluate(`document.querySelector('.calc-details').open`), true);
  assert.ok(await evaluate(`document.querySelector('.calc-details .steps').children.length >= 3`));
  console.log('[计算器] 默认完成 10 单元；details 默认折叠且可展开 ✓');
  await shot('calculator-verify.png');

  await evaluate(`document.querySelector('.calc-details .step-code').click()`);
  const jump = await evaluate(`({tab:document.getElementById('tabFormulas').classList.contains('active'), highlight:document.querySelectorAll('.formula-card.f-highlight').length})`);
  assert.equal(jump.tab, true); assert.equal(jump.highlight, 1);
  console.log('[公式跳转] 步骤编号可定位并高亮手册条目 ✓');

  await evaluate(`document.getElementById('tabCalculator').click(); const q=document.getElementById('pc-Qavg'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true}));`);
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.ok(await evaluate(`document.getElementById('calcErrors').textContent.includes('Qavg')`));
  await evaluate(`document.getElementById('plantReset').click()`);
  assert.equal(await evaluate(`document.getElementById('calcErrors').textContent`), '');
  console.log('[输入校验] 非法输入明确报错，重置恢复且不崩溃 ✓');

  await evaluate(`const b=document.getElementById('pc-BOD'); b.value=40; b.dispatchEvent(new Event('input',{bubbles:true})); const a=document.getElementById('pc-alkalinity'); a.value=0; a.dispatchEvent(new Event('input',{bubbles:true}));`);
  await new Promise(resolve => setTimeout(resolve, 350));
  const warningText = await evaluate(`document.querySelector('.warnings').textContent`);
  assert.ok(warningText.includes('碳源不足')); assert.ok(warningText.includes('碱度不足'));
  await evaluate(`document.querySelector('[data-q="200000"]').click()`);
  assert.equal(await evaluate(`document.getElementById('pc-Qavg').value`), '200000');
  assert.equal(await evaluate(`document.getElementById('pc-Kz').value`), '1.5');
  await evaluate(`document.querySelector('[data-q="50000"]').click()`);
  console.log('[工程警示与预设] 碳源/碱度警示触发；20 万与 5 万预设及 Kz 自动取值正常 ✓');

  assert.deepEqual(errors, []);
  console.log('[浏览器] 无未捕获异常；截图已输出 ✓');
}

try { await main(); }
finally {
  if (ws) ws.close();
  chrome.kill('SIGTERM'); server.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 250));
  if (!chrome.killed) chrome.kill('SIGKILL');
  if (!server.killed) server.kill('SIGKILL');
  fs.rmSync(profile, { recursive: true, force: true });
}
