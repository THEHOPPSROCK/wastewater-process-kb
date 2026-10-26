/* 轻量 LaTeX 子集渲染器：无依赖，失败时安全回退原文。 */
'use strict';

(function () {
  const GLYPHS = {
    cdot: '·', times: '×', pm: '±', mp: '∓', le: '≤', leq: '≤',
    ge: '≥', geq: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡',
    Rightarrow: '⇒', rightarrow: '→', Leftarrow: '⇐', infty: '∞',
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
    varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ',
    iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ',
    pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
    varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ',
    Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
    sum: '∑', prod: '∏', int: '∫', partial: '∂', nabla: '∇',
  };
  const UPRIGHT = new Set(['lg', 'ln', 'log', 'exp', 'min', 'max']);
  const SPACES = { ',': '0.18em', ';': '0.28em', ':': '0.22em', ' ': '0.34em' };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parse(source) {
    let pos = 0;

    function group(stop) {
      const atoms = [];
      while (pos < source.length) {
        const ch = source[pos];
        if (stop && ch === stop) { pos++; return atoms.join(''); }
        if (ch === '}') throw new Error('unexpected }');
        if (ch === '{') { pos++; atoms.push('<span class="mr-group">' + group('}') + '</span>'); continue; }
        if (ch === '\\') { atoms.push(command()); continue; }
        if (ch === '_' || ch === '^') {
          pos++;
          const script = argument();
          const cls = ch === '_' ? 'mr-sub' : 'mr-sup';
          const base = atoms.length ? atoms.pop() : '<span class="mr-char"></span>';
          atoms.push('<span class="mr-script"><span class="mr-base">' + base + '</span>' +
            '<span class="' + cls + '">' + script + '</span></span>');
          continue;
        }
        if (ch === '&') { pos++; atoms.push('<span class="mr-align"></span>'); continue; }
        pos++;
        atoms.push('<span class="mr-char">' + esc(ch) + '</span>');
      }
      if (stop) throw new Error('missing ' + stop);
      return atoms.join('');
    }

    function argument() {
      while (source[pos] === ' ') pos++;
      if (pos >= source.length) throw new Error('missing argument');
      if (source[pos] === '{') { pos++; return group('}'); }
      if (source[pos] === '\\') return command();
      const ch = source[pos++];
      if (ch === '_' || ch === '^' || ch === '}') throw new Error('invalid argument');
      return '<span class="mr-char">' + esc(ch) + '</span>';
    }

    function command() {
      pos++;
      if (pos >= source.length) throw new Error('trailing slash');
      if (Object.prototype.hasOwnProperty.call(SPACES, source[pos])) {
        const key = source[pos++];
        return '<span class="mr-space" style="width:' + SPACES[key] + '"></span>';
      }
      if (source[pos] === '!') { pos++; return '<span class="mr-negspace"></span>'; }
      if (source[pos] === '\\') { pos++; return '<span class="mr-break"></span>'; }
      if (source[pos] === '%' || source[pos] === '#' || source[pos] === '&') {
        return '<span class="mr-char">' + esc(source[pos++]) + '</span>';
      }
      const match = source.slice(pos).match(/^[A-Za-z]+/);
      if (!match) throw new Error('unknown control character');
      const name = match[0];
      pos += name.length;
      if (name === 'dfrac' || name === 'frac' || name === 'tfrac') {
        const numerator = argument();
        const denominator = argument();
        return '<span class="mr-frac"><span class="mr-num">' + numerator + '</span>' +
          '<span class="mr-den">' + denominator + '</span></span>';
      }
      if (name === 'sqrt') {
        const radicand = argument();
        return '<span class="mr-sqrt"><span class="mr-radical">√</span>' +
          '<span class="mr-radicand">' + radicand + '</span></span>';
      }
      if (name === 'mathrm' || name === 'text' || name === 'mbox' || name === 'operatorname') {
        return '<span class="mr-upright">' + argument() + '</span>';
      }
      if (name === 'left' || name === 'right') {
        while (source[pos] === ' ') pos++;
        if (source[pos] === '\\') return command();
        if (pos >= source.length) throw new Error('missing delimiter');
        return '<span class="mr-delim">' + esc(source[pos++]) + '</span>';
      }
      if (name === 'quad' || name === 'qquad') {
        return '<span class="mr-space" style="width:' + (name === 'quad' ? '1em' : '2em') + '"></span>';
      }
      if (Object.prototype.hasOwnProperty.call(GLYPHS, name)) {
        return '<span class="mr-glyph">' + GLYPHS[name] + '</span>';
      }
      if (UPRIGHT.has(name)) return '<span class="mr-upright">' + name + '</span>';
      throw new Error('unsupported command: ' + name);
    }

    return group('');
  }

  function render(expression) {
    const raw = String(expression == null ? '' : expression);
    try {
      return '<span class="math-render">' + parse(raw) + '</span>';
    } catch (error) {
      return '<code class="math-fallback" title="公式原文（未解析）">' + esc(raw) + '</code>';
    }
  }

  function renderLines(expression) {
    return String(expression == null ? '' : expression).split(/\r?\n/)
      .map((line) => '<div class="math-line">' + render(line) + '</div>').join('');
  }

  window.MathRender = Object.freeze({ render, renderLines });
})();
