// Vice Cover Studio — cover renderer.
//
// Draws a multi-panel GTA-style poster onto a canvas: each panel holds one
// photo (cover-fit, with its own zoom and pan), a colour grade is laid over
// the panels, and a bold outlined caption sits at the bottom. Pure canvas,
// no dependencies. Exposed as window.CoverArt for the editor in main.js.

'use strict';

(function () {
  /** Panel shapes, as polygons in fractions of the cover's width and height. */
  const LAYOUTS = {
    trio: {
      label: 'Vice Trio',
      panels: 3,
      polygons: function (w, h) {
        const s = w * 0.055;
        return [
          [[0, 0], [w / 3 + s, 0], [w / 3 - s, h], [0, h]],
          [[w / 3 + s, 0], [(2 * w) / 3 + s, 0], [(2 * w) / 3 - s, h], [w / 3 - s, h]],
          [[(2 * w) / 3 + s, 0], [w, 0], [w, h], [(2 * w) / 3 - s, h]],
        ];
      },
    },
    duo: {
      label: 'Split Duo',
      panels: 2,
      polygons: function (w, h) {
        const s = w * 0.09;
        return [
          [[0, 0], [w / 2 + s, 0], [w / 2 - s, h], [0, h]],
          [[w / 2 + s, 0], [w, 0], [w, h], [w / 2 - s, h]],
        ];
      },
    },
    solo: {
      label: 'Solo Shot',
      panels: 1,
      polygons: function (w, h) {
        return [[[0, 0], [w, 0], [w, h], [0, h]]];
      },
    },
  };

  /** Colour grades: a canvas filter for the photo plus a tint gradient over it. */
  const GRADES = {
    sunset: {
      label: 'Sunset',
      filter: 'saturate(1.3) contrast(1.08) brightness(1.02)',
      tint: function (ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255, 122, 26, 0.10)');
        g.addColorStop(0.55, 'rgba(255, 80, 90, 0.08)');
        g.addColorStop(1, 'rgba(150, 20, 90, 0.20)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
    },
    neon: {
      label: 'Neon Night',
      filter: 'saturate(1.5) contrast(1.12) hue-rotate(-10deg)',
      tint: function (ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, 'rgba(255, 45, 149, 0.16)');
        g.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        g.addColorStop(1, 'rgba(0, 229, 255, 0.16)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
    },
    noir: {
      label: 'Noir',
      filter: 'grayscale(1) contrast(1.22) brightness(1.05)',
      tint: function (ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      },
    },
    clean: {
      label: 'Clean',
      filter: 'none',
      tint: function () {},
    },
  };

  /** Export sizes: label and pixel dimensions. */
  const SIZES = {
    '1080x1080': { label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
    '1080x1350': { label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
    '1920x1080': { label: 'Wide · 1920 × 1080', width: 1920, height: 1080 },
  };

  /** Whether point (x, y) lies inside a polygon of [x, y] points. */
  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0];
      const yi = poly[i][1];
      const xj = poly[j][0];
      const yj = poly[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /** Which panel of a layout holds point (x, y) on a cover of w by h, or -1. */
  function hitPanel(x, y, w, h, layout) {
    const polys = LAYOUTS[layout].polygons(w, h);
    for (let i = 0; i < polys.length; i++) {
      if (pointInPolygon(x, y, polys[i])) return i;
    }
    return -1;
  }

  /** Trace a polygon path on a context. */
  function tracePolygon(ctx, poly) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
  }

  /** Draw one photo into a panel, cover-fit, with zoom and pan offsets. */
  function drawPhoto(ctx, img, poly, zoom, pan) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of poly) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
    const bw = maxX - minX;
    const bh = maxY - minY;
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = minX + (bw - dw) / 2 + pan.x * bw;
    const dy = minY + (bh - dh) / 2 + pan.y * bh;
    ctx.save();
    tracePolygon(ctx, poly);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  /** Fill a panel with a dark placeholder when it has no photo yet. */
  function drawEmptyPanel(ctx, poly, w, h) {
    ctx.save();
    tracePolygon(ctx, poly);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a2140');
    g.addColorStop(1, '#120d24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /** Split a title into at most two lines that fit maxWidth at the given font. */
  function wrapTitle(ctx, title, maxWidth) {
    const words = title.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [''];
    const lines = [''];
    for (const word of words) {
      const trial = lines[lines.length - 1] === '' ? word : lines[lines.length - 1] + ' ' + word;
      if (ctx.measureText(trial).width <= maxWidth || lines[lines.length - 1] === '') {
        lines[lines.length - 1] = trial;
      } else if (lines.length < 2) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = lines[lines.length - 1] + '…';
        break;
      }
    }
    return lines;
  }

  /** Draw the bold outlined title and gold subtitle at the bottom of the cover. */
  function drawCaption(ctx, state, w, h) {
    const pad = Math.round(w * 0.045);
    const maxWidth = w - pad * 2;
    let titleSize = Math.round(Math.min(w, h) * 0.115);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    let lines = [];
    for (;;) {
      ctx.font = '900 ' + titleSize + 'px "ViceBlack", "Arial Black", sans-serif';
      try {
        ctx.letterSpacing = Math.round(titleSize * 0.02) + 'px';
      } catch (e) {
        /* letterSpacing is Chrome-only; spacing stays default elsewhere */
      }
      lines = wrapTitle(ctx, state.title.toUpperCase(), maxWidth);
      const widest = Math.max.apply(
        null,
        lines.map(function (l) {
          return ctx.measureText(l).width;
        }),
      );
      if (widest <= maxWidth || titleSize <= 28) break;
      titleSize = Math.round(titleSize * 0.92);
    }
    const subSize = Math.max(18, Math.round(titleSize * 0.26));
    const lineHeight = Math.round(titleSize * 1.02);
    const totalHeight = lines.length * lineHeight + Math.round(subSize * 1.9);
    const top = h - pad - totalHeight;

    // Soft dark band so the lettering reads over any photo.
    const band = ctx.createLinearGradient(0, top - pad * 0.7, 0, h);
    band.addColorStop(0, 'rgba(10, 4, 18, 0)');
    band.addColorStop(1, 'rgba(10, 4, 18, 0.55)');
    ctx.fillStyle = band;
    ctx.fillRect(0, top - pad * 0.7, w, h - top + pad * 0.7);

    ctx.save();
    // The shear shifts text left as y grows, so start far enough right that
    // even the lowest line begins at the padding, never off the canvas.
    ctx.translate(pad + 0.045 * (top + totalHeight), 0);
    ctx.transform(1, 0, -0.045, 1, 0, 0);
    ctx.font = '900 ' + titleSize + 'px "ViceBlack", "Arial Black", sans-serif';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14060f';
    ctx.lineWidth = Math.max(3, Math.round(titleSize / 11));
    ctx.fillStyle = '#fff6e0';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.round(titleSize * 0.12);
    ctx.shadowOffsetY = Math.round(titleSize * 0.05);
    lines.forEach(function (line, i) {
      const y = top + (i + 1) * lineHeight;
      ctx.strokeText(line, 0, y);
      ctx.fillText(line, 0, y);
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (state.subtitle.trim() !== '') {
      ctx.font = '700 ' + subSize + 'px "ViceBold", "Arial Black", sans-serif';
      try {
        ctx.letterSpacing = Math.round(subSize * 0.22) + 'px';
      } catch (e) {
        /* see above */
      }
      ctx.lineWidth = Math.max(2, Math.round(subSize / 8));
      ctx.strokeStyle = '#14060f';
      ctx.fillStyle = '#ffd34d';
      const y = top + lines.length * lineHeight + Math.round(subSize * 1.35);
      ctx.strokeText(state.subtitle.toUpperCase(), 0, y);
      ctx.fillText(state.subtitle.toUpperCase(), 0, y);
    }
    ctx.restore();
  }

  /** Darken the cover's corners a little so the middle pops. */
  function drawVignette(ctx, w, h) {
    const r = Math.hypot(w, h) / 2;
    const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Render a cover onto a canvas at its full export size.
   * state: { layout, grade, title, subtitle, photos, panelPhoto, panelZoom, panelPan }
   */
  function renderCover(canvas, state, width, height) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const layout = LAYOUTS[state.layout] || LAYOUTS.trio;
    const grade = GRADES[state.grade] || GRADES.sunset;
    const polys = layout.polygons(width, height);

    ctx.fillStyle = '#0d0918';
    ctx.fillRect(0, 0, width, height);
    ctx.filter = grade.filter;
    polys.forEach(function (poly, i) {
      const photoIndex = state.panelPhoto[i] || 0;
      const img = state.photos[photoIndex];
      if (img && img.complete && img.naturalWidth > 0) {
        drawPhoto(ctx, img, poly, state.panelZoom[i] || 1, state.panelPan[i] || { x: 0, y: 0 });
      } else {
        drawEmptyPanel(ctx, poly, width, height);
      }
    });
    ctx.filter = 'none';

    // Grade tint over the panels, then thin white dividers between them.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    grade.tint(ctx, width, height);
    ctx.restore();
    const gutter = Math.max(2, Math.round(width / 360));
    ctx.strokeStyle = 'rgba(255, 246, 224, 0.92)';
    ctx.lineWidth = gutter;
    polys.forEach(function (poly) {
      tracePolygon(ctx, poly);
      ctx.stroke();
    });
    ctx.strokeStyle = '#0d0918';
    ctx.lineWidth = Math.max(4, Math.round(width / 135));
    ctx.strokeRect(0, 0, width, height);

    drawVignette(ctx, width, height);
    drawCaption(ctx, state, width, height);
    return canvas;
  }

  window.CoverArt = {
    LAYOUTS: LAYOUTS,
    GRADES: GRADES,
    SIZES: SIZES,
    renderCover: renderCover,
    hitPanel: hitPanel,
  };
})();
