/* Tabbed code blocks: click or use the arrow keys to switch excerpts.
   Also adds light GDScript highlighting to <code class="gd">. */
(function () {
  'use strict';
  document.querySelectorAll('[data-tabs]').forEach(box => {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        box.querySelector('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        select(next); next.focus();
      });
    });
  });

  // Tiny highlighter: comments, strings, keywords, engine types. Text is already HTML-escaped.
  const KW = /\b(func|var|const|if|else|elif|for|in|not|and|or|return|extends|is|as|true|false|null|void)\b/g;
  const TY = /\b(AudioStreamPlayer|AudioStreamWAV|AudioStream|AudioServer|Array|Node|String|float|int|bool)\b/g;
  document.querySelectorAll('code.gd').forEach(code => {
    code.innerHTML = code.innerHTML.split('\n').map(line => {
      const hash = line.indexOf('#');
      let src = hash >= 0 ? line.slice(0, hash) : line;
      const cmt = hash >= 0 ? '<span class="cmt">' + line.slice(hash) + '</span>' : '';
      src = src.replace(/(&quot;[^&]*?&quot;)/g, '<span class="str">$1</span>')
               .replace(KW, '<span class="key">$1</span>')
               .replace(TY, '<span class="typ">$1</span>');
      return src + cmt;
    }).join('\n');
  });
})();
