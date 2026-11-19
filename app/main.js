// Vice Cover Studio — editor UI.
//
// Wires the controls to the renderer in cover.js: photo slots, layouts,
// grades, caption text, per-panel crop, export and present mode. Photos are
// read on the user's own machine and never uploaded anywhere.

'use strict';

(function () {
  var CoverArt = window.CoverArt;

  /** The editor's state; photos are HTMLImageElements or null. */
  var state = {
    layout: 'trio',
    grade: 'sunset',
    size: '1080x1350',
    title: 'VICE NIGHTS',
    subtitle: 'TWO SIDES OF THE SAME CITY',
    photos: [null, null, null],
    panelPhoto: [0, 1, 0],
    panelZoom: [1, 1, 1],
    panelPan: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    selectedPanel: 0,
  };

  var preview = document.getElementById('preview');
  var statusLine = document.getElementById('status');
  var presentOverlay = document.getElementById('present');
  var presentCanvas = document.getElementById('present-canvas');
  var exportCanvas = document.createElement('canvas');
  var readyResolve;
  window.__appReady = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  /** Preview width in pixels; height follows the chosen export aspect. */
  function previewSize() {
    var size = CoverArt.SIZES[state.size];
    var w = 540;
    return { width: w, height: Math.round((w * size.height) / size.width) };
  }

  /** Redraw the preview canvas from the current state. */
  function renderPreview() {
    var size = previewSize();
    CoverArt.renderCover(preview, state, size.width, size.height);
    updateStatus();
  }

  /** Show the chosen size and panel count under the preview. */
  function updateStatus() {
    var size = CoverArt.SIZES[state.size];
    var layout = CoverArt.LAYOUTS[state.layout];
    statusLine.textContent =
      size.label + ' · ' + layout.label + ' · ' + layout.panels + (layout.panels === 1 ? ' panel' : ' panels') + ' · grade ' + CoverArt.GRADES[state.grade].label;
  }

  /** Mark one group of option buttons as active. */
  function markActive(containerId, value) {
    var buttons = document.querySelectorAll('#' + containerId + ' button');
    buttons.forEach(function (b) {
      b.classList.toggle('active', b.dataset.value === value);
    });
  }

  /** Refresh the selected-panel controls to match the state. */
  function refreshPanelControls() {
    var i = state.selectedPanel;
    document.getElementById('panel-label').textContent = 'Panel ' + (i + 1);
    document.getElementById('panel-photo').value = String(state.panelPhoto[i]);
    document.getElementById('panel-zoom').value = String(state.panelZoom[i]);
    document.getElementById('zoom-value').textContent = state.panelZoom[i].toFixed(2) + '×';
    document.getElementById('panel-pan-x').value = String(state.panelPan[i].x);
    document.getElementById('panel-pan-y').value = String(state.panelPan[i].y);
    document.getElementById('pan-x-value').textContent = Math.round(state.panelPan[i].x * 100) + '%';
    document.getElementById('pan-y-value').textContent = Math.round(state.panelPan[i].y * 100) + '%';
    var thumbs = document.querySelectorAll('.slot');
    thumbs.forEach(function (t, n) {
      t.classList.toggle('selected', n === i);
    });
  }

  /** Load an image file into a photo slot, then redraw. */
  function loadPhotoFile(file, slot) {
    if (!file || file.type.indexOf('image/') !== 0) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      state.photos[slot] = img;
      URL.revokeObjectURL(url);
      renderPreview();
      refreshThumbs();
    };
    img.src = url;
  }

  /** Load a bundled sample photo into a slot. */
  function loadSample(path, slot) {
    var img = new Image();
    img.onload = function () {
      state.photos[slot] = img;
      renderPreview();
      refreshThumbs();
    };
    img.onerror = function () {
      state.photos[slot] = null;
      renderPreview();
    };
    img.src = path;
  }

  /** Show the slot thumbnails (sample images or an empty state). */
  function refreshThumbs() {
    var thumbs = document.querySelectorAll('.slot img');
    thumbs.forEach(function (el, n) {
      var img = state.photos[n];
      if (img) {
        el.src = img.src;
        el.style.display = 'block';
      } else {
        el.removeAttribute('src');
        el.style.display = 'none';
      }
    });
  }

  /** Render the cover at full export size and return a PNG data URL. */
  function exportDataUrl(sizeKey) {
    var size = CoverArt.SIZES[sizeKey || state.size];
    CoverArt.renderCover(exportCanvas, state, size.width, size.height);
    return exportCanvas.toDataURL('image/png');
  }

  /** Download the cover as a PNG file at the chosen size. */
  function exportCover() {
    var size = CoverArt.SIZES[state.size];
    CoverArt.renderCover(exportCanvas, state, size.width, size.height);
    exportCanvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'vice-cover-' + state.size + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    }, 'image/png');
  }

  /** Show the current cover fullscreen until the overlay is clicked. */
  function openPresent() {
    var size = CoverArt.SIZES[state.size];
    var scale = Math.min(window.innerWidth / size.width, window.innerHeight / size.height, 1);
    CoverArt.renderCover(
      presentCanvas,
      state,
      Math.round(size.width * scale),
      Math.round(size.height * scale),
    );
    presentOverlay.classList.add('open');
  }

  function closePresent() {
    presentOverlay.classList.remove('open');
  }

  /** Build the layout and grade option buttons. */
  function buildOptions() {
    var layoutBox = document.getElementById('layout-options');
    Object.keys(CoverArt.LAYOUTS).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = CoverArt.LAYOUTS[key].label;
      b.dataset.value = key;
      b.addEventListener('click', function () {
        state.layout = key;
        state.selectedPanel = 0;
        markActive('layout-options', key);
        renderPreview();
        refreshPanelControls();
      });
      layoutBox.appendChild(b);
    });
    var gradeBox = document.getElementById('grade-options');
    Object.keys(CoverArt.GRADES).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = CoverArt.GRADES[key].label;
      b.dataset.value = key;
      b.addEventListener('click', function () {
        state.grade = key;
        markActive('grade-options', key);
        renderPreview();
      });
      gradeBox.appendChild(b);
    });
    markActive('layout-options', state.layout);
    markActive('grade-options', state.grade);
  }

  /** Wire every control on the page. */
  function wireControls() {
    document.getElementById('title-input').addEventListener('input', function (e) {
      state.title = e.target.value;
      renderPreview();
    });
    document.getElementById('subtitle-input').addEventListener('input', function (e) {
      state.subtitle = e.target.value;
      renderPreview();
    });
    document.getElementById('size-select').addEventListener('change', function (e) {
      state.size = e.target.value;
      renderPreview();
    });
    document.getElementById('panel-photo').addEventListener('change', function (e) {
      state.panelPhoto[state.selectedPanel] = Number(e.target.value);
      renderPreview();
    });
    document.getElementById('panel-zoom').addEventListener('input', function (e) {
      state.panelZoom[state.selectedPanel] = Number(e.target.value);
      renderPreview();
      refreshPanelControls();
    });
    document.getElementById('panel-pan-x').addEventListener('input', function (e) {
      state.panelPan[state.selectedPanel].x = Number(e.target.value);
      renderPreview();
      refreshPanelControls();
    });
    document.getElementById('panel-pan-y').addEventListener('input', function (e) {
      state.panelPan[state.selectedPanel].y = Number(e.target.value);
      renderPreview();
      refreshPanelControls();
    });
    document.getElementById('export-btn').addEventListener('click', exportCover);
    document.getElementById('present-btn').addEventListener('click', openPresent);
    presentOverlay.addEventListener('click', closePresent);
    document.getElementById('fill-all').addEventListener('click', function () {
      var src = state.photos[state.selectedPanel] ? state.selectedPanel : 0;
      var panels = CoverArt.LAYOUTS[state.layout].panels;
      for (var i = 0; i < panels; i++) state.panelPhoto[i] = src;
      renderPreview();
    });

    document.querySelectorAll('.slot input[type="file"]').forEach(function (input) {
      input.addEventListener('change', function () {
        loadPhotoFile(input.files[0], Number(input.dataset.slot));
        input.value = '';
      });
    });
    document.querySelectorAll('.slot .sample-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadSample(btn.dataset.src, Number(btn.dataset.slot));
      });
    });
    document.querySelectorAll('.slot').forEach(function (slotEl, n) {
      slotEl.addEventListener('click', function (e) {
        if (e.target.closest('input, button')) return;
        state.selectedPanel = n;
        refreshPanelControls();
      });
    });

    preview.addEventListener('click', function (e) {
      var rect = preview.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * preview.width;
      var y = ((e.clientY - rect.top) / rect.height) * preview.height;
      var hit = CoverArt.hitPanel(x, y, preview.width, preview.height, state.layout);
      if (hit >= 0) {
        state.selectedPanel = hit;
        refreshPanelControls();
      }
    });
    preview.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    preview.addEventListener('drop', function (e) {
      e.preventDefault();
      var files = e.dataTransfer.files;
      for (var i = 0; i < files.length && i < 3; i++) loadPhotoFile(files[i], i);
    });
  }

  /** Boot: load the display fonts and the two sample photos, then render. */
  function boot() {
    buildOptions();
    wireControls();
    refreshPanelControls();
    var fonts = [];
    if (document.fonts && document.fonts.load) {
      fonts.push(document.fonts.load('900 100px "ViceBlack"'));
      fonts.push(document.fonts.load('700 40px "ViceBold"'));
    }
    loadSample('assets/sample-sunset.jpg', 0);
    loadSample('assets/sample-neon.jpg', 1);
    Promise.all(fonts).then(renderPreview).catch(renderPreview);
    setTimeout(function () {
      renderPreview();
      readyResolve(true);
    }, 900);
    if (new URLSearchParams(window.location.search).get('view') === 'cover') {
      setTimeout(openPresent, 1100);
    }
  }

  // Test hooks for the screenshot driver: export a cover as a data URL.
  window.__exportCover = exportDataUrl;
  window.__getState = function () {
    return {
      layout: state.layout,
      grade: state.grade,
      size: state.size,
      title: state.title,
      subtitle: state.subtitle,
    };
  };
  window.__setState = function (patch) {
    Object.assign(state, patch);
    if (patch.title !== undefined) document.getElementById('title-input').value = state.title;
    if (patch.subtitle !== undefined) document.getElementById('subtitle-input').value = state.subtitle;
    if (patch.size !== undefined) document.getElementById('size-select').value = state.size;
    renderPreview();
    refreshPanelControls();
    markActive('layout-options', state.layout);
    markActive('grade-options', state.grade);
  };

  boot();
})();
