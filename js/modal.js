function openModal() {
  el('dGrid').innerHTML = DISEASES.map((d, i) => `
    <div class="d-card ${i === 0 ? 'sel' : ''}" data-key="${d.key}" onclick="selD(this)">
      <div class="d-icon">${d.icon}</div><div class="d-name">${d.name}</div><div class="d-desc">${d.desc}</div>
    </div>`).join('');
  document.querySelectorAll('.m-card').forEach(c => c.classList.remove('sel'));
  document.querySelector('.m-card[data-mode="training"]').classList.add('sel');
  el('diseaseSection').style.display = '';
  el('controlNote').style.display = 'none';
  el('modalSub').textContent = 'Выберите заболевание и режим';
  el('overlay').classList.add('on'); closeSB();
}

function closeModal() { el('overlay').classList.remove('on'); }

function overlayClick(e) { if (e.target === el('overlay')) closeModal(); }

function selD(el2) {
  document.querySelectorAll('.d-card').forEach(c => c.classList.remove('sel'));
  el2.classList.add('sel');
}

function selMode(el2) {
  document.querySelectorAll('.m-card').forEach(c => c.classList.remove('sel'));
  el2.classList.add('sel');
  const isControl = el2.dataset.mode === 'control';
  el('diseaseSection').style.display = isControl ? 'none' : '';
  el('controlNote').style.display   = isControl ? 'block' : 'none';
  el('modalSub').textContent = isControl
    ? 'Режим контроля — болезнь неизвестна заранее'
    : 'Выберите заболевание и режим';
}
