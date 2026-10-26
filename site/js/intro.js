(() => {
  'use strict';

  const GATHER_AT = 1450;
  const GATHER_DURATION = 1550;
  const EXIT_DURATION = 1000;
  const DPR_LIMIT = 2;
  const COLORS = ['#00F0FF', '#FCEE0A', '#FFFFFF', '#FF003C'];
  const scriptURL = document.currentScript && document.currentScript.src;
  // 只使用纯图形符号（已预裁剪，不含集团中英文名称）
  const LOGO_URL = scriptURL
    ? new URL('../assets/shuihuan-symbol.svg', scriptURL).href
    : 'assets/shuihuan-symbol.svg';

  let overlay = null;
  let canvas = null;
  let ctx = null;
  let logoSource = null;
  let particles = [];
  let targets = [];
  let stars = [];
  let rafId = 0;
  let resizeTimer = 0;
  let exitTimer = 0;
  let width = 0;
  let height = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let gatherStart = 0;
  let exitStart = 0;
  let phase = 'boot';
  let destroyed = false;
  let isStatic = false;
  let logoBox = null;
  let logoAspect = 1081 / 1334;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function boot() {
    if (document.getElementById('intro-overlay')) return;

    try {
      overlay = document.createElement('div');
      overlay.id = 'intro-overlay';
      overlay.className = 'intro-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', '东莞水环集团污泥处理工艺知识库入口');
      overlay.innerHTML = `
        <canvas class="intro-canvas" aria-hidden="true"></canvas>
        <div class="intro-topline" aria-hidden="true">
          <span class="intro-system-mark">DGWEG // KNOWLEDGE GATE</span>
          <span class="intro-system-line"></span>
          <span class="intro-system-code">SLUDGE-TECH · 2077</span>
        </div>
        <button class="intro-skip" type="button" aria-label="跳过开场动画">跳过 <span>SKIP</span> <b>»</b></button>
        <div class="intro-logo-fallback" aria-hidden="true">
          <img class="intro-logo-image" alt="" draggable="false">
        </div>
        <div class="intro-entry-wrap">
          <div class="intro-entry-status" aria-live="polite">
            <span class="intro-status-dot"></span>
            <span class="intro-status-text">正在接入工艺知识库</span>
          </div>
          <button class="intro-enter-button" type="button" data-text="进入魔法世界">
            <span class="intro-button-cn">进入魔法世界</span>
            <span class="intro-button-en">ENTER THE MAGIC WORLD</span>
            <span class="intro-button-arrow" aria-hidden="true">↗</span>
          </button>
          <p class="intro-caption">东莞水环集团 · 污泥处理工艺知识库</p>
        </div>
        <div class="intro-corner intro-corner-left" aria-hidden="true"></div>
        <div class="intro-corner intro-corner-right" aria-hidden="true"></div>
      `;
      document.body.appendChild(overlay);

      canvas = overlay.querySelector('.intro-canvas');
      const fallbackImage = overlay.querySelector('.intro-logo-image');
      fallbackImage.src = LOGO_URL;
      fallbackImage.addEventListener('error', () => {
        if (overlay) overlay.classList.add('intro-no-image');
      });
      overlay.querySelector('.intro-enter-button').addEventListener('click', () => dismiss(true));
      overlay.querySelector('.intro-skip').addEventListener('click', () => dismiss(false));
      document.addEventListener('keydown', onKeydown);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('resize', onResize, { passive: true });

      updateLogoBox();
      ctx = canvas && canvas.getContext ? canvas.getContext('2d', { alpha: false }) : null;

      if (reducedMotion.matches || !ctx) {
        activateStatic(reducedMotion.matches ? '静态入口 · 减少动态效果' : '静态入口 · 当前设备不支持粒子画布');
        return;
      }

      logoSource = new Image();
      logoSource.onload = () => {
        if (destroyed || isStatic) return;
        try {
          updateLogoBox();
          resizeScene();
          overlay.classList.add('is-ready');
          setStatus('星河链路已连接');
          lastFrame = performance.now();
          rafId = requestAnimationFrame(frame);
        } catch (error) {
          activateStatic('静态入口 · 已切换兼容模式');
        }
      };
      logoSource.onerror = () => activateStatic('静态入口 · LOGO 资源未载入');
      logoSource.src = LOGO_URL;
    } catch (error) {
      // 开场只是增强体验：任何初始化异常都不能阻断主页面。
      cleanup();
    }
  }

  function setStatus(text) {
    if (!overlay) return;
    const status = overlay.querySelector('.intro-status-text');
    if (status) status.textContent = text;
  }

  function activateStatic(message) {
    if (!overlay || destroyed) return;
    isStatic = true;
    phase = 'static';
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    overlay.classList.add('is-static', 'is-formed', 'is-ready');
    setStatus(message || '静态入口已就绪');
    updateLogoBox();
  }

  function updateLogoBox() {
    if (!overlay) return;
    width = window.innerWidth || document.documentElement.clientWidth;
    height = window.innerHeight || document.documentElement.clientHeight;
    const compact = width < 700;
    const maxWidth = Math.min(width * (compact ? 0.72 : 0.42), compact ? 420 : 520);
    const maxHeight = height * (compact ? 0.4 : 0.46);
    const aspect = logoAspect;
    let logoWidth = maxWidth;
    let logoHeight = logoWidth / aspect;
    if (logoHeight > maxHeight) {
      logoHeight = maxHeight;
      logoWidth = logoHeight * aspect;
    }
    const centerY = height * (compact ? 0.36 : 0.395);
    logoBox = {
      x: (width - logoWidth) / 2,
      y: centerY - logoHeight / 2,
      width: logoWidth,
      height: logoHeight,
    };
    overlay.style.setProperty('--intro-logo-x', `${logoBox.x}px`);
    overlay.style.setProperty('--intro-logo-y', `${logoBox.y}px`);
    overlay.style.setProperty('--intro-logo-w', `${logoBox.width}px`);
    overlay.style.setProperty('--intro-logo-h', `${logoBox.height}px`);
  }

  function resizeScene() {
    if (!ctx || !canvas || !logoSource || !logoBox) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, width, height);

    sampleLogo();
    buildStars();
    buildParticles();

    if (phase === 'formed') overlay.classList.add('is-formed');
  }

  function sampleLogo() {
    const sampleWidth = Math.max(420, Math.min(900, Math.round(logoBox.width * 1.6)));
    const sampleHeight = Math.max(1, Math.round(sampleWidth / logoAspect));
    const buffer = document.createElement('canvas');
    buffer.width = sampleWidth;
    buffer.height = sampleHeight;
    const bufferCtx = buffer.getContext('2d', { willReadFrequently: true });
    if (!bufferCtx) throw new Error('Logo sampling canvas unavailable');
    bufferCtx.clearRect(0, 0, sampleWidth, sampleHeight);
    bufferCtx.drawImage(logoSource, 0, 0, sampleWidth, sampleHeight);
    const pixels = bufferCtx.getImageData(0, 0, sampleWidth, sampleHeight).data;
    targets = [];

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const alpha = pixels[(y * sampleWidth + x) * 4 + 3];
        if (alpha > 110) {
          targets.push({
            x: logoBox.x + ((x + Math.random()) / sampleWidth) * logoBox.width,
            y: logoBox.y + ((y + Math.random()) / sampleHeight) * logoBox.height,
          });
        }
      }
    }
    if (targets.length < 100) throw new Error('Logo alpha sampling returned too few points');
  }

  function buildStars() {
    const count = Math.min(150, Math.max(55, Math.round((width * height) / 13500)));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.88 ? 0.6 + Math.random() * 0.8 : 1.5 + Math.random(),
      alpha: 0.12 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0007 + Math.random() * 0.002,
      color: Math.random() < 0.8 ? '#FFFFFF' : '#00F0FF',
    }));
  }

  function particleColor() {
    const roll = Math.random();
    if (roll < 0.5) return COLORS[0];
    if (roll < 0.81) return COLORS[1];
    if (roll < 0.94) return COLORS[2];
    return COLORS[3];
  }

  function buildParticles() {
    const count = Math.max(6000, Math.min(12000, Math.round((width * height) / 140)));
    const oldParticles = particles;
    particles = Array.from({ length: count }, (_, index) => {
      const target = targets[(index * 37 + Math.floor(Math.random() * targets.length)) % targets.length];
      const old = oldParticles[index];
      const x = old ? Math.min(width + 40, Math.max(-40, old.x)) : Math.random() * width;
      const particle = {
        x,
        y: old ? old.y : height * 0.42,
        sx: x,
        sy: height * 0.42,
        tx: target.x,
        ty: target.y,
        ex: x,
        ey: height * 0.42,
        vx: 0,
        vy: 0,
        speed: 22 + Math.random() * 62,
        offset: (Math.random() + Math.random() + Math.random() - 1.5) * height * 0.13,
        phase: Math.random() * Math.PI * 2,
        size: 0.4 + Math.random() * 0.85,
        alpha: 0.5 + Math.random() * 0.48,
        color: particleColor(),
        arc: (Math.random() - 0.5) * Math.min(width, height) * 0.2,
        glow: index % 16 === 0,
      };
      if (phase === 'boot' || phase === 'galaxy') {
        particle.y = galaxyY(particle, particle.x);
      } else if (phase === 'formed') {
        particle.x = target.x;
        particle.y = target.y;
      }
      return particle;
    });
  }

  function galaxyY(particle, x) {
    const waveA = Math.sin((x / width) * Math.PI * 2.15 + elapsed * 0.00072 + particle.phase * 0.12);
    const waveB = Math.sin((x / width) * Math.PI * 4.4 - elapsed * 0.00038) * 0.28;
    return height * 0.405 + (waveA + waveB) * height * 0.105 + particle.offset;
  }

  function beginGather() {
    phase = 'gather';
    gatherStart = elapsed;
    particles.forEach((particle) => {
      particle.sx = particle.x;
      particle.sy = particle.y;
    });
    setStatus('粒子重组 · 集团标识同步中');
  }

  function beginExit() {
    phase = 'exit';
    exitStart = elapsed;
    const centerX = width / 2;
    const centerY = height * 0.4;
    particles.forEach((particle) => {
      const angle = Math.atan2(particle.y - centerY, particle.x - centerX) + (Math.random() - 0.5) * 0.45;
      const speed = 480 + Math.random() * 900;
      particle.ex = particle.x;
      particle.ey = particle.y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
    });
  }

  function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function drawStars() {
    ctx.globalCompositeOperation = 'source-over';
    for (const star of stars) {
      const twinkle = 0.58 + Math.sin(elapsed * star.speed + star.phase) * 0.42;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  function drawParticle(particle, alphaScale = 1) {
    const shimmer = 0.78 + Math.sin(elapsed * 0.004 + particle.phase) * 0.22;
    ctx.fillStyle = particle.color;
    if (particle.glow) {
      ctx.globalAlpha = particle.alpha * 0.09 * alphaScale;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = particle.alpha * shimmer * alphaScale;
    const size = particle.size;
    ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
  }

  function updateGalaxy(dt) {
    for (const particle of particles) {
      particle.x += particle.speed * dt;
      if (particle.x > width + 30) particle.x = -30;
      particle.y = galaxyY(particle, particle.x);
      drawParticle(particle, 0.88);
    }
  }

  function updateGather() {
    const raw = Math.min(1, (elapsed - gatherStart) / GATHER_DURATION);
    const eased = easeInOutCubic(raw);
    const arcStrength = Math.sin(Math.PI * eased) * (1 - eased * 0.45);
    for (const particle of particles) {
      particle.x = particle.sx + (particle.tx - particle.sx) * eased + particle.arc * arcStrength;
      particle.y = particle.sy + (particle.ty - particle.sy) * eased - particle.arc * arcStrength * 0.32;
      drawParticle(particle, 0.86 + eased * 0.14);
    }
    if (raw >= 1) {
      phase = 'formed';
      overlay.classList.add('is-formed');
      setStatus('标识同步完成 · 知识库入口已开放');
    }
  }

  function updateFormed() {
    // 低透明度实体底形：让 Logo 轮廓在细粒子之间仍然清晰可读。
    if (logoSource && logoBox) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.1;
      ctx.drawImage(logoSource, logoBox.x, logoBox.y, logoBox.width, logoBox.height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
    }
    for (const particle of particles) {
      particle.x = particle.tx + Math.sin(elapsed * 0.00135 + particle.phase) * 0.6;
      particle.y = particle.ty + Math.cos(elapsed * 0.0011 + particle.phase) * 0.45;
      const flash = Math.sin(elapsed * 0.006 + particle.phase * 8) > 0.985 ? 1.5 : 1;
      drawParticle(particle, flash);
    }
  }

  function updateExit(dt) {
    const progress = Math.min(1, (elapsed - exitStart) / EXIT_DURATION);
    for (const particle of particles) {
      particle.vx *= 1 + dt * 1.9;
      particle.vy *= 1 + dt * 1.9;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      drawParticle(particle, Math.max(0, 1 - progress * 1.15));
    }
  }

  function frame(now) {
    if (destroyed || isStatic || document.hidden) return;
    const rawDt = Math.max(0.001, (now - lastFrame) / 1000);
    const dt = Math.min(0.05, rawDt);
    lastFrame = now;
    // 相位时钟按真实时间推进（低帧率设备上动画不会变成慢动作）
    elapsed += Math.min(0.5, rawDt) * 1000;

    if (phase === 'boot') phase = 'galaxy';
    if (phase === 'galaxy' && elapsed >= GATHER_AT) beginGather();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = phase === 'formed' ? 'rgba(5,5,7,0.45)' : 'rgba(5,5,7,0.22)';
    ctx.fillRect(0, 0, width, height);
    drawStars();
    ctx.globalCompositeOperation = 'lighter';

    if (phase === 'galaxy') updateGalaxy(dt);
    else if (phase === 'gather') updateGather();
    else if (phase === 'formed') updateFormed();
    else if (phase === 'exit') updateExit(dt);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    rafId = requestAnimationFrame(frame);
  }

  function dismiss(scatter) {
    if (!overlay || destroyed || phase === 'exit') return;
    if (scatter && !isStatic && particles.length) beginExit();
    else phase = 'exiting';
    overlay.classList.add('is-leaving');
    setStatus('知识库已解锁');
    const delay = reducedMotion.matches ? 60 : (scatter ? 1080 : 980);
    exitTimer = window.setTimeout(cleanup, delay);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss(false);
    }
  }

  function onVisibilityChange() {
    if (destroyed || isStatic) return;
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (!rafId && phase !== 'exiting') {
      lastFrame = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  }

  function onResize() {
    if (destroyed || !overlay) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (destroyed) return;
      updateLogoBox();
      if (!isStatic && logoSource && logoSource.complete && logoSource.naturalWidth) {
        try {
          resizeScene();
        } catch (error) {
          activateStatic('静态入口 · 已切换兼容模式');
        }
      }
    }, 140);
  }

  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    window.clearTimeout(resizeTimer);
    window.clearTimeout(exitTimer);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', onResize);
    if (logoSource) {
      logoSource.onload = null;
      logoSource.onerror = null;
    }
    if (overlay) overlay.remove();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
    particles = [];
    targets = [];
    stars = [];
    logoSource = null;
    logoBox = null;
    ctx = null;
    canvas = null;
    overlay = null;
    rafId = 0;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  // 轻量诊断探针（只读，供自动化验证使用）
  window.__introDebug = () => ({ phase, elapsed: Math.round(elapsed), particles: particles.length, targets: targets.length, isStatic });
})();
