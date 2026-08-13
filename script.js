(function(){
  // ---- дорога с машиной ----
  var wrap = document.getElementById('roadWrap');
  var svg = document.getElementById('roadSvg');
  var path = document.getElementById('roadPath');
  var car = document.getElementById('car');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(wrap && svg && path && car && !reduceMotion){
    var len = path.getTotalLength();
    var ticking = false;

    function update(){
      ticking = false;
      var rect = wrap.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var progress = (vh * 0.55 - rect.top) / rect.height;
      progress = Math.max(0, Math.min(1, progress));

      var p1 = path.getPointAtLength(progress * len);
      var p2 = path.getPointAtLength(Math.min(len, progress * len + 1));
      var angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

      var ctm = svg.getScreenCTM();
      if(!ctm) return;
      var pt = svg.createSVGPoint();
      pt.x = p1.x; pt.y = p1.y;
      var screenPt = pt.matrixTransform(ctm);

      var x = screenPt.x - rect.left;
      var y = screenPt.y - rect.top;
      car.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + angle + 'deg)';
    }
    function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', update);
    update();
  }

  // ---- полноэкранный просмотр (лайтбокс) ----
  var lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML =
    '<button class="lightbox-close" aria-label="Закрыть">×</button>' +
    '<button class="lightbox-nav prev" aria-label="Назад">‹</button>' +
    '<div class="lightbox-content"></div>' +
    '<button class="lightbox-nav next" aria-label="Вперёд">›</button>';
  document.body.appendChild(lightbox);

  var lbContent = lightbox.querySelector('.lightbox-content');
  var lbPrev = lightbox.querySelector('.lightbox-nav.prev');
  var lbNext = lightbox.querySelector('.lightbox-nav.next');
  var lbClose = lightbox.querySelector('.lightbox-close');
  var lbList = [];
  var lbIndex = 0;

  function renderLightbox(){
    var url = lbList[lbIndex];
    lbContent.innerHTML = '';
    var el;
    if(/\.(mp4|webm|mov)$/i.test(url)){
      el = document.createElement('video');
      el.src = url; el.controls = true; el.playsInline = true; el.autoplay = true;
    } else {
      el = document.createElement('img');
      el.src = url; el.alt = '';
    }
    lbContent.appendChild(el);
    var multi = lbList.length > 1;
    lbPrev.style.display = multi ? 'flex' : 'none';
    lbNext.style.display = multi ? 'flex' : 'none';
  }

  function openLightbox(list, idx){
    lbList = list; lbIndex = idx;
    renderLightbox();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lightbox.classList.remove('open');
    lbContent.innerHTML = '';
    document.body.style.overflow = '';
  }
  function lbStep(dir){
    lbIndex = (lbIndex + dir + lbList.length) % lbList.length;
    renderLightbox();
  }

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', function(){ lbStep(-1); });
  lbNext.addEventListener('click', function(){ lbStep(1); });
  lightbox.addEventListener('click', function(e){ if(e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function(e){
    if(!lightbox.classList.contains('open')) return;
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowLeft') lbStep(-1);
    if(e.key === 'ArrowRight') lbStep(1);
  });
  (function(){
    var startX = null;
    lightbox.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; }, {passive:true});
    lightbox.addEventListener('touchend', function(e){
      if(startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if(Math.abs(dx) > 40){ lbStep(dx > 0 ? -1 : 1); }
      startX = null;
    }, {passive:true});
  })();

  // ---- галереи фото/видео (свайп + открытие в лайтбоксе) ----
  function probe(url){
    return new Promise(function(resolve){
      if(/\.(mp4|webm|mov)$/i.test(url)){
        var v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = function(){ resolve(true); };
        v.onerror = function(){ resolve(false); };
        v.src = url;
      } else {
        var img = new Image();
        img.onload = function(){ resolve(true); };
        img.onerror = function(){ resolve(false); };
        img.src = url;
      }
    });
  }

  function buildGallery(el){
    var folder = el.getAttribute('data-folder');
    if(!folder){
      var trip = el.getAttribute('data-trip');
      folder = 'images/trip' + trip + '/';
    }
    var candidates = [];
    for(var i = 1; i <= 6; i++){ candidates.push(folder + i + '.jpg'); }
    candidates.push(folder + 'video.mp4');

    Promise.all(candidates.map(function(url){
      return probe(url).then(function(ok){ return ok ? url : null; });
    })).then(function(results){
      var valid = results.filter(Boolean);
      if(valid.length === 0) return; // остаётся плейсхолдер

      var label = el.querySelector('.ph-label');
      if(label) label.remove();

      var track = el.querySelector('.gallery-track');
      var dotsWrap = el.querySelector('.gallery-dots');

      valid.forEach(function(url, idx){
        var slide = document.createElement('div');
        slide.className = 'slide';
        var mediaEl;
        if(/\.(mp4|webm|mov)$/i.test(url)){
          mediaEl = document.createElement('video');
          mediaEl.src = url; mediaEl.controls = true; mediaEl.playsInline = true; mediaEl.muted = true;
        } else {
          mediaEl = document.createElement('img');
          mediaEl.src = url; mediaEl.alt = '';
        }
        mediaEl.addEventListener('click', function(){ openLightbox(valid, idx); });
        slide.appendChild(mediaEl);
        track.appendChild(slide);

        var dot = document.createElement('span');
        dot.className = 'dot' + (idx === 0 ? ' active' : '');
        dotsWrap.appendChild(dot);
      });

      if(valid.length > 1){
        el.classList.add('has-multi');
        var dots = dotsWrap.querySelectorAll('.dot');

        function setActive(){
          var i = Math.round(track.scrollLeft / track.clientWidth);
          dots.forEach(function(d, idx){ d.classList.toggle('active', idx === i); });
        }
        track.addEventListener('scroll', function(){ requestAnimationFrame(setActive); }, {passive:true});

        el.querySelector('.gallery-nav.prev').addEventListener('click', function(){
          track.scrollBy({left: -track.clientWidth, behavior:'smooth'});
        });
        el.querySelector('.gallery-nav.next').addEventListener('click', function(){
          track.scrollBy({left: track.clientWidth, behavior:'smooth'});
        });
      }
    });
  }

  document.querySelectorAll('.gallery[data-trip], .gallery[data-folder]').forEach(buildGallery);

  // ---- фото "Обо мне" тоже открывается в лайтбоксе ----
  var aboutImg = document.querySelector('.about-photo img');
  if(aboutImg){
    aboutImg.style.cursor = 'zoom-in';
    aboutImg.addEventListener('click', function(){
      if(aboutImg.style.display !== 'none'){ openLightbox([aboutImg.getAttribute('src')], 0); }
    });
  }
})();
