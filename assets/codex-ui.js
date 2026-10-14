/* Codex "you are here": highlights the letter you are currently reading
   in every element marked data-az="X". Works for all three layouts. */
(function () {
  'use strict';
  const groups = [...document.querySelectorAll('[data-letter]')];
  const marks = [...document.querySelectorAll('[data-az]')];
  const here = document.querySelector('[data-here]');
  if (!groups.length) return;

  function setActive(letter) {
    marks.forEach(m => {
      const on = m.dataset.az === letter;
      m.classList.toggle('active', on);
      // on phones the letter strip scrolls sideways: keep the current letter in view
      const strip = m.parentElement;
      if (on && strip.scrollWidth > strip.clientWidth) {
        strip.scrollLeft = m.offsetLeft - strip.clientWidth / 2;
      }
    });
    if (here) {
      const g = groups.findIndex(x => x.dataset.letter === letter);
      here.textContent = `${letter} · ${g + 1} of ${groups.length} letters`;
    }
  }

  // A letter becomes "current" when its group crosses a line 25% down the screen.
  function update() {
    const line = window.innerHeight * 0.25;
    let current = groups[0];
    for (const g of groups) { if (g.getBoundingClientRect().top <= line) current = g; else break; }
    setActive(current.dataset.letter);
  }
  // ---- View switch: Rail / Spine / Ledger, remembered per visitor ----
  const codex = document.querySelector('[data-codex]');
  const buttons = [...document.querySelectorAll('[data-view]')];
  function setView(view) {
    if (!codex || !buttons.some(b => b.dataset.view === view)) return;
    codex.classList.remove('view-rail', 'view-spine', 'view-ledger');
    codex.classList.add('view-' + view);
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    try { localStorage.setItem('codex-view', view); } catch (e) { /* storage blocked: still works, just not remembered */ }
    update();
  }
  buttons.forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  try { const saved = localStorage.getItem('codex-view'); if (saved) setView(saved); } catch (e) {}

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(() => { update(); ticking = false; }); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
