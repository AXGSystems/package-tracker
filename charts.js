/* ══════════════════════════════════════════════════════════
   ConciURGE Charts Engine — Animated, Glowing, Canvas-Based
   (c) AXG Systems
   ══════════════════════════════════════════════════════════ */

const Charts = (function(){
  'use strict';

  const COLORS = {
    gold:   '#c9a84c', goldLight: '#dfc36e', goldDark: '#a08630',
    blue:   '#1e5fb3', blueLight: '#3b82f6',
    maroon: '#7c2d3d', maroonLight: '#a0374c',
    success:'#16a34a', warning:'#d97706', danger:'#dc2626',
    text:   '#1a1a2e', muted: '#8a8a9a',
    palette:['#c9a84c','#1e5fb3','#7c2d3d','#16a34a','#d97706','#8b5cf6','#ec4899','#06b6d4','#f97316','#6366f1']
  };

  function dpr(cv){
    const r = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    cv.width = rect.width * r;
    cv.height = rect.height * r;
    const cx = cv.getContext('2d');
    cx.scale(r, r);
    return { cx, w: rect.width, h: rect.height };
  }

  // ── Animated Donut Chart ──
  function donut(canvasId, data, opts = {}) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const { cx, w, h } = dpr(cv);
    const centerX = w / 2, centerY = h / 2;
    const radius = Math.min(w, h) / 2 - 20;
    const inner = radius * 0.6;
    const total = data.reduce((s, d) => s + d.value, 0);
    if (!total) { cx.fillStyle = COLORS.muted; cx.font = '14px Inter'; cx.textAlign = 'center'; cx.fillText('No data', centerX, centerY); return; }

    let progress = 0;
    const target = 1;
    const duration = 800;
    const start = performance.now();

    function draw(now) {
      progress = Math.min((now - start) / duration, target);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      cx.clearRect(0, 0, w, h);

      let angle = -Math.PI / 2;
      data.forEach((d, i) => {
        const sliceAngle = (d.value / total) * Math.PI * 2 * ease;
        // Glow
        cx.shadowColor = COLORS.palette[i % COLORS.palette.length];
        cx.shadowBlur = 16;
        cx.beginPath();
        cx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
        cx.arc(centerX, centerY, inner, angle + sliceAngle, angle, true);
        cx.closePath();
        cx.fillStyle = COLORS.palette[i % COLORS.palette.length];
        cx.fill();
        cx.shadowBlur = 0;
        angle += sliceAngle;
      });

      // Center text
      cx.fillStyle = COLORS.text;
      cx.font = 'bold 28px Inter';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(total, centerX, centerY - 8);
      cx.fillStyle = COLORS.muted;
      cx.font = '11px Inter';
      cx.fillText(opts.centerLabel || 'Total', centerX, centerY + 14);

      if (progress < target) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);

    // Legend below
    const legend = cv.parentElement.querySelector('.chart-legend');
    if (legend) {
      legend.innerHTML = data.map((d, i) =>
        `<div class="legend-item"><span class="legend-dot" style="background:${COLORS.palette[i % COLORS.palette.length]}"></span>${d.label}: <strong>${d.value}</strong></div>`
      ).join('');
    }
  }

  // ── Animated Bar Chart ──
  function bars(canvasId, data, opts = {}) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const { cx, w, h } = dpr(cv);
    if (!data.length) return;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = Math.min(50, (w - 60) / data.length - 8);
    const pad = (w - data.length * (barW + 8)) / 2;
    const chartH = h - 40;
    const duration = 700;
    const start = performance.now();

    function draw(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      cx.clearRect(0, 0, w, h);

      // Grid lines
      cx.strokeStyle = 'rgba(0,0,0,0.04)';
      cx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = 10 + (chartH / 4) * i;
        cx.beginPath(); cx.moveTo(30, y); cx.lineTo(w - 10, y); cx.stroke();
      }

      data.forEach((d, i) => {
        const barH = (d.value / maxVal) * chartH * ease;
        const x = pad + i * (barW + 8);
        const y = 10 + chartH - barH;
        const color = COLORS.palette[i % COLORS.palette.length];

        // Glow
        cx.shadowColor = color;
        cx.shadowBlur = 12;

        // Gradient bar
        const grad = cx.createLinearGradient(x, y, x, 10 + chartH);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '44');
        cx.fillStyle = grad;

        cx.beginPath();
        cx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
        cx.fill();
        cx.shadowBlur = 0;

        // Label
        cx.fillStyle = COLORS.muted;
        cx.font = '10px Inter';
        cx.textAlign = 'center';
        cx.fillText(d.label, x + barW / 2, h - 4);

        // Value on top
        if (ease > 0.5) {
          cx.fillStyle = COLORS.text;
          cx.font = 'bold 11px Inter';
          cx.fillText(d.value, x + barW / 2, y - 6);
        }
      });

      if (progress < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ── Animated Line Chart ──
  function line(canvasId, data, opts = {}) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const { cx, w, h } = dpr(cv);
    if (data.length < 2) return;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const padL = 35, padR = 15, padT = 15, padB = 30;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;
    const stepX = chartW / (data.length - 1);
    const color = opts.color || COLORS.gold;
    const duration = 900;
    const start = performance.now();

    function draw(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const drawCount = Math.ceil(data.length * ease);
      cx.clearRect(0, 0, w, h);

      // Grid
      cx.strokeStyle = 'rgba(0,0,0,0.04)';
      cx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padT + (chartH / 4) * i;
        cx.beginPath(); cx.moveTo(padL, y); cx.lineTo(w - padR, y); cx.stroke();
      }

      // Area fill
      cx.beginPath();
      cx.moveTo(padL, padT + chartH);
      for (let i = 0; i < drawCount; i++) {
        const x = padL + i * stepX;
        const y = padT + chartH - (data[i].value / maxVal) * chartH;
        if (i === 0) cx.lineTo(x, y);
        else cx.lineTo(x, y);
      }
      cx.lineTo(padL + (drawCount - 1) * stepX, padT + chartH);
      cx.closePath();
      const grad = cx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '05');
      cx.fillStyle = grad;
      cx.fill();

      // Line
      cx.shadowColor = color;
      cx.shadowBlur = 10;
      cx.beginPath();
      for (let i = 0; i < drawCount; i++) {
        const x = padL + i * stepX;
        const y = padT + chartH - (data[i].value / maxVal) * chartH;
        if (i === 0) cx.moveTo(x, y);
        else cx.lineTo(x, y);
      }
      cx.strokeStyle = color;
      cx.lineWidth = 2.5;
      cx.lineCap = 'round';
      cx.lineJoin = 'round';
      cx.stroke();
      cx.shadowBlur = 0;

      // Dots
      for (let i = 0; i < drawCount; i++) {
        const x = padL + i * stepX;
        const y = padT + chartH - (data[i].value / maxVal) * chartH;
        cx.beginPath();
        cx.arc(x, y, 4, 0, Math.PI * 2);
        cx.fillStyle = '#fff';
        cx.fill();
        cx.strokeStyle = color;
        cx.lineWidth = 2;
        cx.stroke();
      }

      // Labels
      cx.fillStyle = COLORS.muted;
      cx.font = '10px Inter';
      cx.textAlign = 'center';
      data.forEach((d, i) => {
        cx.fillText(d.label, padL + i * stepX, h - 6);
      });

      if (progress < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ── Heatmap (7-day grid) ──
  function heatmap(canvasId, data) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const { cx, w, h } = dpr(cv);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const cellW = (w - 50) / 7;
    const cellH = Math.min(50, h - 30);
    const y = (h - cellH) / 2;

    const duration = 600;
    const start = performance.now();

    function draw(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      cx.clearRect(0, 0, w, h);

      data.forEach((d, i) => {
        const x = 25 + i * cellW;
        const intensity = (d.value / maxVal) * ease;
        const r = Math.round(124 + (201 - 124) * (1 - intensity));
        const g = Math.round(45 + (168 - 45) * (1 - intensity));
        const b = Math.round(61 + (76 - 61) * (1 - intensity));

        cx.shadowColor = `rgba(${124},${45},${61},${intensity * 0.3})`;
        cx.shadowBlur = 8;

        cx.fillStyle = intensity > 0.05 ? `rgba(${r},${g},${b},${0.15 + intensity * 0.7})` : 'rgba(0,0,0,0.03)';
        cx.beginPath();
        cx.roundRect(x + 2, y, cellW - 4, cellH, 8);
        cx.fill();
        cx.shadowBlur = 0;

        cx.fillStyle = intensity > 0.5 ? '#fff' : COLORS.text;
        cx.font = 'bold 16px Inter';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        if (ease > 0.3) cx.fillText(d.value, x + cellW / 2, y + cellH / 2 - 2);

        cx.fillStyle = COLORS.muted;
        cx.font = '10px Inter';
        cx.fillText(d.label || days[i], x + cellW / 2, y + cellH + 14);
      });

      if (progress < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ── Horizontal Bar Chart (for rankings) ──
  function hBars(canvasId, data, opts = {}) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const { cx, w, h } = dpr(cv);
    if (!data.length) return;

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barH = Math.min(28, (h - 10) / data.length - 6);
    const padL = opts.labelWidth || 100;
    const chartW = w - padL - 50;
    const duration = 700;
    const start = performance.now();

    function draw(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      cx.clearRect(0, 0, w, h);

      data.forEach((d, i) => {
        const y = 5 + i * (barH + 6);
        const barW = (d.value / maxVal) * chartW * ease;
        const color = opts.color || COLORS.palette[i % COLORS.palette.length];

        // Label
        cx.fillStyle = COLORS.text;
        cx.font = '12px Inter';
        cx.textAlign = 'right';
        cx.textBaseline = 'middle';
        cx.fillText(d.label, padL - 8, y + barH / 2);

        // Bar with glow
        cx.shadowColor = color;
        cx.shadowBlur = 8;
        const grad = cx.createLinearGradient(padL, y, padL + barW, y);
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '88');
        cx.fillStyle = grad;
        cx.beginPath();
        cx.roundRect(padL, y, Math.max(barW, 2), barH, [0, 4, 4, 0]);
        cx.fill();
        cx.shadowBlur = 0;

        // Value
        if (ease > 0.4) {
          cx.fillStyle = COLORS.text;
          cx.font = 'bold 11px Inter';
          cx.textAlign = 'left';
          cx.fillText(d.value + (opts.suffix || ''), padL + barW + 8, y + barH / 2);
        }
      });

      if (progress < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  // ── Gauge / Percentage Ring ──
  function gauge(canvasId, value, max, opts = {}) {
    const cv = document.getElementById(canvasId);
    if (!cv) return;
    const { cx, w, h } = dpr(cv);
    const centerX = w / 2, centerY = h / 2 + 5;
    const radius = Math.min(w, h) / 2 - 16;
    const lineW = 12;
    const pct = Math.min(value / (max || 1), 1);
    const color = opts.color || COLORS.gold;
    const duration = 800;
    const start = performance.now();

    function draw(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      cx.clearRect(0, 0, w, h);

      // Background arc
      cx.beginPath();
      cx.arc(centerX, centerY, radius, Math.PI * 0.8, Math.PI * 2.2);
      cx.strokeStyle = 'rgba(0,0,0,0.05)';
      cx.lineWidth = lineW;
      cx.lineCap = 'round';
      cx.stroke();

      // Value arc with glow
      const endAngle = Math.PI * 0.8 + (Math.PI * 1.4) * pct * ease;
      cx.shadowColor = color;
      cx.shadowBlur = 12;
      cx.beginPath();
      cx.arc(centerX, centerY, radius, Math.PI * 0.8, endAngle);
      cx.strokeStyle = color;
      cx.lineWidth = lineW;
      cx.lineCap = 'round';
      cx.stroke();
      cx.shadowBlur = 0;

      // Center text
      cx.fillStyle = COLORS.text;
      cx.font = 'bold 24px Inter';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(opts.label || Math.round(pct * 100 * ease) + '%', centerX, centerY - 4);

      cx.fillStyle = COLORS.muted;
      cx.font = '10px Inter';
      cx.fillText(opts.subLabel || '', centerX, centerY + 16);

      if (progress < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  return { donut, bars, line, heatmap, hBars, gauge, COLORS };
})();
