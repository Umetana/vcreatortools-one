(() => {
  'use strict';

  function create({ width, height, windows, getScale, renderLayout, commitLayout, onLaunch, onClose }) {
    let drag;
    let pendingFrame;
    const minimizing = new Set();
    // 手前から奥への順序。登録順は変更せず、前面化したものだけ先頭へ移す。
    windows = [...windows];

    function position(x, y, boxWidth = 640, boxHeight = 440) {
      return {
        x: Math.round(Math.max(0, Math.min(width - boxWidth, x))),
        y: Math.round(Math.max(0, Math.min(height - 66 - boxHeight, y)))
      };
    }

    function windowZoom(value) {
      return Number.isFinite(value) ? Math.min(150, Math.max(50, Math.round(value))) : 100;
    }

    function windowPlacement(saved, boxWidth = 640, boxHeight = 440) {
      const zoom = windowZoom(saved.zoom);
      const w = Number.isFinite(saved.width) ? Math.min(width / (zoom / 100), Math.max(360, saved.width)) : boxWidth;
      const h = Number.isFinite(saved.height) ? Math.min((height - 66) / (zoom / 100), Math.max(190, saved.height)) : boxHeight;
      return {
        width: w, height: h,
        ...position(saved.x, saved.y, w * zoom / 100, h * zoom / 100),
        open: saved.open,
        minimized: saved.open && saved.minimized === true,
        zoom
      };
    }

    function renderWindow({ box, task: button, state, size }) {
      const placement = state();
      const zoom = (placement.zoom ?? 100) / 100;
      placement.width = Math.min(placement.width ?? size[0], width / zoom);
      placement.height = Math.min(placement.height ?? size[1], (height - 66) / zoom);
      Object.assign(placement, position(placement.x, placement.y, placement.width * zoom, placement.height * zoom));
      const maximized = box.classList.contains('maximized');
      box.style.width = `${maximized ? width : placement.width}px`;
      box.style.height = `${maximized ? height - 66 : placement.height}px`;
      box.style.left = `${maximized ? 0 : placement.x}px`;
      box.style.top = `${maximized ? 0 : placement.y}px`;
      box.style.scale = String(maximized ? 1 : zoom);
      box.hidden = !placement.open || (placement.minimized === true && !minimizing.has(box));
      box.inert = Boolean(placement.minimized);
      button.classList.toggle('minimized', Boolean(placement.minimized));
      button.hidden = !placement.open;
    }

    function enableDrag(handle, box, applyPosition, { onStart, onEnd } = {}) {
      handle.addEventListener('pointerdown', event => {
        const scale = getScale();
        if (drag || event.button !== 0 || !scale || box.classList.contains('maximized') || event.target.closest('button')) return;
        handle.setPointerCapture(event.pointerId);
        onStart?.();
        drag = {
          id: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: box.offsetLeft,
          y: box.offsetTop,
          scale
        };
      });
      handle.addEventListener('pointermove', event => {
        if (drag?.id !== event.pointerId) return;
        const next = position(
          drag.x + (event.clientX - drag.startX) / drag.scale,
          drag.y + (event.clientY - drag.startY) / drag.scale,
          box.offsetWidth * Number(box.style.scale || 1),
          box.offsetHeight * Number(box.style.scale || 1)
        );
        applyPosition(next);
        if (pendingFrame !== undefined) return;
        pendingFrame = requestAnimationFrame(() => {
          pendingFrame = undefined;
          renderLayout();
        });
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        handle.addEventListener(type, event => {
          if (drag?.id !== event.pointerId) return;
          drag = undefined;
          if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame);
          pendingFrame = undefined;
          commitLayout();
          onEnd?.();
        });
      }
    }

    function resizedWindow(initial, direction, dx, dy, zoom) {
      const right = initial.x + initial.width * zoom;
      const bottom = initial.y + initial.height * zoom;
      const minWidth = 360 * zoom;
      const minHeight = 190 * zoom;
      let left = initial.x, top = initial.y, endX = right, endY = bottom;
      if (direction.includes('w')) left = Math.max(0, Math.min(right - minWidth, initial.x + dx));
      if (direction.includes('e')) endX = Math.min(width, Math.max(left + minWidth, right + dx));
      if (direction.includes('n')) top = Math.max(0, Math.min(bottom - minHeight, initial.y + dy));
      if (direction.includes('s')) endY = Math.min(height - 66, Math.max(top + minHeight, bottom + dy));
      return { x: left, y: top, width: (endX - left) / zoom, height: (endY - top) / zoom };
    }

    function enableWindowResize(box, placement) {
      for (const direction of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
        const grip = document.createElement('div');
        grip.className = `window-resize resize-${direction}`;
        grip.addEventListener('pointerdown', event => {
          const scale = getScale();
          if (drag || event.button !== 0 || !scale) return;
          event.preventDefault();
          grip.setPointerCapture(event.pointerId);
          drag = {
            id: event.pointerId, startX: event.clientX, startY: event.clientY,
            placement: { ...placement() }, scale, zoom: (placement().zoom ?? 100) / 100
          };
        });
        grip.addEventListener('pointermove', event => {
          if (drag?.id !== event.pointerId) return;
          Object.assign(placement(), resizedWindow(drag.placement, direction,
            (event.clientX - drag.startX) / drag.scale, (event.clientY - drag.startY) / drag.scale, drag.zoom));
          renderLayout();
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
          grip.addEventListener(type, event => {
            if (drag?.id !== event.pointerId) return;
            drag = undefined;
            commitLayout();
          });
        }
        box.append(grip);
      }
    }

    function focusWindow(box) {
      const index = windows.findIndex(app => app.box === box);
      if (index > 0) {
        const [app] = windows.splice(index, 1);
        windows.unshift(app);
      }
      for (const [depth, app] of windows.entries()) {
        app.box.style.zIndex = windows.length - depth;
        const active = app.box === box;
        app.box.classList.toggle('active', active);
        app.task.setAttribute('aria-pressed', String(active));
      }
    }

    function frontVisibleWindow() {
      return windows.find(app => (!app.ready || app.ready()) && app.state().open && !app.state().minimized)?.box ?? null;
    }

    function enableWindow({ box, task: button, state: placement, handle: dragHandle, minimize, maximize, close, launcher, onHide }) {
      let animation;

      function stopAnimation() {
        animation?.cancel();
        animation = undefined;
        minimizing.delete(box);
      }

      function animateWindow(hiding) {
        const scale = getScale();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !scale || typeof box.animate !== 'function') return;
        const from = box.getBoundingClientRect();
        const target = button.getBoundingClientRect();
        const animationScale = scale * Number(box.style.scale || 1);
        const x = (target.left + target.width / 2 - from.left - from.width * 0.09) / animationScale;
        const y = (target.top + target.height / 2 - from.top - from.height * 0.09) / animationScale;
        const normal = { transform: 'none', opacity: 1 };
        const tucked = { transform: `translate(${x}px, ${y}px) scale(0.18)`, opacity: 0 };
        const current = box.animate(hiding ? [normal, tucked] : [tucked, normal], { duration: 180, easing: 'ease-out' });
        animation = current;
        current.onfinish = () => {
          if (animation !== current) return;
          stopAnimation();
          renderLayout();
        };
      }

      function restore() {
        const state = placement();
        const wasMinimized = state.minimized;
        stopAnimation();
        state.open = true;
        state.minimized = false;
        focusWindow(box);
        commitLayout();
        if (wasMinimized) animateWindow(false);
      }

      box.addEventListener('pointerdown', () => focusWindow(box));
      button.onclick = () => {
        if (placement().minimized) restore();
        else if (box.classList.contains('active')) minimizeWindow();
        else focusWindow(box);
      };
      if (launcher) {
        launcher.onclick = () => {
          restore();
          onLaunch();
          button.focus();
        };
      }
      function minimizeWindow() {
        const state = placement();
        if (!state.open || state.minimized) return;
        stopAnimation();
        animateWindow(true);
        if (animation) minimizing.add(box);
        state.minimized = true;
        onHide?.();
        if (box.classList.contains('active')) focusWindow(frontVisibleWindow());
        commitLayout();
        button.focus();
      }
      minimize.onclick = minimizeWindow;
      function setMaximized(value) {
        box.classList.toggle('maximized', value);
        maximize.textContent = value ? '❐' : '□';
        maximize.title = value ? '元に戻す' : '最大化';
        maximize.setAttribute('aria-label', maximize.title);
      }
      if (maximize) {
        maximize.onclick = () => {
          stopAnimation();
          setMaximized(!box.classList.contains('maximized'));
          focusWindow(box);
          renderLayout();
        };
      }
      close.onclick = () => {
        stopAnimation();
        const state = placement();
        state.open = false;
        onHide?.();
        if (maximize) setMaximized(false);
        state.minimized = false;
        if (box.classList.contains('active')) focusWindow(frontVisibleWindow());
        commitLayout();
        onClose();
      };
      enableDrag(dragHandle, box, next => Object.assign(placement(), next));
      enableWindowResize(box, placement);
      return restore;
    }

    function enableZoom({ box, zoomInput: input, handle: zoomHandle, state, size: [boxWidth, boxHeight] }) {
      if (!input) return;
      input.value = state().zoom ?? 100;

      function setZoom(value) {
        const placement = state();
        const current = placement.zoom ?? 100;
        const zoom = Number.isFinite(value) ? windowZoom(value) : current;
        input.value = zoom;
        if (zoom === current) return;
        placement.zoom = zoom;
        Object.assign(placement, position(placement.x, placement.y, (placement.width ?? boxWidth) * zoom / 100, (placement.height ?? boxHeight) * zoom / 100));
        commitLayout();
      }

      input.onchange = () => setZoom(input.valueAsNumber);
      zoomHandle.addEventListener('wheel', event => {
        if (!event.ctrlKey || !event.deltaY) return;
        event.preventDefault();
        if (drag || box.classList.contains('maximized')) return;
        const step = event.deltaY < 0 ? 5 : -5;
        setZoom((state().zoom ?? 100) + step);
      }, { passive: false });
    }

    const openers = new Map();
    function mount() {
      for (const app of windows) {
        openers.set(app.box, enableWindow(app));
        enableZoom(app);
      }
      ensureFocus();
    }

    function ensureFocus() {
      if (!windows.some(app => app.box.classList.contains('active'))) focusWindow(frontVisibleWindow());
    }

    function render() {
      for (const app of windows) {
        if (!app.ready || app.ready()) renderWindow(app);
      }
    }

    return { mount, open: box => openers.get(box)?.(), ensureFocus, render, enableDrag, position, windowPlacement };
  }

  window.StreamOSWindowManager = { create };
})();
