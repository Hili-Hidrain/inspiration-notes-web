/* ========================================
   灵感卡片墙 v2 · 四季光屏
   ======================================== */

(() => {
  'use strict';

  const STORAGE_KEY = 'inspiration-cards-data';
  const SETTINGS_KEY = 'inspiration-cards-settings';

  const PRESETS = [
    { id: 'p1',  c1: '#ffffff', c2: '#a0c4ff', angle: 135, label: '晨曦白' },
    { id: 'p2',  c1: '#ffe4e6', c2: '#fbbf24', angle: 135, label: '暖阳粉' },
    { id: 'p3',  c1: '#bae6fd', c2: '#38bdf8', angle: 135, label: '湖水蓝' },
    { id: 'p4',  c1: '#c4b5fd', c2: '#8b5cf6', angle: 135, label: '紫藤紫' },
    { id: 'p5',  c1: '#fecaca', c2: '#f87171', angle: 135, label: '朱砂红' },
    { id: 'p6',  c1: '#a7f3d0', c2: '#10b981', angle: 135, label: '翠竹绿' },
    { id: 'p7',  c1: '#e0e7ff', c2: '#6366f1', angle: 135, label: '星河蓝' },
    { id: 'p8',  c1: '#fef3c7', c2: '#f59e0b', angle: 135, label: '落日黄' },
    { id: 'p9',  c1: '#fce7f3', c2: '#ec4899', angle: 135, label: '胭脂粉' },
    { id: 'p10', c1: '#d1fae5', c2: '#059669', angle: 135, label: '翡翠绿' },
    { id: 'p11', c1: '#ede9fe', c2: '#7c3aed', angle: 135, label: '梦幻紫' },
    { id: 'p12', c1: '#fff7ed', c2: '#ea580c', angle: 135, label: '橘晚霞' },
  ];

  const FONTS = [
    { id: 'noto-serif',    label: '思源宋体', css: "'Noto Serif SC', serif" },
    { id: 'xiaowei',       label: '小薇体',   css: "'ZCOOL XiaoWei', serif" },
    { id: 'mashanzheng',   label: '马善政',   css: "'Ma Shan Zheng', cursive" },
    { id: 'longcang',      label: '龙藏体',   css: "'Long Cang', cursive" },
    { id: 'kuaile',        label: '快乐体',   css: "'ZCOOL KuaiLe', cursive" },
    { id: 'system',        label: '系统默认', css: '-apple-system, "PingFang SC", sans-serif' },
  ];

  const DEFAULT_GROUP = { id: 'default', name: '默认分组', order: 0 };

  // ---- 工具 ----
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function isLightColor(hex) {
    const m = hex.replace('#','').match(/.{2}/g);
    if (!m) return false;
    const [r,g,b] = m.map(x => parseInt(x, 16));
    return (r*299 + g*587 + b*114)/1000 >= 128;
  }
  function avgColor(h1, h2) {
    const p = h => h.replace('#','').match(/.{2}/g).map(x => parseInt(x,16));
    const [r1,g1,b1]=p(h1), [r2,g2,b2]=p(h2);
    const to = n => n.toString(16).padStart(2,'0');
    return `#${to(Math.round((r1+r2)/2))}${to(Math.round((g1+g2)/2))}${to(Math.round((b1+b2)/2))}`;
  }
  function cardTextColor(bg) {
    if (bg.type === 'solid' || !bg.color2) return isLightColor(bg.color1) ? 'dark' : 'light';
    return isLightColor(avgColor(bg.color1, bg.color2)) ? 'dark' : 'light';
  }
  function bgCss(bg) {
    if (!bg) return '';
    if (bg.type === 'solid' || !bg.color2) return `background:${bg.color1};`;
    return `background:linear-gradient(${bg.angle||135}deg, ${bg.color1}, ${bg.color2});`;
  }

  function bgColorLuminance(hex) {
    if (!hex) return 0.8;
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // ---- 状态 ----
  let cards = [];
  let groups = [];
  let settings = { season: 'spring', activeGroupId: null, weather: 'sunny' };
  let editingId = null;
  let currentDetailId = null;
  let searchQuery = '';
  let pendingDeleteId = null;
  let pendingImportData = null;
  let editingTags = [];
  let editingPresetId = null;
  let editingFontId = 'noto-serif';
  let rippleSystem = null;
  let rainSystem = null;

  // ---- DOM ----
  const els = {};
  const $safe = (s) => document.querySelector(s);
  function initDom() {
    els.conveyor = $safe('#groupSections');
    els.emptyState = $('#emptyState');
    els.statusInfo = $('#statusInfo');
    els.groupList = $('#groupList');
    els.addGroupBtn = $('#addGroupBtn');
    els.searchInput = $('#searchInput');
    els.searchClearBtn = $('#searchClearBtn');
    els.searchCount = $('#searchCount');
    els.createBtn = $('#createBtn');
    els.importBtn = $('#importBtn');
    els.exportBtn = $('#exportBtn');
    els.fileInput = $('#fileInput');
    els.seasonPicker = $('#seasonPicker');
    els.seasonBg = $('#seasonBg');
    els.pageColor = $('#pageColor');
    els.pageColorReset = $('#pageColorReset');
    els.rippleCanvas = $('#rippleCanvas');
    els.rainCanvas = $('#rainCanvas');
    els.decorLayer = $('#decorLayer');
    els.weatherToggle = $('#weatherToggle');

    els.editModal = $('#editModal');
    els.modalTitle = $('#modalTitle');
    els.editForm = $('#editForm');
    els.fTitle = $('#fTitle');
    els.fContent = $('#fContent');
    els.fSource = $('#fSource');
    els.fGroup = $('#fGroup');
    els.fPinned = $('#fPinned');
    els.fontGrid = $('#fontGrid');
    els.tagList = $('#tagList');
    els.tagInput = $('#tagInput');
    els.tagSuggest = $('#tagSuggest');
    els.presetGrid = $('#presetGrid');
    els.bgColor1 = $('#bgColor1');
    els.bgColor2 = $('#bgColor2');
    els.bgAngle = $('#bgAngle');
    els.angleVal = $('#angleVal');
    els.bgPreview = $('#bgPreview');
    els.color2Wrap = $('#color2Wrap');
    els.angleWrap = $('#angleWrap');
    els.deleteFromModalBtn = $('#deleteFromModalBtn');
    els.addGroupInlineBtn = $('#addGroupInlineBtn');

    els.detailModal = $('#detailModal');
    els.detailHeader = $('#detailHeader');
    els.detailTitle = $('#detailTitle');
    els.detailTags = $('#detailTags');
    els.detailContent = $('#detailContent');
    els.detailSource = $('#detailSource');
    els.detailTime = $('#detailTime');
    els.detailPinBtn = $('#detailPinBtn');
    els.detailCopyBtn = $('#detailCopyBtn');
    els.detailEditBtn = $('#detailEditBtn');
    els.detailDeleteBtn = $('#detailDeleteBtn');

    els.confirmModal = $('#confirmModal');
    els.confirmText = $('#confirmText');
    els.confirmOk = $('#confirmOk');
    els.confirmCancel = $('#confirmCancel');

    els.importModal = $('#importModal');
    els.importInfo = $('#importInfo');
    els.importMerge = $('#importMerge');
    els.importReplace = $('#importReplace');

    els.groupModal = $('#groupModal');
    els.groupModalTitle = $('#groupModalTitle');
    els.groupNameInput = $('#groupNameInput');
    els.groupSaveBtn = $('#groupSaveBtn');

    els.toastContainer = $('#toastContainer');
  }

  // ---- 持久化 ----
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { cards: [], groups: null };
      const data = JSON.parse(raw);
      let cardsArr = Array.isArray(data.cards) ? data.cards : [];
      let groupsArr = Array.isArray(data.groups) ? data.groups : null;

      // 迁移：老版本没有 groupId 字段
      cardsArr = cardsArr.map(c => {
        if (c.groupId) return c;
        return { ...c, groupId: 'default' };
      });

      return { cards: cardsArr, groups: groupsArr };
    } catch {
      toast('数据损坏，已重置', 'warn');
      return { cards: [], groups: null };
    }
  }

  function saveData() {
    try {
      const payload = JSON.stringify({
        version: 2,
        cards,
        groups,
      });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (e) {
      if (e.name === 'QuotaExceededError') toast('存储空间已满，请导出后清理', 'error');
    }
  }
  const saveDebounced = debounce(saveData, 100);

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...settings, ...JSON.parse(raw) };
    } catch {}
    return settings;
  }
  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ---- Toast ----
  function toast(msg, type = 'success', actionLabel, actionFn) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${esc(msg)}</span>`;
    if (actionLabel && actionFn) {
      const btn = document.createElement('button');
      btn.className = 'toast-action';
      btn.textContent = actionLabel;
      btn.onclick = () => { actionFn(); el.remove(); };
      el.appendChild(btn);
    }
    els.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 8000 : (type === 'warn' ? 5000 : 3000));
  }

  // ---- 分组管理 ----
  function initGroups(existing) {
    if (existing && existing.length) {
      groups = existing;
    } else {
      groups = [{ ...DEFAULT_GROUP }];
    }
    // 确保 default 分组存在
    if (!groups.find(g => g.id === 'default')) {
      groups.unshift({ ...DEFAULT_GROUP });
    }
    // 确保每个分组都有 order 字段并按 order 排序
    groups.forEach((g, i) => { if (g.order === undefined) g.order = i; });
    groups.sort((a, b) => a.order - b.order);
    settings.activeGroupId = settings.activeGroupId || null;
  }

  function addGroup(name) {
    const maxOrder = groups.reduce((m, g) => Math.max(m, g.order ?? 0), -1);
    const g = { id: uid(), name: name.trim(), order: maxOrder + 1 };
    groups.push(g);
    saveData();
    render();
    return g;
  }

  function renameGroup(id, name) {
    const g = groups.find(x => x.id === id);
    if (g) { g.name = name.trim(); saveData(); render(); }
  }

  function deleteGroup(id) {
    if (id === 'default') { toast('默认分组不可删除', 'warn'); return; }
    const g = groups.find(x => x.id === id);
    if (!g) return;
    cards.forEach(c => { if (c.groupId === id) c.groupId = 'default'; });
    groups = groups.filter(x => x.id !== id);
    saveData();
    render();
    toast(`已删除分组「${g.name}」，卡片已归入默认分组`);
  }

  function renderGroupList() {
    els.groupList.innerHTML = groups.map(g => {
      const count = cards.filter(c => c.groupId === g.id).length;
      const isActive = settings.activeGroupId === g.id;
      return `
        <li class="group-item ${isActive ? 'active' : ''}" data-group-id="${g.id}" draggable="true" title="拖动排序">
          <div class="group-drag-handle">⋮⋮</div>
          <div class="group-name">${esc(g.name)}</div>
          <span class="group-count">${count}</span>
          ${g.id !== 'default' ? `
            <div class="group-actions">
              <button data-act="rename" title="重命名">✎</button>
              <button data-act="delete" title="删除">✕</button>
            </div>
          ` : ''}
        </li>
      `;
    }).join('');
  }

  function renderGroupPicker() {
    els.fGroup.innerHTML = groups
      .sort((a,b) => a.order - b.order)
      .map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
  }

  // ---- 字体 ----
  function renderFontGrid() {
    els.fontGrid.innerHTML = FONTS.map(f => `
      <div class="font-item ${f.id === editingFontId ? 'active' : ''}" data-font="${f.id}" style="font-family:${f.css}">
        ${esc(f.label)}
      </div>
    `).join('');
  }

  // ---- 预设 ----
  function buildPresetGrid() {
    els.presetGrid.innerHTML = PRESETS.map(p => `
      <div class="preset-item" data-id="${p.id}" title="${p.label}"
           style="background:linear-gradient(${p.angle}deg, ${p.c1}, ${p.c2});"></div>
    `).join('');
  }
  function updatePresetActive() {
    $$('.preset-item').forEach(el => el.classList.toggle('active', el.dataset.id === editingPresetId));
  }

  // ---- 渲染卡片 ----
  function highlight(text, query) {
    if (!query) return esc(text);
    const kws = [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))];
    let html = esc(text);
    kws.forEach(k => {
      const re = new RegExp(escapeRegExp(k), 'gi');
      html = html.replace(re, m => `<span class="hl">${m}</span>`);
    });
    return html;
  }

  function matchCard(card, query) {
    if (!query) return true;
    const kws = query.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = (card.title+' '+card.content+' '+(card.source||'')+' '+(card.tags||[]).join(' ')).toLowerCase();
    return kws.every(k => hay.includes(k));
  }

  function cardHtml(card) {
    const dimmed = searchQuery && !matchCard(card, searchQuery) ? 'dimmed' : '';
    const pinBadge = card.isPinned ? 'pin-badge' : '';
    const textColor = cardTextColor(card.bgConfig);
    const fontCss = getFontCss(card.fontFamily);
    const style = `${bgCss(card.bgConfig)}font-family:${fontCss};`;
    return `
      <div class="card ${textColor}-text ${dimmed} ${pinBadge}" style="${style}" data-id="${card.id}">
        <div class="card-actions">
          <button class="card-action" data-act="pin" title="置顶">${card.isPinned ? '📌' : '📍'}</button>
          <button class="card-action" data-act="edit" title="编辑">✏️</button>
          <button class="card-action" data-act="delete" title="删除">🗑</button>
        </div>
        ${card.title ? `<div class="card-title">${highlight(card.title, searchQuery)}</div>` : ''}
        <div class="card-body-text">${highlight(card.content, searchQuery)}</div>
        ${card.source ? `<div class="card-source">📖 ${highlight(card.source, searchQuery)}</div>` : ''}
      </div>
    `;
  }

  function getFontCss(id) {
    const f = FONTS.find(x => x.id === id);
    return f ? f.css : FONTS[0].css;
  }

  function render() {
    renderGroupList();
    renderGroupPicker();

    const activeGId = settings.activeGroupId;
    const visibleGroups = activeGId ? groups.filter(g => g.id === activeGId) : groups;

    const totalCards = cards.length;
    if (totalCards === 0) {
      els.conveyor.innerHTML = '';
      els.conveyor.hidden = true;
      els.emptyState.hidden = false;
      els.statusInfo.textContent = '共 0 张卡片 · 0 个分组';
      return;
    }
    els.conveyor.hidden = false;
    els.emptyState.hidden = true;

    els.conveyor.innerHTML = visibleGroups.map(g => {
      let groupCards = cards.filter(c => c.groupId === g.id);

      if (searchQuery) {
        const matched = groupCards.filter(c => matchCard(c, searchQuery));
        const unmatched = groupCards.filter(c => !matchCard(c, searchQuery));
        groupCards = [...matched, ...unmatched];
      }

      if (groupCards.length === 0) return '';

      const pinned = groupCards.filter(c => c.isPinned);
      const normal = groupCards.filter(c => !c.isPinned);
      const ordered = [...pinned, ...normal];

      const isScroll = ordered.length > 3;
      const cardsHtml = ordered.map(c => cardHtml(c)).join('');
      // 滚动模式需要复制一份实现无缝
      const trackHtml = isScroll ? cardsHtml + cardsHtml : cardsHtml;

      return `
        <section class="group-section">
          <div class="group-label">
            <span class="group-label-title">${esc(g.name)}</span>
            <span class="group-label-count">${ordered.length} 张</span>
            <span class="group-label-line"></span>
          </div>
          <div class="group-row ${isScroll ? 'scroll' : 'float'}">
            <div class="group-row-track">${trackHtml}</div>
          </div>
        </section>
      `;
    }).join('');

    if (searchQuery) {
      const matched = cards.filter(c => matchCard(c, searchQuery));
      els.statusInfo.textContent = `匹配 ${matched.length} / 共 ${cards.length} 张卡片 · ${groups.length} 个分组`;
    } else {
      els.statusInfo.textContent = `共 ${cards.length} 张卡片 · ${groups.length} 个分组`;
    }
  }

  // ---- SVG 装饰图案 ----
  function svgPeachBlossom(size, opacity) {
    const petals = [0, 72, 144, 216, 288].map(a =>
      `<ellipse cx="0" cy="-10" rx="7" ry="10" fill="#ffb6c1" opacity="${opacity}" transform="rotate(${a})"/>`
    ).join('');
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}"><g transform="translate(20 20)" class="decor-sway">${petals}<circle r="3" fill="#ffd700" opacity="0.9"/></g></svg>`;
  }

  function svgBambooLeaf(size, opacity) {
    return `<svg viewBox="0 0 40 60" width="${size}" height="${size * 1.5}"><g class="decor-sway-leaf"><path d="M20 5 Q35 25 20 55 Q5 25 20 5" fill="#4a7c59" opacity="${opacity}"/><line x1="20" y1="8" x2="20" y2="52" stroke="#2d5a3f" stroke-width="0.5" opacity="0.4"/></g></svg>`;
  }

  function svgMapleLeaf(size, opacity, color) {
    const c = color || '#e07840';
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}"><g class="decor-sway"><path d="M20 3 L24 12 L34 10 L27 18 L32 30 L20 24 L8 30 L13 18 L6 10 L16 12 Z" fill="${c}" opacity="${opacity}"/><line x1="20" y1="24" x2="20" y2="38" stroke="#8b4513" stroke-width="1" opacity="0.5"/></g></svg>`;
  }

  function svgPlumBranch(size, opacity) {
    const op = opacity;
    return `<svg viewBox="0 0 120 80" width="${size}" height="${size * 0.67}">
      <path d="M5 70 Q30 55 50 45 Q70 35 95 20 Q105 15 115 8" stroke="#3a2a20" stroke-width="2.5" fill="none" opacity="${op * 0.8}"/>
      <path d="M30 55 L25 42" stroke="#3a2a20" stroke-width="1.5" fill="none" opacity="${op * 0.7}"/>
      <path d="M60 40 L55 28" stroke="#3a2a20" stroke-width="1.2" fill="none" opacity="${op * 0.7}"/>
      <path d="M80 30 L78 18" stroke="#3a2a20" stroke-width="1" fill="none" opacity="${op * 0.6}"/>
      <g class="decor-twinkle"><circle cx="25" cy="40" r="4" fill="#fff" opacity="${op}"/><circle cx="22" cy="38" r="2.5" fill="#fce4ec" opacity="${op}"/></g>
      <g class="decor-twinkle" style="animation-delay:1s"><circle cx="55" cy="26" r="4" fill="#fff" opacity="${op}"/><circle cx="52" cy="24" r="2.5" fill="#fce4ec" opacity="${op}"/></g>
      <g class="decor-twinkle" style="animation-delay:2s"><circle cx="78" cy="16" r="3.5" fill="#fff" opacity="${op}"/></g>
    </svg>`;
  }

  function svgSnowflake(size, opacity) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><g transform="translate(12 12)" stroke="#fff" stroke-width="0.8" opacity="${opacity}" fill="none"><line x1="0" y1="-10" x2="0" y2="10"/><line x1="-10" y1="0" x2="10" y2="0"/><line x1="-7" y1="-7" x2="7" y2="7"/><line x1="-7" y1="7" x2="7" y2="-7"/><line x1="0" y1="-10" x2="-2" y2="-7"/><line x1="0" y1="-10" x2="2" y2="-7"/><line x1="0" y1="10" x2="-2" y2="7"/><line x1="0" y1="10" x2="2" y2="7"/></g></svg>`;
  }

  function seededRandom(seed) {
    let s = seed;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  function renderDecor(season) {
    if (!els.decorLayer) return;
    const old = els.decorLayer.querySelectorAll('.decor-svg');
    old.forEach(el => el.classList.remove('visible'));
    setTimeout(() => { els.decorLayer.innerHTML = ''; }, 600);

    const rng = seededRandom(season === 'spring' ? 11 : season === 'summer' ? 22 : season === 'autumn' ? 33 : 44);
    const items = [];

    if (season === 'spring') {
      // 桃花 + 李花，8-10朵
      const colors = ['#ffb6c1', '#ffd1dc', '#f8c8dc', '#ffc0cb'];
      for (let i = 0; i < 10; i++) {
        items.push({
          svg: svgPeachBlossom(40 + rng() * 20, 0.6 + rng() * 0.3),
          x: 5 + rng() * 90, y: 5 + rng() * 85,
          size: 40 + rng() * 20, rotation: rng() * 360,
        });
      }
    } else if (season === 'summer') {
      // 竹叶，6-8组
      for (let i = 0; i < 8; i++) {
        items.push({
          svg: svgBambooLeaf(30 + rng() * 15, 0.5 + rng() * 0.3),
          x: 5 + rng() * 90, y: 5 + rng() * 80,
          size: 30 + rng() * 15, rotation: -20 + rng() * 40,
        });
      }
    } else if (season === 'autumn') {
      // 枫叶，8-10片
      const colors = ['#e07840', '#d4652a', '#c4521e', '#e89048', '#d97a35'];
      for (let i = 0; i < 10; i++) {
        items.push({
          svg: svgMapleLeaf(35 + rng() * 20, 0.6 + rng() * 0.3, colors[Math.floor(rng() * colors.length)]),
          x: 3 + rng() * 94, y: 5 + rng() * 85,
          size: 35 + rng() * 20, rotation: rng() * 360,
        });
      }
    } else if (season === 'winter') {
      // 梅花枝 4枝 + 雪花 4个
      for (let i = 0; i < 4; i++) {
        items.push({
          svg: svgPlumBranch(100 + rng() * 40, 0.7),
          x: 5 + rng() * 70, y: 3 + rng() * 30,
          size: 100 + rng() * 40, rotation: -15 + rng() * 30,
          extraClass: 'winter-flower',
        });
      }
      for (let i = 0; i < 4; i++) {
        items.push({
          svg: svgSnowflake(18 + rng() * 12, 0.6 + rng() * 0.3),
          x: 10 + rng() * 85, y: 40 + rng() * 50,
          size: 18 + rng() * 12, rotation: rng() * 360,
        });
      }
    }

    setTimeout(() => {
      items.forEach((d, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'decor-svg';
        if (d.extraClass) wrapper.classList.add(d.extraClass);
        wrapper.style.left = d.x + '%';
        wrapper.style.top = d.y + '%';
        wrapper.style.width = d.size + 'px';
        wrapper.style.height = 'auto';
        wrapper.style.transform = `rotate(${d.rotation}deg)`;
        wrapper.style.zIndex = d.extraClass === 'winter-flower' ? 0 : 0;
        wrapper.innerHTML = d.svg;
        els.decorLayer.appendChild(wrapper);
        setTimeout(() => wrapper.classList.add('visible'), i * 80 + 50);
      });
    }, 650);
  }

  // ---- 涟漪系统 ----
  function initRippleSystem() {
    if (!els.rippleCanvas) return null;
    const canvas = els.rippleCanvas;
    const ctx = canvas.getContext('2d');
    const ripples = [];
    let autoTimer = 0;
    let season = 'spring';

    const seasonColors = {
      spring: { ripple: '255, 200, 210', glow: '255, 230, 235' },
      summer: { ripple: '255, 255, 255', glow: '200, 240, 220' },
      autumn: { ripple: '100, 60, 30', glow: '255, 200, 150' },
      winter: { ripple: '255, 255, 255', glow: '200, 220, 240' },
    };

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('click', e => {
      if (e.target.closest('.card, .modal-overlay, .navbar, .group-sidebar, button, input, select, textarea, .statusbar, .group-label')) return;
      const c = seasonColors[season];
      ripples.push({
        x: e.clientX, y: e.clientY,
        radius: 0, maxRadius: 100 + Math.random() * 80,
        opacity: 0.5, speed: 1.8,
        color: c.ripple, glow: c.glow,
      });
    });

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const c = seasonColors[season];

      autoTimer++;
      if (autoTimer > 120 + Math.random() * 80) {
        ripples.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: 0, maxRadius: 180 + Math.random() * 150,
          opacity: 0.18 + Math.random() * 0.12,
          speed: 0.4 + Math.random() * 0.4,
          color: c.ripple, glow: c.glow,
        });
        autoTimer = 0;
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed;
        const progress = r.radius / r.maxRadius;
        if (progress >= 1) { ripples.splice(i, 1); continue; }
        const alpha = r.opacity * (1 - progress);

        // 外圈
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r.color},${alpha})`;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 中圈
        if (r.radius > 8) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.75, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r.color},${alpha * 0.6})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // 内圈（光环）
        if (r.radius > 15) {
          const grd = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius * 0.6);
          grd.addColorStop(0, `rgba(${r.glow},${alpha * 0.25})`);
          grd.addColorStop(1, `rgba(${r.glow},0)`);
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
    return {
      setSeason(s) { season = s; },
      addRipple: (x, y) => {
        const c = seasonColors[season];
        ripples.push({ x, y, radius: 0, maxRadius: 120, opacity: 0.45, speed: 1.5, color: c.ripple, glow: c.glow });
      },
    };
  }

  // ---- 雨滴/雪系统 ----
  function initRainSystem() {
    if (!els.rainCanvas) return null;
    const canvas = els.rainCanvas;
    const ctx = canvas.getContext('2d');
    let drops = [];
    let active = false;
    let season = 'spring';

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (active) initDrops();
    }
    resize();
    window.addEventListener('resize', resize);

    function getConfig() {
      switch (season) {
        case 'spring': return { count: 280, lenMin: 10, lenMax: 20, spdMin: 2.5, spdMax: 5, w: 1.2, op: 0.55, angle: 0.12, color: '230,210,220' };
        case 'summer': return { count: 120, lenMin: 20, lenMax: 35, spdMin: 6, spdMax: 10, w: 1.2, op: 0.4, angle: 0.08, color: '200,230,220' };
        case 'autumn': return { count: 150, lenMin: 14, lenMax: 24, spdMin: 4, spdMax: 7, w: 1, op: 0.35, angle: 0.06, color: '255,220,180' };
        case 'winter': return { count: 80, szMin: 2, szMax: 5, spdMin: 0.5, spdMax: 1.5, op: 0.7, isSnow: true };
        default: return { count: 150, lenMin: 10, lenMax: 20, spdMin: 3, spdMax: 6, w: 1, op: 0.3, angle: 0.08, color: '255,255,255' };
      }
    }

    function initDrops() {
      drops = [];
      const cfg = getConfig();
      for (let i = 0; i < cfg.count; i++) {
        if (cfg.isSnow) {
          drops.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            size: cfg.szMin + Math.random() * (cfg.szMax - cfg.szMin),
            sy: cfg.spdMin + Math.random() * (cfg.spdMax - cfg.spdMin),
            sx: (Math.random() - 0.5) * 0.5,
            op: cfg.op * (0.5 + Math.random() * 0.5),
            sway: Math.random() * Math.PI * 2, isSnow: true,
          });
        } else {
          drops.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            len: cfg.lenMin + Math.random() * (cfg.lenMax - cfg.lenMin),
            spd: cfg.spdMin + Math.random() * (cfg.spdMax - cfg.spdMin),
            w: cfg.w, op: cfg.op * (0.5 + Math.random() * 0.5),
            angle: cfg.angle, color: cfg.color, isSnow: false,
          });
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (active && drops.length) {
        const w = canvas.width, h = canvas.height;
        drops.forEach(d => {
          if (d.isSnow) {
            d.y += d.sy;
            d.x += d.sx + Math.sin(d.sway) * 0.3;
            d.sway += 0.02;
            if (d.y > h) { d.y = -10; d.x = Math.random() * w; }
            if (d.x > w) d.x = 0;
            if (d.x < 0) d.x = w;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${d.op})`;
            ctx.fill();
          } else {
            d.y += d.spd;
            d.x += d.spd * d.angle;
            if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - d.len * d.angle, d.y - d.len);
            ctx.strokeStyle = `rgba(${d.color},${d.op})`;
            ctx.lineWidth = d.w;
            ctx.stroke();
          }
        });
      }
      requestAnimationFrame(animate);
    }

    animate();
    return {
      setSeason(s) { season = s; if (active) initDrops(); },
      setActive(a) { active = a; if (a) initDrops(); else drops = []; },
    };
  }

  // ---- 主题切换 ----
  function setSeason(season) {
    settings.season = season;
    saveSettings();
    // 更新背景类（若用户已自定义颜色，仍保留自定义色）
    els.seasonBg.className = 'season-bg season-' + season;
    if (!settings.pageColor) {
      applySeasonBg(season);
    }
    $$('.season-btn').forEach(b => b.classList.toggle('active', b.dataset.season === season));
    // 更新装饰图案
    renderDecor(season);
    // 更新雨滴样式
    if (rainSystem) rainSystem.setSeason(season);
    // 更新涟漪颜色
    if (rippleSystem) rippleSystem.setSeason(season);
    // 将季节相关CSS变量应用到body
    applySeasonVars(season);
    // 更新页面色选择器默认值
    if (!settings.pageColor && els.pageColor) {
      els.pageColor.value = getSeasonColor(season);
    }
  }

  function applySeasonVars(season) {
    const vars = {
      spring: {
        '--surface-bg': 'linear-gradient(135deg, rgba(255,240,243,0.65) 0%, rgba(255,220,225,0.5) 100%)',
        '--surface-bg-hover': 'linear-gradient(135deg, rgba(255,240,243,0.8) 0%, rgba(255,220,225,0.7) 100%)',
        '--surface-bg-active': 'linear-gradient(135deg, rgba(255,240,243,0.9) 0%, rgba(255,220,225,0.85) 100%)',
        '--surface-border': 'rgba(255, 200, 210, 0.4)',
        '--surface-solid': 'rgba(255, 240, 243, 0.55)',
        '--content-overlay': 'linear-gradient(180deg, rgba(200,180,195,0.15) 0%, rgba(180,160,180,0.1) 100%)',
      },
      summer: {
        '--surface-bg': 'linear-gradient(135deg, rgba(220,240,230,0.5) 0%, rgba(200,230,210,0.4) 100%)',
        '--surface-bg-hover': 'linear-gradient(135deg, rgba(220,240,230,0.7) 0%, rgba(200,230,210,0.6) 100%)',
        '--surface-bg-active': 'linear-gradient(135deg, rgba(220,240,230,0.85) 0%, rgba(200,230,210,0.75) 100%)',
        '--surface-border': 'rgba(150, 200, 180, 0.4)',
        '--surface-solid': 'rgba(220, 240, 230, 0.4)',
        '--content-overlay': 'linear-gradient(180deg, rgba(140,190,170,0.18) 0%, rgba(120,170,150,0.12) 100%)',
      },
      autumn: {
        '--surface-bg': 'linear-gradient(135deg, rgba(255,245,230,0.65) 0%, rgba(255,225,200,0.5) 100%)',
        '--surface-bg-hover': 'linear-gradient(135deg, rgba(255,245,230,0.8) 0%, rgba(255,225,200,0.7) 100%)',
        '--surface-bg-active': 'linear-gradient(135deg, rgba(255,245,230,0.9) 0%, rgba(255,225,200,0.85) 100%)',
        '--surface-border': 'rgba(220, 180, 130, 0.4)',
        '--surface-solid': 'rgba(255, 245, 230, 0.55)',
        '--content-overlay': 'linear-gradient(180deg, rgba(200,170,130,0.15) 0%, rgba(180,150,110,0.1) 100%)',
      },
      winter: {
        '--surface-bg': 'linear-gradient(135deg, rgba(235,240,250,0.65) 0%, rgba(215,225,245,0.5) 100%)',
        '--surface-bg-hover': 'linear-gradient(135deg, rgba(235,240,250,0.8) 0%, rgba(215,225,245,0.7) 100%)',
        '--surface-bg-active': 'linear-gradient(135deg, rgba(235,240,250,0.9) 0%, rgba(215,225,245,0.85) 100%)',
        '--surface-border': 'rgba(180, 195, 220, 0.4)',
        '--surface-solid': 'rgba(235, 240, 250, 0.55)',
        '--content-overlay': 'linear-gradient(180deg, rgba(160,180,210,0.2) 0%, rgba(140,165,200,0.15) 100%)',
      },
    };
    const map = vars[season] || vars.spring;
    Object.entries(map).forEach(([k, v]) => document.body.style.setProperty(k, v));
  }

  // ---- 天气切换 ----
  function setWeather(weather) {
    settings.weather = weather;
    saveSettings();
    $$('.weather-btn').forEach(b => b.classList.toggle('active', b.dataset.weather === weather));
    if (rainSystem) rainSystem.setActive(weather === 'rainy');
    if (weather === 'rainy') toast(settings.season === 'winter' ? '飘雪了 ❄️' : '下雨了 🌧️');
    else toast('天晴了 ☀️');
  }

  function applySeasonBg(season) {
    // 季节主题保留在 CSS 类里，自定义颜色时覆盖
    if (settings.pageColor) {
      els.seasonBg.style.background = settings.pageColor;
    } else {
      els.seasonBg.style.background = '';
    }
  }

  function setPageColor(color) {
    if (!color) {
      settings.pageColor = null;
      els.pageColor.value = getSeasonColor(settings.season);
    } else {
      settings.pageColor = color;
    }
    saveSettings();
    applySeasonBg(settings.season);
  }

  function getSeasonColor(season) {
    const map = {
      spring: '#e8d5e0',
      summer: '#2d5a55',
      autumn: '#c49060',
      winter: '#d5dae0',
    };
    return map[season] || map.spring;
  }

  // ---- Modal ----
  function openModal(sel) { $(sel).hidden = false; }
  function closeModal(sel) {
    const el = $(sel);
    el.hidden = true;
    // 清除自定义背景（恢复季节主题）
    if (el && el.classList.contains('modal')) {
      el.style.background = '';
      el.classList.remove('custom-bg-mode', 'light-on-dark', 'dark-on-light');
    }
  }

  // ---- 新建/编辑 ----
  function openCreate() {
    editingId = null;
    if (els.modalTitle) els.modalTitle.textContent = '新建灵感';
    if (els.deleteFromModalBtn) els.deleteFromModalBtn.style.display = 'none';
    editingTags = [];
    editingPresetId = null;
    editingFontId = 'noto-serif';
    renderFontGrid();
    setBgForm({ type: 'gradient', color1: '#ffffff', color2: '#a0c4ff', angle: 135, presetId: 'p1' });
    if (els.fTitle) els.fTitle.value = '';
    if (els.fContent) els.fContent.value = '';
    if (els.fSource) els.fSource.value = '';
    if (els.fPinned) els.fPinned.checked = false;
    if (els.fGroup) els.fGroup.value = settings.activeGroupId || groups[0].id;
    renderTagList();
    openModal('#editModal');
    setTimeout(() => els.fTitle && els.fTitle.focus(), 100);
  }

  function openEdit(id) {
    const c = cards.find(x => x.id === id);
    if (!c) return;
    editingId = id;
    els.modalTitle.textContent = '编辑灵感';
    els.deleteFromModalBtn.style.display = '';
    els.fTitle.value = c.title || '';
    els.fContent.value = c.content || '';
    els.fSource.value = c.source || '';
    els.fPinned.checked = !!c.isPinned;
    els.fGroup.value = c.groupId || 'default';
    editingTags = [...(c.tags || [])];
    editingFontId = c.fontFamily || 'noto-serif';
    renderFontGrid();
    setBgForm(c.bgConfig);
    renderTagList();
    openModal('#editModal');
  }

  function setBgForm(bg) {
    bg = bg || { type: 'gradient', color1: '#ffffff', color2: '#a0c4ff', angle: 135 };
    const type = bg.type || (bg.color2 ? 'gradient' : 'solid');
    const radio = els.editForm.querySelector(`input[name="bgType"][value="${type}"]`);
    if (radio) radio.checked = true;
    els.bgColor1.value = bg.color1 || '#ffffff';
    els.bgColor2.value = bg.color2 || '#a0c4ff';
    els.bgAngle.value = bg.angle || 135;
    els.angleVal.textContent = (bg.angle || 135) + '°';
    editingPresetId = bg.presetId || null;
    updateBgVisibility();
    updateBgPreview();
    updatePresetActive();
  }

  function updateBgVisibility() {
    const type = els.editForm.querySelector('input[name="bgType"]:checked')?.value || 'solid';
    els.color2Wrap.style.display = type === 'gradient' ? '' : 'none';
    els.angleWrap.style.display = type === 'gradient' ? '' : 'none';
  }
  function updateBgPreview() {
    const type = els.editForm.querySelector('input[name="bgType"]:checked')?.value || 'solid';
    const bg = { type, color1: els.bgColor1.value, color2: els.bgColor2.value, angle: parseInt(els.bgAngle.value)||135 };
    els.bgPreview.setAttribute('style', bgCss(bg) + 'height:50px;border-radius:12px;margin-top:12px;border:1px solid rgba(0,0,0,0.08);');
    // 编辑模态框背景跟随卡片颜色
    if (els.editModal) {
      els.editModal.style.background = bgCss(bg) + ';backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);';
      els.editModal.classList.add('custom-bg-mode');
      // 根据颜色亮度切换文字色
      const isDark = bgColorLuminance(bg.color1) < 0.4;
      els.editModal.classList.toggle('light-on-dark', isDark);
      els.editModal.classList.toggle('dark-on-light', !isDark);
    }
  }
  function getBgForm() {
    const type = els.editForm.querySelector('input[name="bgType"]:checked')?.value || 'solid';
    const bg = { type, color1: els.bgColor1.value, presetId: editingPresetId };
    if (type === 'gradient') { bg.color2 = els.bgColor2.value; bg.angle = parseInt(els.bgAngle.value)||135; }
    return bg;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const title = els.fTitle.value.trim();
    const content = els.fContent.value.trim();
    if (!title && !content) { toast('标题和正文至少填一个', 'warn'); return; }
    const data = {
      title, content,
      source: els.fSource.value.trim(),
      groupId: els.fGroup.value,
      tags: [...editingTags],
      isPinned: els.fPinned.checked,
      bgConfig: getBgForm(),
      fontFamily: editingFontId,
    };
    if (editingId) {
      const c = cards.find(x => x.id === editingId);
      Object.assign(c, data, { updatedAt: Date.now() });
      toast('已更新灵感');
    } else {
      cards.unshift({ id: uid(), ...data, createdAt: Date.now(), updatedAt: Date.now() });
      toast('已保存灵感');
    }
    saveDebounced();
    render();
    closeModal('#editModal');
  }

  // ---- 标签 ----
  function renderTagList() {
    els.tagList.innerHTML = editingTags.map((t,i) =>
      `<span class="tag-chip">${esc(t)}<span class="tag-remove" data-i="${i}">×</span></span>`
    ).join('');
  }
  function addTag(text) {
    const t = text.trim();
    if (!t) return;
    if (t.length > 20) { toast('单个标签不超过20字', 'warn'); return; }
    if (editingTags.some(x => x.toLowerCase() === t.toLowerCase())) return;
    editingTags.push(t);
    renderTagList();
  }
  function removeTag(i) { editingTags.splice(i,1); renderTagList(); }
  function allTagsWithFreq() {
    const m = {};
    cards.forEach(c => (c.tags||[]).forEach(t => m[t]=(m[t]||0)+1));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([t])=>t);
  }
  function showTagSuggest(q) {
    const list = allTagsWithFreq().filter(t => t.toLowerCase().includes(q.toLowerCase())).slice(0,10);
    if (!list.length) { els.tagSuggest.hidden = true; return; }
    els.tagSuggest.innerHTML = list.map(t => `<li data-tag="${esc(t)}">${esc(t)}</li>`).join('');
    els.tagSuggest.hidden = false;
  }

  // ---- 删除 ----
  function requestDelete(id) {
    pendingDeleteId = id;
    const c = cards.find(x => x.id === id);
    els.confirmText.textContent = c && c.title
      ? `确定要删除「${c.title}」吗？删除后无法恢复。`
      : '确定要删除这条灵感吗？删除后无法恢复。';
    els.confirmOk.textContent = '确认删除';
    openModal('#confirmModal');
  }

  function doDelete(id) {
    const idx = cards.findIndex(c => c.id === id);
    if (idx === -1) return;
    const deleted = cards[idx];
    cards.splice(idx, 1);
    saveData();
    render();
    closeModal('#confirmModal');
    closeModal('#editModal');
    closeModal('#detailModal');
    pendingDeleteId = null;
    toast('已删除', 'success', '撤销', () => {
      cards.splice(idx, 0, deleted);
      saveData();
      render();
      toast('已恢复', 'success');
    });
  }

  // ---- 复制 ----
  function copyCard(id) {
    const c = cards.find(x => x.id === id);
    if (!c) return;
    const newC = { ...c, id: uid(), title: (c.title||'')+'（副本）', isPinned:false, createdAt:Date.now(), updatedAt:Date.now() };
    cards.unshift(newC);
    saveData();
    render();
    toast('已复制为新卡片');
    setTimeout(() => {
      const el = document.querySelector(`.card[data-id="${newC.id}"]`);
      if (el) { el.style.transition = 'box-shadow 0.3s'; el.style.boxShadow = '0 0 0 4px var(--accent-1)'; setTimeout(()=>{el.style.boxShadow='';el.style.transition='';},600); }
    }, 50);
  }

  // ---- 置顶 ----
  function togglePin(id) {
    const c = cards.find(x => x.id === id);
    if (!c) return;
    c.isPinned = !c.isPinned;
    c.updatedAt = Date.now();
    saveData();
    render();
    toast(c.isPinned ? '已置顶' : '已取消置顶');
  }

  // ---- 详情 ----
  function openDetail(id) {
    const c = cards.find(x => x.id === id);
    if (!c) return;
    currentDetailId = id;
    els.detailHeader.setAttribute('style', bgCss(c.bgConfig) + 'height:120px;border-radius:24px 24px 0 0;');
    els.detailTitle.textContent = c.title || '(无标题)';
    els.detailTitle.style.fontFamily = getFontCss(c.fontFamily);
    els.detailTags.innerHTML = (c.tags||[]).map(t => `<span class="detail-tag">${esc(t)}</span>`).join('');
    els.detailContent.textContent = c.content || '';
    els.detailContent.style.fontFamily = getFontCss(c.fontFamily);
    els.detailSource.textContent = c.source ? `📖 来源：${c.source}` : '';
    const ct = new Date(c.createdAt);
    const ut = new Date(c.updatedAt);
    let s = `🕒 创建于 ${ct.toLocaleString('zh-CN')}`;
    if (c.updatedAt && c.updatedAt !== c.createdAt) s += ` · 更新于 ${ut.toLocaleString('zh-CN')}`;
    els.detailTime.textContent = s;
    els.detailPinBtn.textContent = c.isPinned ? '📍 取消置顶' : '📌 置顶';
    openModal('#detailModal');
  }

  // ---- 导入/导出 ----
  function exportJSON() {
    if (!cards.length) { toast('暂无卡片可导出', 'warn'); return; }
    const data = { version: 2, cards, groups };
    const blob = new Blob(['\uFEFF' + JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspiration-cards-${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出 JSON 文件');
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        let imported;
        if (Array.isArray(data)) imported = data;
        else if (data && Array.isArray(data.cards)) imported = data.cards;
        else throw new Error('格式不正确');
        const valid = imported.filter(c => c && (c.title || c.content) && c.bgConfig);
        if (!valid.length) { toast('文件中没有有效的卡片数据', 'error'); return; }
        // 迁移：老卡片补 groupId
        valid.forEach(c => { if (!c.groupId) c.groupId = 'default'; });
        pendingImportData = valid;
        els.importInfo.textContent = `检测到 ${valid.length} 条卡片数据，请选择导入方式：合并（追加到现有）或替换（清空现有全部换成导入的）。`;
        openModal('#importModal');
      } catch (err) {
        toast('文件格式不正确：' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function doImport(mode) {
    if (!pendingImportData) return;
    if (mode === 'replace') {
      els.confirmText.textContent = `将清空现有 ${cards.length} 张卡片，不可恢复，确定继续？`;
      pendingDeleteId = '__replace__';
      openModal('#confirmModal');
      return;
    }
    // 合并
    const count = pendingImportData.length;
    const existingIds = new Set(cards.map(c => c.id));
    pendingImportData.forEach(c => {
      if (existingIds.has(c.id)) {
        const idx = cards.findIndex(x => x.id === c.id);
        cards[idx] = { ...c };
      } else {
        cards.push({ ...c, id: c.id || uid() });
      }
      if (c.groupId && !groups.find(g => g.id === c.groupId)) {
        groups.push({ id: c.groupId, name: `分组 ${c.groupId.slice(0,4)}`, order: Date.now() });
      }
    });
    saveData();
    render();
    closeModal('#importModal');
    pendingImportData = null;
    toast(`已合并导入 ${count} 条数据`);
  }

  // ---- 搜索 ----
  const handleSearch = debounce(() => {
    searchQuery = els.searchInput.value.trim();
    els.searchClearBtn.style.display = searchQuery ? '' : 'none';
    render();
  }, 200);

  // ---- 分组管理弹窗 ----
  let groupModalMode = 'create';
  let editingGroupId = null;

  function openGroupModal(mode, groupId) {
    groupModalMode = mode;
    editingGroupId = groupId || null;
    if (mode === 'rename' && groupId) {
      const g = groups.find(x => x.id === groupId);
      els.groupModalTitle.textContent = '重命名分组';
      els.groupNameInput.value = g ? g.name : '';
    } else {
      els.groupModalTitle.textContent = '新建分组';
      els.groupNameInput.value = '';
    }
    openModal('#groupModal');
    setTimeout(() => els.groupNameInput.focus(), 100);
  }

  function handleGroupSave() {
    const name = els.groupNameInput.value.trim();
    if (!name) { toast('分组名称不能为空', 'warn'); return; }
    if (groupModalMode === 'rename' && editingGroupId) {
      renameGroup(editingGroupId, name);
    } else {
      addGroup(name);
    }
    closeModal('#groupModal');
  }

  // ---- 事件绑定 ----
  function bindEvents() {
    els.createBtn.onclick = openCreate;
    els.exportBtn.onclick = exportJSON;
    els.importBtn.onclick = () => els.fileInput.click();
    els.fileInput.onchange = handleFile;
    els.searchInput.oninput = handleSearch;
    els.searchClearBtn.onclick = () => { els.searchInput.value = ''; handleSearch(); };

    // 季节切换
    els.seasonPicker.addEventListener('click', e => {
      const b = e.target.closest('.season-btn');
      if (b) setSeason(b.dataset.season);
    });

    // 页面底色自定义
    if (els.pageColor) {
      els.pageColor.addEventListener('input', () => setPageColor(els.pageColor.value));
    }
    if (els.pageColorReset) {
      els.pageColorReset.addEventListener('click', () => {
        settings.pageColor = null;
        saveSettings();
        applySeasonBg(settings.season);
        toast('已恢复季节主题');
      });
    }

    // 天气切换
    if (els.weatherToggle) {
      els.weatherToggle.addEventListener('click', e => {
        const b = e.target.closest('.weather-btn');
        if (b) setWeather(b.dataset.weather);
      });
    }

    // 分组侧栏
    els.groupList.addEventListener('click', e => {
      const item = e.target.closest('.group-item');
      if (!item) return;
      const gid = item.dataset.groupId;
      const actBtn = e.target.closest('.group-actions button');
      if (actBtn) {
        e.stopPropagation();
        if (actBtn.dataset.act === 'rename') openGroupModal('rename', gid);
        else if (actBtn.dataset.act === 'delete') {
          const g = groups.find(x => x.id === gid);
          els.confirmText.textContent = `确定要删除分组「${g.name}」吗？该分组下的卡片将移至默认分组。`;
          pendingDeleteId = '__group_delete__' + gid;
          els.confirmOk.textContent = '确认删除';
          openModal('#confirmModal');
        }
        return;
      }
      if (e.target.classList.contains('group-drag-handle')) return;
      // 点击分组 → 筛选
      if (settings.activeGroupId === gid) settings.activeGroupId = null;
      else settings.activeGroupId = gid;
      saveSettings();
      render();
    });

    // 分组拖拽排序
    let dragSrcId = null;
    els.groupList.addEventListener('dragstart', e => {
      const item = e.target.closest('.group-item');
      if (!item) return;
      dragSrcId = item.dataset.groupId;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragSrcId);
    });
    els.groupList.addEventListener('dragend', e => {
      e.target.classList.remove('dragging');
      els.groupList.querySelectorAll('.group-item').forEach(i => i.classList.remove('drag-over'));
      dragSrcId = null;
    });
    els.groupList.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const item = e.target.closest('.group-item');
      els.groupList.querySelectorAll('.group-item').forEach(i => i.classList.remove('drag-over'));
      if (item && item.dataset.groupId !== dragSrcId) {
        item.classList.add('drag-over');
      }
    });
    els.groupList.addEventListener('dragleave', e => {
      e.target.classList.remove('drag-over');
    });
    els.groupList.addEventListener('drop', e => {
      e.preventDefault();
      const target = e.target.closest('.group-item');
      if (!target || !dragSrcId || target.dataset.groupId === dragSrcId) return;
      const srcIdx = groups.findIndex(g => g.id === dragSrcId);
      const tgtIdx = groups.findIndex(g => g.id === target.dataset.groupId);
      if (srcIdx < 0 || tgtIdx < 0) return;
      const [moved] = groups.splice(srcIdx, 1);
      groups.splice(tgtIdx, 0, moved);
      groups.forEach((g, i) => g.order = i);
      saveData();
      render();
    });

    els.addGroupBtn.onclick = () => openGroupModal('create');
    els.addGroupInlineBtn.onclick = () => openGroupModal('create');
    els.groupSaveBtn.onclick = handleGroupSave;
    els.groupNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleGroupSave(); });

    // 关闭按钮 + 遮罩关闭
    document.addEventListener('click', e => {
      if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) {
        const overlay = e.target.closest('.modal-overlay');
        if (overlay) overlay.hidden = true;
      }
    });
    $$('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.hidden = true; }));

    // 表单
    els.editForm.onsubmit = handleSubmit;
    els.editForm.querySelectorAll('input[name="bgType"]').forEach(r => {
      r.onchange = () => { updateBgVisibility(); updateBgPreview(); editingPresetId = null; updatePresetActive(); };
    });
    els.bgColor1.oninput = () => { updateBgPreview(); editingPresetId = null; updatePresetActive(); };
    els.bgColor2.oninput = () => { updateBgPreview(); editingPresetId = null; updatePresetActive(); };
    els.bgAngle.oninput = () => { els.angleVal.textContent = els.bgAngle.value + '°'; updateBgPreview(); };

    els.presetGrid.addEventListener('click', e => {
      const item = e.target.closest('.preset-item');
      if (!item) return;
      const p = PRESETS.find(x => x.id === item.dataset.id);
      if (!p) return;
      editingPresetId = p.id;
      const radio = els.editForm.querySelector('input[name="bgType"][value="gradient"]');
      if (radio) radio.checked = true;
      els.bgColor1.value = p.c1;
      els.bgColor2.value = p.c2;
      els.bgAngle.value = p.angle;
      els.angleVal.textContent = p.angle + '°';
      updateBgVisibility();
      updateBgPreview();
      updatePresetActive();
    });

    // 字体选择
    els.fontGrid.addEventListener('click', e => {
      const item = e.target.closest('.font-item');
      if (!item) return;
      editingFontId = item.dataset.font;
      renderFontGrid();
    });

    // 标签
    els.tagInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); addTag(els.tagInput.value); els.tagInput.value = ''; showTagSuggest(''); }
      else if (e.key === 'Backspace' && !els.tagInput.value && editingTags.length) { editingTags.pop(); renderTagList(); }
    });
    els.tagInput.addEventListener('input', () => showTagSuggest(els.tagInput.value));
    els.tagInput.addEventListener('blur', () => setTimeout(() => { els.tagSuggest.hidden = true; }, 200));
    els.tagList.addEventListener('click', e => { const rm = e.target.closest('.tag-remove'); if (rm) removeTag(parseInt(rm.dataset.i)); });
    els.tagSuggest.addEventListener('click', e => { const li = e.target.closest('li'); if (li) { addTag(li.dataset.tag); els.tagInput.value = ''; showTagSuggest(''); } });

    // 卡片事件委托
    document.addEventListener('click', e => {
      const card = e.target.closest('.card');
      const action = e.target.closest('.card-action');
      if (action && card) {
        e.stopPropagation();
        const id = card.dataset.id;
        const act = action.dataset.act;
        if (act === 'pin') togglePin(id);
        else if (act === 'edit') openEdit(id);
        else if (act === 'delete') requestDelete(id);
        return;
      }
      if (card && card.dataset.id && !card.dataset.id.startsWith('fill-')) openDetail(card.dataset.id);
    });

    // 详情弹窗
    els.detailEditBtn.onclick = () => { const id = currentDetailId; closeModal('#detailModal'); openEdit(id); };
    els.detailCopyBtn.onclick = () => { if (currentDetailId) { copyCard(currentDetailId); closeModal('#detailModal'); } };
    els.detailPinBtn.onclick = () => { if (currentDetailId) { togglePin(currentDetailId); openDetail(currentDetailId); } };
    els.detailDeleteBtn.onclick = () => { if (currentDetailId) requestDelete(currentDetailId); };

    els.deleteFromModalBtn.onclick = () => { if (editingId) requestDelete(editingId); };

    // 确认弹窗
    els.confirmCancel.onclick = () => { closeModal('#confirmModal'); pendingDeleteId = null; };
    els.confirmOk.onclick = () => {
      if (pendingDeleteId && pendingDeleteId.startsWith('__group_delete__')) {
        const gid = pendingDeleteId.replace('__group_delete__', '');
        const g = groups.find(x => x.id === gid);
        if (g) deleteGroup(gid);
        closeModal('#confirmModal');
        pendingDeleteId = null;
      } else if (pendingDeleteId === '__replace__') {
        const count = pendingImportData ? pendingImportData.length : 0;
        cards = pendingImportData ? pendingImportData.map(c => ({ ...c, id: c.id || uid() })) : [];
        saveData();
        render();
        closeModal('#confirmModal');
        closeModal('#importModal');
        toast(`已替换导入 ${count} 条数据`);
        pendingImportData = null;
        pendingDeleteId = null;
      } else if (pendingDeleteId) {
        doDelete(pendingDeleteId);
      }
    };

    els.importMerge.onclick = () => doImport('merge');
    els.importReplace.onclick = () => doImport('replace');

    // 空状态
    els.emptyState.addEventListener('click', e => {
      const g = e.target.closest('.guide-card');
      if (!g) return;
      if (g.dataset.action === 'import') els.fileInput.click();
      else openCreate();
    });

    // ESC
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') $$('.modal-overlay').forEach(m => { if (!m.hidden) m.hidden = true; });
    });
  }

  // ---- 初始化 ----
  function init() {
    initDom();
    const { cards: c, groups: g } = loadData();
    cards = c;
    initGroups(g);
    settings = loadSettings();
    buildPresetGrid();
    renderFontGrid();
    // 初始化 Canvas 系统
    rippleSystem = initRippleSystem();
    rainSystem = initRainSystem();
    setSeason(settings.season || 'spring');
    if (settings.pageColor) {
      els.pageColor && (els.pageColor.value = settings.pageColor);
      applySeasonBg(settings.season);
    } else {
      els.pageColor && (els.pageColor.value = getSeasonColor(settings.season));
    }
    // 恢复天气状态
    if (settings.weather === 'rainy' && rainSystem) {
      rainSystem.setActive(true);
      $$('.weather-btn').forEach(b => b.classList.toggle('active', b.dataset.weather === 'rainy'));
    }
    bindEvents();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
