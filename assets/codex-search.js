/* ==========================================================
   Site search · a tiny information-retrieval engine
   Pipeline:  raw text → PREPROCESS → INDEX → RANK → results
   Every stage is one named function. To use your own Managing Semi-structured and Unstructured Data
   code, port it into the matching function and keep the same
   input and output types. Nothing else needs to change.
   Documents come from search-docs.js (window.SEARCH_DOCS),
   which build.py generates from the site's pages.
   ========================================================== */
(function () {
  'use strict';

  // ---------- 1. PREPROCESSING ----------
  // Same pipeline runs on documents AND on the query.
  // If they ever differ, query terms will not match index terms.

  const STOPWORDS = new Set(('a an and are as at be but by for from has have i if in into is it its ' +
    'me my no not of on or so than that the their them then there these they this to too ' +
    'was we were what when where which while who why will with you your').split(' '));

  // string -> string[]   lowercase, strip accents, split on anything that is not a letter or digit
  function tokenise(text) {
    return text.toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .match(/[a-z0-9]+(?:\+\+|#)?/g) || [];      // keeps c++ and c# as tokens
  }

  // string[] -> string[]
  function removeStopwords(tokens) {
    return tokens.filter(t => !STOPWORDS.has(t));
  }

  // string -> string   STAND-IN light suffix stripper. Replace with your Porter stemmer.
  function stem(t) {
    if (t.length <= 3) return t;
    for (const suf of ['ational', 'ization', 'ing', 'edly', 'ed', 'ies', 'es', 's']) {
      if (t.endsWith(suf) && t.length - suf.length >= 3) {
        return suf === 'ies' ? t.slice(0, -3) + 'y' : t.slice(0, -suf.length);
      }
    }
    return t;
  }

  // string -> string[]   the full pipeline
  function preprocess(text) {
    return removeStopwords(tokenise(text)).map(stem);
  }

  // ---------- 2. INDEXING ----------
  // Inverted index: term -> Map(docId -> weighted term frequency)
  // Title words count 3x so a match in a title outranks one in the body.
  const TITLE_WEIGHT = 3;

  function buildIndex(docs) {
    const postings = new Map();
    docs.forEach((doc, id) => {
      const add = (terms, w) => terms.forEach(term => {
        if (!postings.has(term)) postings.set(term, new Map());
        const p = postings.get(term);
        p.set(id, (p.get(id) || 0) + w);
      });
      add(preprocess(doc.title), TITLE_WEIGHT);
      add(preprocess(doc.text), 1);
    });
    return { postings, N: docs.length, terms: [...postings.keys()] };
  }

  // ---------- 3. RANKING ----------
  // TF-IDF:  score(d) = sum over query terms of  (1 + log tf) * log(N / df)
  // Swap this for BM25 if that is what your coursework used.
  function rank(index, queryTerms) {
    const scores = new Map();
    for (const term of queryTerms) {
      const p = index.postings.get(term);
      if (!p) continue;
      const idf = Math.log(1 + index.N / p.size);
      for (const [id, tf] of p) scores.set(id, (scores.get(id) || 0) + (1 + Math.log(tf)) * idf);
    }
    return [...scores].sort((a, b) => b[1] - a[1]);
  }

  // Search-as-you-type: the LAST word may be half typed, so expand it
  // to every index term that starts with it ("pool" -> pool, pooling...).
  function expandQuery(index, raw) {
    const terms = preprocess(raw);
    const words = tokenise(raw);
    const last = words[words.length - 1];
    if (last && !/\s$/.test(raw) && last.length >= 2) {
      index.terms.filter(t => t.startsWith(last)).slice(0, 12).forEach(t => terms.push(t));
    }
    return [...new Set(terms)];
  }

  // ---------- 4. UI ----------
  const docs = window.SEARCH_DOCS || [];
  const index = buildIndex(docs);
  const root = document.documentElement.dataset.root || '';

  function snippet(text, terms, len = 120) {
    const lower = text.toLowerCase();
    let at = -1;
    for (const t of terms) { at = lower.indexOf(t); if (at >= 0) break; }
    const start = Math.max(0, at - 30);
    return (start > 0 ? '…' : '') + text.slice(start, start + len).trim() + (text.length > start + len ? '…' : '');
  }

  document.querySelectorAll('[data-search]').forEach(box => {
    const input = box.querySelector('input');
    const list = box.querySelector('.search-results');
    const render = () => {
      const q = input.value.trim();
      if (!q) { list.hidden = true; list.innerHTML = ''; return; }
      const terms = expandQuery(index, q);
      const hits = rank(index, terms).slice(0, 8);
      list.hidden = false;
      list.innerHTML = hits.length ? hits.map(([id, score]) => {
        const d = docs[id];
        return `<a class="search-hit" href="${root}${d.url}">
          <span class="search-type">${d.type}</span>
          <span class="search-title">${d.title}</span>
          <span class="search-snip">${snippet(d.text, terms)}</span>
          <span class="search-score">${score.toFixed(2)}</span></a>`;
      }).join('') : `<p class="search-empty">No matches for “${q.replace(/</g, '&lt;')}”. Terms searched: ${terms.join(', ') || 'none (all stopwords)'}</p>`;
    };
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; render(); input.blur(); }
      if (e.key === 'Enter') { const first = list.querySelector('a'); if (first) first.click(); }
    });
    list.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a) return;
      const hash = a.getAttribute('href').split('#')[1];
      const target = hash && document.getElementById(hash);
      if (target) { e.preventDefault(); flash(target); input.value = ''; render(); }
    });
  });

  // "/" focuses the search, like GitHub
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      const i = document.querySelector('[data-search] input');
      if (i) { e.preventDefault(); i.focus(); }
    }
  });

  function flash(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
    history.replaceState(null, '', '#' + el.id);
  }

  // expose for testing in the console: CodexSearch.preprocess("Pooling enemies")
  window.CodexSearch = { tokenise, removeStopwords, stem, preprocess, buildIndex, rank, index };
})();
