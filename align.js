/* «Встанет на место»: груз на стропах подплывает к разметке фундамента и садится ровно по осям, пока блок проходит экран.
   Идея выравнивания – из блока «Shattered Title Assembly» (21st.dev): всё мимо, а в один момент строго по сетке. */
(function () {
  var sec = document.querySelector('.align'); if (!sec) return;
  var load = sec.querySelector('.align__load'), rope = sec.querySelector('.align__rope');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function frame() {
    var r = sec.getBoundingClientRect(), vh = innerHeight;
    var p = still ? 1 : Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height * .55 + vh * .1)));
    var e = ease(Math.min(1, p / .85)), k = 1 - e;
    var sway = Math.sin(p * 11) * k * 14;
    var dx = -230 * k + sway, dy = -190 * k, rot = -8 * k + sway * .15;
    load.setAttribute('transform', 'translate(' + dx.toFixed(1) + ' ' + dy.toFixed(1) + ') rotate(' + rot.toFixed(2) + ' 450 250)');
    rope.setAttribute('d', 'M450 -40 L' + (450 + dx).toFixed(1) + ' ' + (150 + dy).toFixed(1));
    sec.classList.toggle('is-set', p > .9);
  }
  if (!still) { addEventListener('scroll', frame, { passive: true }); addEventListener('resize', frame); }
  frame();
})();
