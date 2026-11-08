/*!
 * WebP 悬浮桌宠 · 单文件脚本版
 * 支持 data-images / data-manifest / data-dir 三种方式
 * 支持 data-size-mobile / data-size-pc 按设备自适应尺寸
 */
(function () {
  'use strict';

  if (window.WebpPet && window.WebpPet.__loaded) return;

  const scriptEl = document.currentScript;

  /* ================================================================
     1. 配置
     ================================================================ */
  const DEFAULTS = {
    images: null,
    dir: null,
    manifest: null,
    manifestNames: ['manifest.json'],

    size: 160,          // 基础尺寸
    sizePc: null,       // 电脑端尺寸（覆盖 size）
    sizeMobile: null,   // 移动端尺寸（覆盖 size）

    margin: 36,
    zIndex: 2147483647,
    start: 'br',
    showTip: true,
    tipText: '拖拽宠物可以移动 · 单击更换一个动作',
    tipDuration: 10000,
    autoSwitch: 0,
    switchFade: true
  };

  function readDataset() {
    if (!scriptEl || !scriptEl.dataset) return {};
    const d = scriptEl.dataset, out = {};
    if (d.images) {
      out.images = d.images.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (d.dir)         out.dir         = d.dir;
    if (d.manifest)    out.manifest    = d.manifest;

    if (d.size)        out.size        = parseInt(d.size, 10);
    if (d.sizePc || d.sizepc)
      out.sizePc = parseInt(d.sizePc || d.sizepc, 10);
    if (d.sizeMobile || d.sizemobile)
      out.sizeMobile = parseInt(d.sizeMobile || d.sizemobile, 10);

    if (d.margin)      out.margin      = parseInt(d.margin, 10);
    if (d.start)       out.start       = d.start;
    if (d.zindex)      out.zIndex      = parseInt(d.zindex, 10);
    if (d.tip === 'false') out.showTip = false;
    if (d.tiptext)     out.tipText     = d.tiptext;
    if (d.tipduration) out.tipDuration = parseInt(d.tipduration, 10);
    if (d.autoswitch)  out.autoSwitch  = parseInt(d.autoswitch, 10);
    return out;
  }

  const CFG = Object.assign({}, DEFAULTS, window.WebpPetConfig || {}, readDataset());

  /* ================================================================
     2. 设备检测 & 尺寸解析
     ================================================================ */
  function detectMobile() {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
        return true;
      }
    } catch (e) {}

    if (navigator.maxTouchPoints > 0 && window.innerWidth < 1024) {
      return true;
    }
    return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS|Windows Phone|Silk/i
      .test(navigator.userAgent);
  }

  function resolveSize() {
    const mobile = detectMobile();
    let size = CFG.size;

    if (mobile && CFG.sizeMobile != null) size = CFG.sizeMobile;
    else if (!mobile && CFG.sizePc != null) size = CFG.sizePc;

    size = parseInt(size, 10);
    return (size > 0 ? size : 170);
  }

  /* ================================================================
     3. 路径 & 列表加载
     ================================================================ */
  function toAbs(p, base) {
    if (!p) return p;
    if (/^(https?:|data:|blob:)/i.test(p)) return p;  // 已经是绝对路径
    try {
      if (base) return new URL(p, new URL(base, location.href)).href;
      return new URL(p, location.href).href;
    } catch (e) { return p; }
  }

  function extractWebpFromHtml(html, base) {
    const set = new Set();
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href === '../' || href === './') return;
        if (!/\.webp(?:\?|#|$)/i.test(href)) return;
        set.add(toAbs(href, base));
      });
    } catch (e) {}

    if (!set.size) {
      const re = /href=["']([^"']+\.webp(?:\?[^"']*)?)["']/gi;
      let m;
      while ((m = re.exec(html))) set.add(toAbs(m[1], base));
    }
    return Array.from(set);
  }

  async function fetchManifest(url) {
    const abs = toAbs(url, null);
    const res = await fetch(abs, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const arr = Array.isArray(data) ? data
              : (data && Array.isArray(data.images) ? data.images : null);
    if (!arr) throw new Error('manifest 格式应为 ["a.webp"] 或 {"images":[...]}');
    return arr.filter(x => typeof x === 'string' && x.length);
  }

  async function loadImageList() {
    if (CFG.images && CFG.images.length) {
      return CFG.images.map(p => toAbs(p, null));
    }

    if (CFG.manifest) {
      const list = await fetchManifest(CFG.manifest);
      if (list.length) {
        const base = new URL(CFG.manifest, location.href).href.replace(/[^/]*$/, '');
        return list.map(p => toAbs(p, base));
      }
      throw new Error('manifest 为空: ' + CFG.manifest);
    }

    if (CFG.dir) {
      const base = CFG.dir.endsWith('/') ? CFG.dir : CFG.dir + '/';

      for (const name of CFG.manifestNames) {
        try {
          const list = await fetchManifest(base + name);
          if (list.length) return list.map(p => toAbs(p, base));
        } catch (e) {}
      }

      try {
        const res = await fetch(base, { cache: 'no-cache' });
        if (res.ok) {
          const html = await res.text();
          const urls = extractWebpFromHtml(html, base);
          if (urls.length) return urls;
        }
      } catch (e) {}

      throw new Error(
        '无法从目录 ' + base + ' 获取图片列表。\n' +
        '请在目录内放一个 manifest.json，或让服务器开启目录索引'
      );
    }

    throw new Error('未配置图片来源：请使用 data-images / data-manifest / data-dir 之一');
  }

  /* ================================================================
     4. 样式注入
     ================================================================ */
  function injectCSS(size) {
    const css = [
      '.webp-pet-root{',
        'position:fixed;left:0;top:0;',
        'width:' + size + 'px;height:' + size + 'px;',
        'z-index:' + CFG.zIndex + ';',
        'cursor:grab;touch-action:none;',
        'user-select:none;-webkit-user-select:none;',
        '-webkit-tap-highlight-color:transparent;',
        'will-change:transform;opacity:0;',
        'transform:translate3d(0,0,0);',
        'transition:opacity .35s ease;',
      '}',
      '.webp-pet-root.is-ready{opacity:1;}',
      '.webp-pet-root.is-grabbing{cursor:grabbing;}',
      '.webp-pet-root>img{',
        'display:block!important;',
        'width:100%!important;height:100%!important;',
        'max-width:none!important;max-height:none!important;',
        'object-fit:contain;',
        'pointer-events:none;-webkit-user-drag:none;user-select:none;',
        'filter:drop-shadow(0 8px 12px rgba(0,0,0,.18));',
        'transition:opacity .22s ease,filter .25s ease;',
      '}',
      '.webp-pet-root.is-switching>img{opacity:0;}',
      '.webp-pet-root:hover>img{',
        'filter:drop-shadow(0 10px 16px rgba(0,0,0,.24)) brightness(1.03);',
      '}',
      '.webp-pet-tip{',
        'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);',
        'padding:10px 24px;border-radius:999px;',
        'background:rgba(255,255,255,.72);',
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
        'color:#555;font-size:14px;letter-spacing:.5px;white-space:nowrap;',
        'box-shadow:0 6px 20px rgba(150,150,180,.22);pointer-events:none;',
        'z-index:' + CFG.zIndex + ';',
        'animation:webp-pet-tip-fade ' + CFG.tipDuration + 'ms ease forwards;',
      '}',
      '@keyframes webp-pet-tip-fade{',
        '0%,65%{opacity:1;}100%{opacity:0;visibility:hidden;}',
      '}'
    ].join('');

    const style = document.createElement('style');
    style.id = 'webp-pet-style';
    style.textContent = css;
    document.head.appendChild(style);
    return style;
  }

  /* ================================================================
     5. 主体
     ================================================================ */
  function init() {
    if (!CFG.images && !CFG.dir && !CFG.manifest) {
      console.warn('[WebpPet] 未配置图片来源');
      return;
    }

    /* ---- ★ 关键：解析当前设备尺寸 ---- */
    const SIZE = resolveSize();   // 移动 160 / 电脑 320
    const IS_MOBILE = detectMobile();
    console.log('[WebpPet] 设备：' + (IS_MOBILE ? '移动端' : '电脑端') + ' · 尺寸：' + SIZE + 'px');

    const styleEl = injectCSS(SIZE);

    /* ---- DOM ---- */
    const root = document.createElement('div');
    root.className = 'webp-pet-root';
    root.id = 'webp-pet-root';

    const img = document.createElement('img');
    img.alt = '桌宠';
    img.draggable = false;
    root.appendChild(img);
    document.body.appendChild(root);

    /* ---- 提示 ---- */
    let tipEl = null;
    if (CFG.showTip) {
      tipEl = document.createElement('div');
      tipEl.className = 'webp-pet-tip';
      tipEl.textContent = CFG.tipText;
      document.body.appendChild(tipEl);
      setTimeout(function () {
        if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
        tipEl = null;
      }, CFG.tipDuration + 200);
    }

    /* ---- 位置 ---- */
    const pos = { x: 0, y: 0 };

    function applyPos() {
      root.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)';
    }
    function clampPos() {
      const maxX = Math.max(0, window.innerWidth  - SIZE);
      const maxY = Math.max(0, window.innerHeight - SIZE);
      pos.x = Math.min(Math.max(pos.x, 0), maxX);
      pos.y = Math.min(Math.max(pos.y, 0), maxY);
    }
    (function initPos() {
      const m = CFG.margin;
      const vw = window.innerWidth, vh = window.innerHeight;
      if (CFG.start === 'bl')      { pos.x = m;          pos.y = vh - SIZE - m; }
      else if (CFG.start === 'tr') { pos.x = vw - SIZE - m; pos.y = m; }
      else if (CFG.start === 'tl') { pos.x = m;          pos.y = m; }
      else                         { pos.x = vw - SIZE - m; pos.y = vh - SIZE - m; }
      clampPos();
      applyPos();
    })();

    /* ---- 播放状态 ---- */
    let list = [];
    let currentIdx = -1;
    let autoTimer = null;
    let destroyed = false;

    function pickIndex(exclude) {
      const n = list.length;
      if (n <= 1) return 0;
      let i;
      do { i = Math.floor(Math.random() * n); } while (i === exclude);
      return i;
    }

    function switchImage() {
      if (list.length <= 1) return;
      const next = pickIndex(currentIdx);

      if (!CFG.switchFade) {
        currentIdx = next;
        img.src = list[next];
        return;
      }

      root.classList.add('is-switching');
      let done = false;
      const finish = function () {
        if (done || destroyed) return;
        done = true;
        currentIdx = next;
        img.src = list[next];
        requestAnimationFrame(function () {
          root.classList.remove('is-switching');
        });
      };
      const pre = new Image();
      pre.onload = finish;
      pre.onerror = finish;
      pre.src = list[next];
      setTimeout(finish, 500);
    }

    function startAuto() {
      stopAuto();
      if (!CFG.autoSwitch || CFG.autoSwitch <= 0) return;
      if (list.length <= 1) return;
      autoTimer = setInterval(switchImage, CFG.autoSwitch);
    }
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    /* ---- 拖拽 / 点击 ---- */
    let dragging = false, didMove = false;
    let grabDX = 0, grabDY = 0, downX = 0, downY = 0;

    root.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      didMove = false;
      downX = e.clientX;
      downY = e.clientY;

      const rect = root.getBoundingClientRect();
      grabDX = e.clientX - rect.left;
      grabDY = e.clientY - rect.top;

      root.classList.add('is-grabbing');
      if (root.setPointerCapture) {
        try { root.setPointerCapture(e.pointerId); } catch (err) {}
      }
      stopAuto();
      e.preventDefault();
    });

    root.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - downX) > 3 || Math.abs(e.clientY - downY) > 3) {
        didMove = true;
      }
      pos.x = e.clientX - grabDX;
      pos.y = e.clientY - grabDY;
      clampPos();
      applyPos();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      root.classList.remove('is-grabbing');

      if (root.releasePointerCapture && root.hasPointerCapture &&
          root.hasPointerCapture(e.pointerId)) {
        try { root.releasePointerCapture(e.pointerId); } catch (err) {}
      }

      if (!didMove) switchImage();
      startAuto();
    }
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);
    root.addEventListener('dragstart',   function (e) { e.preventDefault(); });
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('resize', function () { clampPos(); applyPos(); });

    /* ---- 加载列表并启动 ---- */
    let readyResolve;
    const readyPromise = new Promise(r => { readyResolve = r; });

    loadImageList().then(function (urls) {
      if (destroyed) return;
      if (!urls || !urls.length) throw new Error('图片列表为空');

      list = urls;
      currentIdx = -1;

      const first = list[Math.floor(Math.random() * list.length)];
      return new Promise(function (resolve) {
        const pre = new Image();
        let done = false;
        const ok = function () {
          if (done) return;
          done = true;
          currentIdx = list.indexOf(first);
          img.src = first;
          resolve();
        };
        pre.onload = ok;
        pre.onerror = ok;
        setTimeout(ok, 1500);
        pre.src = first;
      });
    }).then(function () {
      if (destroyed) return;
      root.classList.add('is-ready');
      startAuto();
      readyResolve(WebpPet);
      console.log('[WebpPet] 已加载 ' + list.length + ' 张 WebP');
      window.dispatchEvent(new CustomEvent('webp-pet:ready', {
        detail: { count: list.length, images: list.slice(), size: SIZE, mobile: IS_MOBILE }
      }));
    }).catch(function (err) {
      console.error('[WebpPet] 初始化失败：', err);
      readyResolve(null);
      window.dispatchEvent(new CustomEvent('webp-pet:error', { detail: err }));
    });

    /* ---- API ---- */
    const WebpPet = {
      __loaded: true,
      el: root,
      img: img,
      ready: readyPromise,
      size: SIZE,
      isMobile: IS_MOBILE,

      get index()  { return currentIdx; },
      get images() { return list.slice(); },

      next: switchImage,

      show: function (i) {
        if (i >= 0 && i < list.length) {
          currentIdx = i;
          img.src = list[i];
        }
      },

      moveTo: function (x, y) {
        pos.x = x; pos.y = y;
        clampPos();
        applyPos();
      },

      reload: function () {
        return loadImageList().then(function (urls) {
          if (destroyed) return 0;
          list = urls;
          currentIdx = -1;
          if (list.length) {
            currentIdx = Math.floor(Math.random() * list.length);
            img.src = list[currentIdx];
          }
          startAuto();
          return list.length;
        });
      },

      destroy: function () {
        destroyed = true;
        stopAuto();
        if (root.parentNode) root.parentNode.removeChild(root);
        if (tipEl && tipEl.parentNode) tipEl.parentNode.removeChild(tipEl);
        if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        if (window.WebpPet === WebpPet) window.WebpPet = null;
      }
    };

    window.WebpPet = WebpPet;
  }

  /* ================================================================
     6. DOM 就绪
     ================================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();