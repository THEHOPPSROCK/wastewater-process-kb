/* 主页面环境动效：稀疏漂浮微粒 + 随机电路线 + 指针互动
   自举、无依赖；画布固定在内容层之下，pointer-events:none */
(() => {
  'use strict';

  const DPR_LIMIT = 1.5;
  const LINK_DIST = 110;
  const POINTER_DIST = 140;
  const COLORS = [
    { c: '#00F0FF', w: 0.45 },
    { c: '#FCEE0A', w: 0.2 },
    { c: '#FFFFFF', w: 0.3 },
    { c: '#FF003C', w: 0.05 },
  ];

  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let particles = [];
  let circuits = [];
  let rafId = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let nextCircuit = 1200;
  let resizeTimer = 0;
  const pointer = { x: -9999, y: -9999, active: false };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function pickColor() {
    const roll = Math.random();
    let acc = 0;
    for (const item of COLORS) {
      acc += item.w;
      if (roll <= acc) return item.c;
    }
    return COLORS[0].c;
  }

  function boot() {
    if (reducedMotion.matches || document.getElementById('ambient-canvas')) return;
    canvas = document.createElement('canvas');
    canvas.id = 'ambient-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); canvas = null; return; }

    resize();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
    lastFrame = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(36, Math.min(90, Math.round((width * height) / 26000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 18,
      size: 0.8 + Math.random() * 1.0,
      alpha: 0.3 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      color: pickColor(),
    }));
    circuits = [];
  }

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 160);
  }

  function onPointerMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!rafId && ctx) {
      lastFrame = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  }

  // 随机折线电路：正交走线 + 端点焊盘 + 沿线脉冲
  function spawnCircuit() {
    const horizontalFirst = Math.random() < 0.5;
    const segments = [];
    let x = Math.random() * width;
    let y = Math.random() * height;
    let dirX = Math.random() < 0.5 ? -1 : 1;
    let dirY = Math.random() < 0.5 ? -1 : 1;
    const count = 3 + Math.floor(Math.random() * 3);
    let total = 0;
    for (let i = 0; i < count; i++) {
      const len = 40 + Math.random() * 130;
      const horizontal = horizontalFirst ? i % 2 === 0 : i % 2 === 1;
      const nx = horizontal ? x + len * dirX : x;
      const ny = horizontal ? y : y + len * dirY;
      segments.push({ x1: x, y1: y, x2: nx, y2: ny, start: total, len });
      total += len;
      x = nx; y = ny;
      if (horizontal) dirY *= Math.random() < 0.5 ? -1 : 1;
      else dirX *= Math.random() < 0.5 ? -1 : 1;
    }
    circuits.push({
      segments,
      total,
      born: elapsed,
      life: 5200 + Math.random() * 2600,
      color: Math.random() < 0.72 ? '#00F0FF' : '#FCEE0A',
    });
  }

  function drawCircuit(circuit) {
    const age = elapsed - circuit.born;
    const fade = Math.min(1, age / 700, (circuit.life - age) / 1100);
    if (fade <= 0) return;
    const baseAlpha = 0.24 * fade;
    ctx.strokeStyle = circuit.color;
    ctx.fillStyle = circuit.color;
    ctx.lineWidth = 1;
    for (const s of circuit.segments) {
      ctx.globalAlpha = baseAlpha;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      // 焊盘端点
      ctx.globalAlpha = baseAlpha * 1.8;
      ctx.fillRect(s.x2 - 1.5, s.y2 - 1.5, 3, 3);
    }
    // 沿线脉冲亮点
    const progress = (age / circuit.life) * circuit.total;
    for (const s of circuit.segments) {
      if (progress >= s.start && progress <= s.start + s.len) {
        const t = (progress - s.start) / s.len;
        const px = s.x1 + (s.x2 - s.x1) * t;
        const py = s.y1 + (s.y2 - s.y1) * t;
        ctx.globalAlpha = 0.8 * fade;
        ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
        ctx.globalAlpha = 0.18 * fade;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  function frame(now) {
    const rawDt = Math.max(0.001, (now - lastFrame) / 1000);
    const dt = Math.min(0.06, rawDt);
    lastFrame = now;
    elapsed += Math.min(0.5, rawDt) * 1000;

    ctx.clearRect(0, 0, width, height);

    // 随机电路生成与回收
    if (elapsed >= nextCircuit) {
      if (circuits.length < 5) spawnCircuit();
      nextCircuit = elapsed + 1200 + Math.random() * 1800;
    }
    circuits = circuits.filter((c) => elapsed - c.born < c.life);
    for (const circuit of circuits) drawCircuit(circuit);

    // 微粒漂移 + 指针轻斥力
    for (const p of particles) {
      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_DIST * POINTER_DIST && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = (1 - d / POINTER_DIST) * 26 * dt;
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
      // 限速，保持稀疏缓慢
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 16) { p.vx = (p.vx / speed) * 16; p.vy = (p.vy / speed) * 16; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
    }

    // 近邻星联线（极淡）
    ctx.lineWidth = 0.6;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const d = Math.sqrt(d2);
          ctx.globalAlpha = (1 - d / LINK_DIST) * 0.08;
          ctx.strokeStyle = '#00F0FF';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      if (pointer.active) {
        const dx = a.x - pointer.x;
        const dy = a.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < POINTER_DIST) {
          ctx.globalAlpha = (1 - d / POINTER_DIST) * 0.1;
          ctx.strokeStyle = '#FCEE0A';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      const twinkle = 0.7 + Math.sin(elapsed * 0.0012 + p.phase) * 0.3;
      ctx.globalAlpha = p.alpha * twinkle;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
