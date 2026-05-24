// External links open in new tab
document.querySelectorAll('a[href^="http"]').forEach(link => {
  if (!link.hasAttribute('target')) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
});
