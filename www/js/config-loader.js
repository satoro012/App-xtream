/**
 * config-loader.js
 * Busca a configuração do cliente (logo, cores, servidor Xtream) no painel
 * e aplica no app antes de mostrar a tela de login.
 */
const ConfigLoader = (() => {
  let tenantConfig = null;
  let xtreamServer = null;

  async function carregar() {
    try {
      const res = await fetch(`${PAINEL_BASE_URL}/.netlify/functions/getTenantConfig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: TENANT_ID, app_secret: APP_SECRET })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      tenantConfig = data.public;
      xtreamServer = data.xtream_server;

      aplicarVisual(tenantConfig);
      salvarCache(data);
      return true;
    } catch (err) {
      console.error('Falha ao carregar config do painel:', err);
      // Tenta usar o último cache salvo (app funciona offline/painel fora do ar)
      const cache = carregarCache();
      if (cache) {
        tenantConfig = cache.public;
        xtreamServer = cache.xtream_server;
        aplicarVisual(tenantConfig);
        return true;
      }
      return false;
    }
  }

  function aplicarVisual(config) {
    if (!config) return;

    // Logo
    if (config.logo_url) {
      document.querySelectorAll('.app-logo, #boot-splash .app-logo-img').forEach(el => {
        if (el.tagName === 'IMG') el.src = config.logo_url;
      });
    }

    // Nome do app
    if (config.client_name) {
      document.querySelectorAll('.app-name-label').forEach(el => {
        el.textContent = config.client_name;
      });
      document.title = config.client_name;
    }

    // Cores
    if (config.colors) {
      const root = document.documentElement;
      if (config.colors.bg) root.style.setProperty('--app-bg', config.colors.bg);
      if (config.colors.accent) root.style.setProperty('--app-accent', config.colors.accent);
    }
  }

  function salvarCache(data) {
    try {
      localStorage.setItem('tenant_config_cache', JSON.stringify(data));
    } catch (e) {}
  }

  function carregarCache() {
    try {
      const raw = localStorage.getItem('tenant_config_cache');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getXtreamServer() {
    return xtreamServer;
  }

  function getConfig() {
    return tenantConfig;
  }

  return { carregar, getXtreamServer, getConfig };
})();
