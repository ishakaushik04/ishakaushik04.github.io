// Project titles open in a panel over the homepage instead of a new page.
// Ctrl/Cmd/Shift-click and middle-click still open the page normally.
(() => {
  const wrap = document.getElementById('sheet');
  const frame = document.getElementById('sheet-frame');
  const closeBtn = document.getElementById('sheet-close');
  let opener = null;

  const onKey = e => {
    if (e.key === 'Escape' && wrap.classList.contains('open')) close();
  };

  function open(link) {
    opener = link;
    frame.title = link.textContent.trim();
    frame.src = link.href;
    wrap.classList.add('open');
    document.body.classList.add('locked');
    closeBtn.focus();
  }

  function close() {
    wrap.classList.remove('open');
    document.body.classList.remove('locked');
    frame.src = 'about:blank'; // stops the project's scripts when it is closed
    if (opener) opener.focus();
    opener = null;
  }

  document.querySelectorAll('a.proj-link').forEach(link => {
    link.addEventListener('click', e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(link);
    });
  });

  closeBtn.addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.addEventListener('keydown', onKey);
  // Escape should also work when focus is inside the project page
  frame.addEventListener('load', () => {
    try { frame.contentDocument.addEventListener('keydown', onKey); } catch (_) {}
  });
})();
