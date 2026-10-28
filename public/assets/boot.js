/* Runs in <head>, before the first paint. It picks the homepage layout up front, so nothing jumps when home.js
   and the scene load: "js" always, plus "door" when the scroll story will run (motion allowed, canvas available).
   With "door", site.css reserves the story's full height at once, so links to #work, #start and #close land
   where they should. home.js removes "door" again if the scene can't load, which brings back the still layout. */
(() => {
  const d = document.documentElement; d.classList.add('js');
  let calm = false; try { calm = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* old browser: treat as motion allowed */ }
  const canvas = !!document.createElement('canvas').getContext;
  if (!calm && canvas) d.classList.add('door');
})();
