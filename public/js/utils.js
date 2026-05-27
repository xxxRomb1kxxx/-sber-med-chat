const sleep = ms => new Promise(r => setTimeout(r, ms));

function patientEmoji(age, gender) {
  const female = (gender || '').startsWith('Ж') || (gender || '') === 'Женщина';
  if (female) return (age || 30) <= 25 ? '👧' : (age || 30) <= 60 ? '👩' : '👵';
  return (age || 30) <= 25 ? '👦' : (age || 30) <= 60 ? '👨' : '👴';
}

const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nowT = () => new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
const scrollB = () => { const m = document.getElementById('msgs'); requestAnimationFrame(() => m.scrollTop = m.scrollHeight); };
const el = id => document.getElementById(id);

function showToast(msg) {
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

function launchConfetti(count = 90) {
  const container = document.getElementById('confetti-container');
  const colors = ['#21A038', '#4CB86A', '#FFD700', '#FF6B6B', '#5C9BD6', '#FF9800', '#E91E63', '#9C27B0'];
  for (let i = 0; i < count; i++) {
    const cf = document.createElement('div');
    cf.className = 'cf-piece';
    const size = 6 + Math.random() * 8;
    cf.style.cssText = `
      left:${Math.random() * 100}%;
      width:${size}px; height:${size * (1 + Math.random())}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${1.8 + Math.random() * 2.4}s;
      animation-delay:${Math.random() * .8}s;
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      opacity:${.7 + Math.random() * .3};
    `;
    container.appendChild(cf);
    cf.addEventListener('animationend', () => cf.remove());
  }
}

function countUp(el, target, suffix = '', duration = 900) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * ease) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateRing(svgEl, pct, color) {
  const r = 35, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  svgEl.innerHTML = `
    <circle class="sc-ring-bg"   cx="40" cy="40" r="${r}"/>
    <circle class="sc-ring-fill" cx="40" cy="40" r="${r}"
      stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/>`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    svgEl.querySelector('.sc-ring-fill').style.strokeDashoffset = offset;
  }));
}

function buildScoreCircle(pct, color, bgColor, label) {
  const r = 35, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return `<div class="sc-ring-wrap">
    <svg class="sc-ring-svg" viewBox="0 0 80 80">
      <circle class="sc-ring-bg"   cx="40" cy="40" r="${r}"/>
      <circle class="sc-ring-fill" cx="40" cy="40" r="${r}"
        stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
        style="transition:stroke-dashoffset .9s cubic-bezier(.34,1.1,.64,1)"/>
    </svg>
    <div class="sc-ring-inner">
      <div class="sc-n" style="color:${color};font-size:17px" data-target="${pct}" data-suffix="%">0%</div>
      <div class="sc-l">${label}</div>
    </div>
  </div>`;
}

function activateRings(container) {
  const r = 35, circ = 2 * Math.PI * r;
  container.querySelectorAll('.sc-ring-fill').forEach(ring => {
    const numEl = ring.closest('.sc-ring-wrap')?.querySelector('.sc-n');
    const target = numEl ? parseInt(numEl.dataset.target) : 0;
    const offset = circ - (target / 100) * circ;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ring.style.strokeDashoffset = offset;
      if (numEl) countUp(numEl, target, '%', 900);
    }));
  });
}

function initParticles() {
  const wrap = document.getElementById('wl-particles');
  if (!wrap) return;
  for (let i = 0; i < 18; i++) {
    const d = document.createElement('div');
    d.className = 'wl-dot';
    const size = 6 + Math.random() * 22;
    d.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%; top:${20 + Math.random() * 75}%;
      animation-duration:${3 + Math.random() * 5}s;
      animation-delay:${Math.random() * 4}s;
    `;
    wrap.appendChild(d);
  }
}

function ripple(btn, clientX, clientY) {
  const r = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = clientX - rect.left - size / 2;
  const y = clientY - rect.top - size / 2;
  r.className = 'ripple-fx';
  const bg = getComputedStyle(btn).backgroundColor;
  if (bg.includes('255,255,255') || bg.includes('247,248') || bg === 'rgba(0, 0, 0, 0)') {
    r.classList.add('dark');
  }
  r.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(r);
  r.addEventListener('animationend', () => r.remove());

}
