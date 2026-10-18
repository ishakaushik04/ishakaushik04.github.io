/* Tiny helpers shared by the project pages. Without JS everything still reads (all panels visible, bars full). */
(function(){
  var root=document.documentElement; root.classList.add('js');

  // tabs: <div data-tabs> with .tab-list buttons and .tab-panel sections, matched by order
  document.querySelectorAll('[data-tabs]').forEach(function(box,n){
    var tabs=[].slice.call(box.querySelectorAll('.tab-list [role=tab]'));
    var panels=[].slice.call(box.querySelectorAll('.tab-panel'));
    tabs.forEach(function(t,i){
      t.id='t'+n+'-'+i; panels[i].id='p'+n+'-'+i;
      t.setAttribute('aria-controls',panels[i].id); panels[i].setAttribute('aria-labelledby',t.id);
      panels[i].setAttribute('role','tabpanel');
    });
    function show(i){
      tabs.forEach(function(t,j){t.setAttribute('aria-selected',j===i);t.tabIndex=j===i?0:-1;});
      panels.forEach(function(p,j){p.hidden=j!==i;});
    }
    tabs.forEach(function(t,i){
      t.addEventListener('click',function(){show(i)});
      t.addEventListener('keydown',function(e){
        var k=e.key,j=i;
        if(k==='ArrowRight')j=(i+1)%tabs.length; else if(k==='ArrowLeft')j=(i-1+tabs.length)%tabs.length; else return;
        e.preventDefault(); show(j); tabs[j].focus();
      });
    });
    show(0);
  });

  // bars grow when they scroll into view
  var bars=document.querySelectorAll('.bar');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.3});
    bars.forEach(function(b){io.observe(b)});
  } else bars.forEach(function(b){b.classList.add('in')});
})();
