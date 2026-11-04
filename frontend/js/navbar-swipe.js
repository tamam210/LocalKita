(function(){
  'use strict';
  function init(){
    var swipes = document.querySelectorAll('.nav-swipe');
    swipes.forEach(function(wrap){
      var active = wrap.querySelector('.nav-daftar a[aria-current="page"]');
      if(active){
        try {
          active.scrollIntoView({ inline: 'center', block: 'nearest' });
        } catch(e){
          // fallback
          var left = active.offsetLeft - wrap.clientWidth/2 + active.clientWidth/2;
          if(left > 0) wrap.scrollLeft = left;
        }
      }
      // enable horizontal scroll with mouse drag lightly
      var isDown=false,startX,scrollLeft;
      wrap.addEventListener('mousedown',function(e){
        isDown=true; wrap.classList.add('dragging'); startX=e.pageX - wrap.offsetLeft; scrollLeft=wrap.scrollLeft;
      });
      wrap.addEventListener('mouseleave',function(){isDown=false; wrap.classList.remove('dragging');});
      wrap.addEventListener('mouseup',function(){isDown=false; wrap.classList.remove('dragging');});
      wrap.addEventListener('mousemove',function(e){
        if(!isDown)return; e.preventDefault();
        var x=e.pageX-wrap.offsetLeft; var walk=(x-startX)*1.2; wrap.scrollLeft=scrollLeft-walk;
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();