(function () {
  'use strict';
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function debounce(fn, ms) {
    let t;
    return function () { const a = arguments, self = this; clearTimeout(t); t = setTimeout(() => fn.apply(self, a), ms); };
  }
  const APP_VERSION = '1.0.0';
  const CW_KEY = 'mvi_continue_v2';

  const state = {
    view: 'inicio',
    live:   { categories: [], streams: [], filterCat: '', search: '' },
    vod:    { categories: [], streams: [], filterCat: '', search: '' },
    series: { categories: [], streams: [], filterCat: '', search: '' },
    search: '',
    favTab: 'live',
    lastSeriesId: null
  };

  // ---------- Continuar assistindo (posição real via player nativo) ----------
  function getCwList() {
    try { return JSON.parse(localStorage.getItem(CW_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveCwList(list) {
    try { localStorage.setItem(CW_KEY, JSON.stringify(list.slice(0, 30))); } catch (e) {}
  }
  function getCwEntry(key) {
    return getCwList().find(x => x.key === key) || null;
  }
  function upsertCwEntry(entry) {
    let list = getCwList().filter(x => x.key !== entry.key);
    list.unshift(entry);
    saveCwList(list);
  }
  function updateCwProgress(key, positionMs, durationMs) {
    const list = getCwList();
    const idx = list.findIndex(x => x.key === key);
    if (idx === -1) return;
    list[idx].positionMs = positionMs;
    if (durationMs) list[idx].durationMs = durationMs;
    list[idx].ts = Date.now();
    saveCwList(list);
  }
  function removeCwEntry(key) {
    saveCwList(getCwList().filter(x => x.key !== key));
  }

  function handleProgress(data) {
    if (!data || !data.itemKey) return;
    updateCwProgress(data.itemKey, data.positionMs || 0, data.durationMs || 0);
  }
  function handleEnded(data) {
    if (!data || !data.itemKey) return;
    removeCwEntry(data.itemKey);
  }

  function bindLogin() {
    const form = $('#login-form'); const errBox = $('#login-error');
    const load = $('#login-loading'); const btn = $('#btn-login');
    function showError(msg) { errBox.textContent = msg; errBox.hidden = false; }
    function clearError() { errBox.hidden = true; }
    function setLoading(v) { load.hidden = !v; btn.disabled = v; btn.textContent = v ? 'Conectando...' : 'Entrar'; }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault(); clearError();
      const server = ConfigLoader.getXtreamServer();
      const user   = $('#inp-user').value.trim();
      const pass   = $('#inp-pass').value;
      if (!server) { showError('Configuração do app não carregada. Verifique sua conexão e tente novamente.'); return; }
      if (!user || !pass) { showError('Preencha usuário e senha.'); return; }
      API.setCredentials(server, user, pass);
      setLoading(true);
      try {
        const res = await API.authenticate();
        const authOk = res && res.user_info && String(res.user_info.auth) === '1';
        if (!authOk) throw new Error('Usuário ou senha inválidos.');
        Storage.saveCredentials(server, user, pass);
        await enterApp();
      } catch (e) {
        const m = (e && e.message) || '';
        if (/failed to fetch|network/i.test(m)) showError('Não foi possível conectar. Verifique o servidor e a internet.');
        else showError(m || 'Falha ao conectar.');
      } finally { setLoading(false); }
    });
  }

  async function tryAutoLogin() {
    const c = Storage.getCredentials();
    if (!c.server || !c.user || !c.pass) return false;
    API.setCredentials(c.server, c.user, c.pass);
    try {
      const res = await API.authenticate();
      if (res && res.user_info && String(res.user_info.auth) === '1') { await enterApp(); return true; }
    } catch (e) {}
    return false;
  }

  async function enterApp() {
    $('#screen-login').classList.remove('active');
    $('#screen-app').classList.add('active');
    showContentLoading(true);
    await loadAllContent();
    showContentLoading(false);
    switchView('inicio');
  }

  function showContentLoading(show) {
    let el = $('#content-loading');
    if (!el) {
      const cfg = (window.ConfigLoader && ConfigLoader.getConfig) ? ConfigLoader.getConfig() : null;
      const hasLogo = cfg && cfg.logo_url;
      el = document.createElement('div');
      el.id = 'content-loading';
      el.innerHTML = `
        <div class="content-loading-inner">
          ${hasLogo ? `<img src="${esc(cfg.logo_url)}" class="cl-logo" alt="">` : `<div class="cl-logo-fallback">${esc((cfg && cfg.client_name) || 'MeuIPTV')}</div>`}
          <div class="boot-spinner"></div>
          <span>Carregando conteúdo...</span>
        </div>`;
      document.body.appendChild(el);
    }
    el.style.display = show ? 'flex' : 'none';
  }

  const VIEW_TITLES = {
    inicio: 'Início', canais: 'Canais', filmes: 'Filmes', series: 'Séries',
    continuar: 'Continuar assistindo',
    favoritos: 'Favoritos', pesquisa: 'Pesquisa', config: 'Configurações',
    'serie-detail': 'Série'
  };

  function bindNav() {
    $$('#bottom-nav .nav-btn').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  function switchView(name) {
    state.view = name;
    $$('.view').forEach(v => v.classList.remove('active'));
    const el = $('#view-' + name); if (el) el.classList.add('active');
    $('#view-title').textContent = VIEW_TITLES[name] || '';
    $$('#bottom-nav .nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    if (name === 'inicio')    renderInicio();
    if (name === 'canais')    renderCanais();
    if (name === 'filmes')    renderFilmes();
    if (name === 'series')    renderSeries();
    if (name === 'continuar') renderContinuar();
    if (name === 'favoritos') renderFavoritos();
    if (name === 'pesquisa')  renderPesquisa();
    if (name === 'config')    renderConfig();
  }

  async function loadAllContent() {
    try {
      const [lc, ls, vc, vs, sc, ss] = await Promise.all([
        API.getLiveCategories().catch(() => []),
        API.getLiveStreams().catch(() => []),
        API.getVodCategories().catch(() => []),
        API.getVodStreams().catch(() => []),
        API.getSeriesCategories().catch(() => []),
        API.getSeriesList().catch(() => [])
      ]);
      state.live.categories   = Array.isArray(lc) ? lc : [];
      state.live.streams      = Array.isArray(ls) ? ls : [];
      state.vod.categories    = Array.isArray(vc) ? vc : [];
      state.vod.streams       = Array.isArray(vs) ? vs : [];
      state.series.categories = Array.isArray(sc) ? sc : [];
      state.series.streams    = Array.isArray(ss) ? ss : [];
    } catch (e) { console.error(e); }
  }

  function catName(list, id) {
    const found = list.find(c => String(c.category_id) === String(id));
    return found ? found.category_name : '';
  }

  function channelCard(item) {
    const id = item.stream_id;
    const fav = Storage.isFavorite('live', id) ? 'on' : '';
    const logo = item.stream_icon || '';
    const cat  = catName(state.live.categories, item.category_id);
    return `
      <div class="card" data-id="${esc(id)}" data-type="live" tabindex="0">
        <div class="card-img landscape">
          ${logo ? `<img src="${esc(logo)}" loading="lazy" onerror="this.style.display='none'">` : ''}
          <div class="card-fallback">📺</div>
          <button class="fav-btn ${fav}" data-fav="1">★</button>
        </div>
        <div class="card-body">
          <div class="card-title">${esc(item.name || 'Sem nome')}</div>
          <div class="card-sub">${esc(cat || 'Canal')}</div>
        </div>
      </div>`;
  }

  function movieCard(item) {
    const id = item.stream_id;
    const fav = Storage.isFavorite('vod', id) ? 'on' : '';
    const img = item.stream_icon || item.cover || '';
    const cat = catName(state.vod.categories, item.category_id);
    return `
      <div class="card" data-id="${esc(id)}" data-type="vod" tabindex="0">
        <div class="card-img">
          ${img ? `<img src="${esc(img)}" loading="lazy" onerror="this.style.display='none'">` : ''}
          <div class="card-fallback">🎬</div>
          <button class="fav-btn ${fav}" data-fav="1">★</button>
        </div>
        <div class="card-body">
          <div class="card-title">${esc(item.name || 'Sem título')}</div>
          <div class="card-sub">${esc(cat || 'Filme')}</div>
        </div>
      </div>`;
  }

  function seriesCard(item) {
    const id = item.series_id;
    const fav = Storage.isFavorite('series', id) ? 'on' : '';
    const img = item.cover || '';
    const cat = catName(state.series.categories, item.category_id);
    return `
      <div class="card" data-id="${esc(id)}" data-type="series" tabindex="0">
        <div class="card-img">
          ${img ? `<img src="${esc(img)}" loading="lazy" onerror="this.style.display='none'">` : ''}
          <div class="card-fallback">📽️</div>
          <button class="fav-btn ${fav}" data-fav="1">★</button>
        </div>
        <div class="card-body">
          <div class="card-title">${esc(item.name || 'Sem título')}</div>
          <div class="card-sub">${esc(cat || 'Série')}</div>
        </div>
      </div>`;
  }

  function cwCard(it) {
    const pct = it.durationMs ? Math.min(100, Math.round((it.positionMs / it.durationMs) * 100)) : 0;
    return `
      <div class="card" data-cwkey="${esc(it.key)}" tabindex="0">
        <div class="card-img">
          ${it.icon ? `<img src="${esc(it.icon)}" loading="lazy" onerror="this.style.display='none'">` : ''}
          <div class="card-fallback">▶️</div>
          <div class="cw-progress"><div class="cw-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="card-body">
          <div class="card-title">${esc(it.title)}</div>
          <div class="card-sub">${esc(it.subtitle || 'Continuar')}</div>
        </div>
      </div>`;
  }

  function filterList(list, filterCat, query) {
    const q = (query || '').toLowerCase().trim();
    return list.filter(item => {
      if (filterCat && String(item.category_id) !== String(filterCat)) return false;
      if (!q) return true;
      return String(item.name || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  function wireGrid(gridEl) {
    gridEl.addEventListener('click', (ev) => {
      const favBtn = ev.target.closest('.fav-btn');
      const card   = ev.target.closest('.card');
      if (!card) return;
      const id = card.dataset.id; const kind = card.dataset.type;
      if (favBtn) {
        ev.stopPropagation();
        const item = findItem(kind, id);
        if (!item) return;
        const on = Storage.toggleFavorite(kind, buildFav(kind, item));
        favBtn.classList.toggle('on', on);
        return;
      }
      if (kind === 'live')   playLive(id, card.querySelector('.card-title').textContent);
      if (kind === 'vod')    playVod(id, card.querySelector('.card-title').textContent);
      if (kind === 'series') openSeriesDetail(id);
    });
  }

  function findItem(kind, id) {
    const list = kind === 'live' ? state.live.streams : kind === 'vod' ? state.vod.streams : state.series.streams;
    return list.find(x => String(kind === 'series' ? x.series_id : x.stream_id) === String(id));
  }

  function buildFav(kind, item) {
    if (kind === 'live') return { id: item.stream_id, name: item.name, icon: item.stream_icon, category_id: item.category_id };
    if (kind === 'vod')  return { id: item.stream_id, name: item.name, icon: item.stream_icon || item.cover, category_id: item.category_id, container_extension: item.container_extension };
    return { id: item.series_id, name: item.name, icon: item.cover, category_id: item.category_id };
  }

  // ---------- Início ----------
  function renderInicio() {
    const el = $('#view-inicio');
    el.innerHTML = `
      <div class="home-wrap">
        <div class="home-grid">
          <div class="home-card" data-go="canais"><div class="hc-icon">📺</div><div class="hc-label">Canais</div></div>
          <div class="home-card" data-go="filmes"><div class="hc-icon">🎬</div><div class="hc-label">Filmes</div></div>
          <div class="home-card" data-go="series"><div class="hc-icon">📽️</div><div class="hc-label">Séries</div></div>
          <div class="home-card hc-continuar" data-go="continuar"><div class="hc-icon">▶️</div><div class="hc-label">Continuar assistindo</div></div>
        </div>
      </div>`;
    el.querySelectorAll('.home-card').forEach(c => {
      c.addEventListener('click', () => switchView(c.dataset.go));
    });
  }

  // ---------- Continuar assistindo ----------
  function renderContinuar() {
    const el = $('#view-continuar');
    const list = getCwList();
    if (!list.length) {
      el.innerHTML = '<div class="empty">Nada para continuar assistindo ainda.</div>';
      return;
    }
    el.innerHTML = `<div class="grid" id="continuar-grid">${list.map(cwCard).join('')}</div>`;
    const grid = $('#continuar-grid');
    grid.addEventListener('click', (ev) => {
      const card = ev.target.closest('.card'); if (!card) return;
      const key = card.dataset.cwkey;
      const entry = getCwEntry(key);
      if (!entry) return;
      Player.open(entry.url, entry.title, { isLive: false, key: entry.key, startPositionMs: entry.positionMs || 0 });
    });
  }

  function renderCanais() {
    const el = $('#view-canais');
    el.innerHTML = `
      <div class="toolbar">
        <input type="search" class="search-inp" id="canais-search" placeholder="Buscar canal..." value="${esc(state.live.search)}">
        <div class="cat-bar" id="canais-cats"></div>
      </div>
      <div class="grid" id="canais-grid"></div>
      <div class="empty" id="canais-empty" hidden>Nenhum canal encontrado.</div>`;
    renderCatBar('#canais-cats', state.live.categories, state.live.filterCat, (cat) => { state.live.filterCat = cat; renderCanais(); });
    renderCanaisGrid();
    $('#canais-search').addEventListener('input', debounce((e) => { state.live.search = e.target.value; renderCanaisGrid(); }, 220));
  }

  function renderCanaisGrid() {
    const grid = $('#canais-grid'); const empty = $('#canais-empty'); if (!grid) return;
    const list = filterList(state.live.streams, state.live.filterCat, state.live.search);
    grid.innerHTML = list.slice(0, 400).map(channelCard).join('');
    empty.hidden = list.length > 0;
    wireGrid(grid);
  }

  function renderFilmes() {
    const el = $('#view-filmes');
    el.innerHTML = `
      <div class="toolbar">
        <input type="search" class="search-inp" id="filmes-search" placeholder="Buscar filme..." value="${esc(state.vod.search)}">
        <div class="cat-bar" id="filmes-cats"></div>
      </div>
      <div class="grid" id="filmes-grid"></div>
      <div class="empty" id="filmes-empty" hidden>Nenhum filme encontrado.</div>`;
    renderCatBar('#filmes-cats', state.vod.categories, state.vod.filterCat, (cat) => { state.vod.filterCat = cat; renderFilmes(); });
    renderFilmesGrid();
    $('#filmes-search').addEventListener('input', debounce((e) => { state.vod.search = e.target.value; renderFilmesGrid(); }, 220));
  }

  function renderFilmesGrid() {
    const grid = $('#filmes-grid'); const empty = $('#filmes-empty'); if (!grid) return;
    const list = filterList(state.vod.streams, state.vod.filterCat, state.vod.search);
    grid.innerHTML = list.slice(0, 400).map(movieCard).join('');
    empty.hidden = list.length > 0;
    wireGrid(grid);
  }

  function renderSeries() {
    const el = $('#view-series');
    el.innerHTML = `
      <div class="toolbar">
        <input type="search" class="search-inp" id="series-search" placeholder="Buscar série..." value="${esc(state.series.search)}">
        <div class="cat-bar" id="series-cats"></div>
      </div>
      <div class="grid" id="series-grid"></div>
      <div class="empty" id="series-empty" hidden>Nenhuma série encontrada.</div>`;
    renderCatBar('#series-cats', state.series.categories, state.series.filterCat, (cat) => { state.series.filterCat = cat; renderSeries(); });
    renderSeriesGrid();
    $('#series-search').addEventListener('input', debounce((e) => { state.series.search = e.target.value; renderSeriesGrid(); }, 220));
  }

  function renderSeriesGrid() {
    const grid = $('#series-grid'); const empty = $('#series-empty'); if (!grid) return;
    const list = filterList(state.series.streams, state.series.filterCat, state.series.search);
    grid.innerHTML = list.slice(0, 400).map(seriesCard).join('');
    empty.hidden = list.length > 0;
    wireGrid(grid);
  }

  function renderCatBar(sel, categories, active, onPick) {
    const el = $(sel); if (!el) return;
    let html = `<button class="cat-chip ${!active ? 'active' : ''}" data-cat="">Todos</button>`;
    html += categories.map(c => `
      <button class="cat-chip ${String(active) === String(c.category_id) ? 'active' : ''}" data-cat="${esc(c.category_id)}">${esc(c.category_name)}</button>
    `).join('');
    el.innerHTML = html;
    el.querySelectorAll('.cat-chip').forEach(btn => { btn.addEventListener('click', () => onPick(btn.dataset.cat)); });
  }

  async function openSeriesDetail(seriesId) {
    state.lastSeriesId = seriesId;
    switchView('serie-detail');
    const el = $('#view-serie-detail');
    el.innerHTML = `<div class="empty">Carregando informações da série...</div>`;
    let info;
    try { info = await API.getSeriesInfo(seriesId); }
    catch (e) { el.innerHTML = `<div class="empty">Não foi possível carregar a série.<br>${esc(e.message || '')}</div>`; return; }

    const meta = (info && info.info) || {};
    const epBySeason = (info && info.episodes) || {};
    const seasonsList = (info && info.seasons) || [];
    const cover = meta.cover || meta.movie_image || '';
    const title = meta.name || '';
    const plot  = meta.plot || meta.description || '';
    const seasonKeys = Object.keys(epBySeason).sort((a, b) => Number(a) - Number(b));

    el.innerHTML = `
      <div class="sd-head">
        ${cover ? `<img src="${esc(cover)}" alt="">` : `<div class="ph"></div>`}
        <div class="sd-meta">
          <h2>${esc(title || 'Série')}</h2>
          <p>${esc(plot || 'Sem descrição.')}</p>
        </div>
      </div>
      <div class="season-bar" id="season-bar"></div>
      <div class="ep-list" id="ep-list"></div>`;

    const seasonBar = $('#season-bar'); const epList = $('#ep-list');
    seasonBar.innerHTML = seasonKeys.map((k, i) => {
      const sObj = seasonsList.find(s => String(s.season_number) === String(k)) || {};
      const name = sObj.name || ('Temporada ' + k);
      return `<button class="cat-chip ${i === 0 ? 'active' : ''}" data-season="${esc(k)}">${esc(name)}</button>`;
    }).join('');

    function showSeason(key) {
      $$('#season-bar .cat-chip').forEach(b => b.classList.toggle('active', b.dataset.season === key));
      const eps = epBySeason[key] || [];
      epList.innerHTML = eps.map(ep => {
        const num = ep.episode_num != null ? ep.episode_num : '';
        const t = ep.title || ('Episódio ' + num);
        return `<div class="ep-item" tabindex="0" data-ep="${esc(ep.id)}" data-ext="${esc(ep.container_extension || 'mp4')}"><span>${esc(t)}</span><small>Ep. ${esc(num)}</small></div>`;
      }).join('') || '<div class="empty">Sem episódios.</div>';
      epList.querySelectorAll('.ep-item').forEach(item => {
        item.addEventListener('click', () => {
          const epId = item.dataset.ep, ext = item.dataset.ext;
          const url = API.seriesUrl(epId, ext);
          const epLabel = item.querySelector('span').textContent;
          const label = (title ? title + ' — ' : '') + epLabel;
          const key = 'ep:' + epId;
          const existing = getCwEntry(key);
          const startPositionMs = existing ? existing.positionMs : 0;
          upsertCwEntry({
            key, title: title || 'Série', subtitle: epLabel, icon: cover,
            url, positionMs: startPositionMs,
            durationMs: existing ? existing.durationMs : 0, ts: Date.now()
          });
          Player.open(url, label, { isLive: false, key, startPositionMs });
        });
      });
    }

    seasonBar.querySelectorAll('.cat-chip').forEach(btn => {
      btn.addEventListener('click', () => showSeason(btn.dataset.season));
    });
    if (seasonKeys.length) showSeason(seasonKeys[0]);
  }

  function playLive(id, title) { Player.open(API.liveUrl(id), title || 'Canal ao vivo', { isLive: true }); }

  async function playVod(id, title) {
    let ext = 'mp4';
    const item = state.vod.streams.find(x => String(x.stream_id) === String(id));
    if (item && item.container_extension) ext = item.container_extension;
    else { try { const info = await API.getVodInfo(id); if (info && info.movie_data && info.movie_data.container_extension) ext = info.movie_data.container_extension; } catch (e) {} }
    const icon = item ? (item.stream_icon || item.cover || '') : '';
    const url = API.vodUrl(id, ext);
    const key = 'vod:' + id;
    const existing = getCwEntry(key);
    const startPositionMs = existing ? existing.positionMs : 0;
    upsertCwEntry({
      key, title: title || (item && item.name) || 'Filme', subtitle: 'Filme', icon,
      url, positionMs: startPositionMs,
      durationMs: existing ? existing.durationMs : 0, ts: Date.now()
    });
    Player.open(url, title || 'Filme', { isLive: false, key, startPositionMs });
  }

  function renderFavoritos() {
    const el = $('#view-favoritos');
    const f  = Storage.getFavorites();
    el.innerHTML = `
      <div class="toolbar">
        <div class="cat-bar" id="fav-tabs">
          <button class="cat-chip ${state.favTab==='live'?'active':''}"   data-tab="live">Canais (${f.live.length})</button>
          <button class="cat-chip ${state.favTab==='vod'?'active':''}"    data-tab="vod">Filmes (${f.vod.length})</button>
          <button class="cat-chip ${state.favTab==='series'?'active':''}" data-tab="series">Séries (${f.series.length})</button>
        </div>
      </div>
      <div class="grid" id="fav-grid"></div>
      <div class="empty" id="fav-empty" hidden>Nenhum favorito nesta categoria.</div>`;
    $$('#fav-tabs .cat-chip').forEach(b => {
      b.addEventListener('click', () => { state.favTab = b.dataset.tab; renderFavoritos(); });
    });
    const tab = state.favTab;
    const list = f[tab] || [];
    const grid = $('#fav-grid'); const empty = $('#fav-empty');
    grid.innerHTML = list.map(it => {
      const kind = tab === 'live' ? 'live' : (tab === 'vod' ? 'vod' : 'series');
      const img  = it.icon || '';
      const fallback = kind === 'live' ? '📺' : (kind === 'vod' ? '🎬' : '📽️');
      const landClass = kind === 'live' ? 'landscape' : '';
      return `
        <div class="card" data-id="${esc(it.id)}" data-type="${kind}" tabindex="0">
          <div class="card-img ${landClass}">
            ${img ? `<img src="${esc(img)}" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div class="card-fallback">${fallback}</div>
            <button class="fav-btn on" data-fav="1">★</button>
          </div>
          <div class="card-body">
            <div class="card-title">${esc(it.name || '')}</div>
            <div class="card-sub">Favorito</div>
          </div>
        </div>`;
    }).join('');
    empty.hidden = list.length > 0;
    grid.addEventListener('click', (ev) => {
      const favBtn = ev.target.closest('.fav-btn'); const card = ev.target.closest('.card');
      if (!card) return;
      const id = card.dataset.id, kind = card.dataset.type;
      if (favBtn) {
        ev.stopPropagation();
        const ff = Storage.getFavorites();
        ff[kind] = (ff[kind] || []).filter(x => String(x.id) !== String(id));
        Storage.saveFavorites(ff); renderFavoritos(); return;
      }
      if (kind === 'live')   playLive(id, card.querySelector('.card-title').textContent);
      if (kind === 'vod')    playVod(id, card.querySelector('.card-title').textContent);
      if (kind === 'series') openSeriesDetail(id);
    });
  }

  function renderPesquisa() {
    const el = $('#view-pesquisa');
    el.innerHTML = `
      <div class="toolbar">
        <input type="search" class="search-inp" id="global-search" placeholder="Buscar em canais, filmes e séries..." value="${esc(state.search)}">
      </div>
      <div id="global-results"></div>`;
    const inp = $('#global-search');
    inp.addEventListener('input', debounce((e) => { state.search = e.target.value; renderGlobalResults(); }, 220));
    setTimeout(() => inp.focus(), 50);
    renderGlobalResults();
  }

  function renderGlobalResults() {
    const box = $('#global-results');
    const q = state.search.trim().toLowerCase();
    if (!q) { box.innerHTML = '<div class="empty">Digite algo para começar a pesquisar.</div>'; return; }
    const live = state.live.streams.filter(i => (i.name || '').toLowerCase().includes(q)).slice(0, 40);
    const vod  = state.vod.streams.filter(i => (i.name || '').toLowerCase().includes(q)).slice(0, 40);
    const ser  = state.series.streams.filter(i => (i.name || '').toLowerCase().includes(q)).slice(0, 40);
    const hasAny = live.length || vod.length || ser.length;
    box.innerHTML = `
      ${live.length ? `<div class="toolbar"><div class="view-title">Canais (${live.length})</div></div><div class="grid" id="gs-live">${live.map(channelCard).join('')}</div>` : ''}
      ${vod.length ? `<div class="toolbar"><div class="view-title">Filmes (${vod.length})</div></div><div class="grid" id="gs-vod">${vod.map(movieCard).join('')}</div>` : ''}
      ${ser.length ? `<div class="toolbar"><div class="view-title">Séries (${ser.length})</div></div><div class="grid" id="gs-series">${ser.map(seriesCard).join('')}</div>` : ''}
      ${!hasAny ? '<div class="empty">Nenhum resultado encontrado.</div>' : ''}`;
    ['gs-live','gs-vod','gs-series'].forEach(id => {
      const g = $('#' + id); if (g) wireGrid(g);
    });
  }

  function renderConfig() {
    const el = $('#view-config');
    const c = Storage.getCredentials();
    el.innerHTML = `
      <div class="cfg-list">
        <div class="cfg-item"><span class="k">Servidor</span><span class="v">${esc(c.server || '-')}</span></div>
        <div class="cfg-item"><span class="k">Usuário</span><span class="v">${esc(c.user || '-')}</span></div>
        <div class="cfg-item"><span class="k">Senha</span><span class="v">••••••••</span></div>
        <button class="cfg-btn primary" id="cfg-refresh">🔄 Atualizar conteúdo</button>
        <button class="cfg-btn danger"  id="cfg-clear">🧹 Limpar dados da conta</button>
        <button class="cfg-btn danger"  id="cfg-logout">🚪 Sair</button>
        <div class="version">MeuIPTV v${APP_VERSION}</div>
      </div>`;
    $('#cfg-refresh').addEventListener('click', async () => {
      state.live.streams = []; state.vod.streams = []; state.series.streams = [];
      state.live.categories = []; state.vod.categories = []; state.series.categories = [];
      showContentLoading(true);
      await loadAllContent();
      showContentLoading(false);
      switchView(state.view);
      alert('Conteúdo atualizado.');
    });
    $('#cfg-clear').addEventListener('click', () => {
      if (!confirm('Isso apagará servidor, usuário, senha e favoritos. Continuar?')) return;
      Storage.clearAll(); location.reload();
    });
    $('#cfg-logout').addEventListener('click', () => {
      $('#screen-app').classList.remove('active');
      $('#screen-login').classList.add('active');
    });
  }

  function bindBackButton() {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', () => {
        if (!$('#player-overlay').classList.contains('hidden')) { Player.close(); return; }
        if (state.view === 'serie-detail') { switchView('series'); return; }
        if (state.view !== 'inicio') { switchView('inicio'); return; }
        window.Capacitor.Plugins.App.exitApp();
      });
    }
  }

  function hideBootSplash() {
    const splash = $('#boot-splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => { splash.style.display = 'none'; }, 300);
    }
  }

  async function init() {
    const cfgOk = await ConfigLoader.carregar();
    if (!cfgOk) console.warn('Não foi possível carregar configuração do cliente.');
    Player.init();
    Player.onProgress(handleProgress);
    Player.onEnded(handleEnded);
    bindLogin();
    bindNav();
    bindBackButton();
    const ok = await tryAutoLogin();
    if (!ok) {
      $('#screen-login').classList.add('active');
      $('#screen-app').classList.remove('active');
    }
    hideBootSplash();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
