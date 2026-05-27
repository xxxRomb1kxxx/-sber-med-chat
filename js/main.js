document.addEventListener('click', e => {
  const btn = e.target.closest('.sbtn,.new-btn,.btn-s,.ce-btn,.qa-btn,.hbtn,.nav-btn,.bnav,.qbtn,.wl-cta,.kb-card,.d-card,.m-card');
  if (btn) ripple(btn, e.clientX, e.clientY);
});

initParticles();
renderKB();
