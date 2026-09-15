(function () {
  'use strict';
  const PREFIX = 'meuiptv_';
  function enc(s) { try { return btoa(unescape(encodeURIComponent(String(s)))); } catch (e) { return String(s); } }
  function dec(s) { try { return decodeURIComponent(escape(atob(String(s)))); } catch (e) { return String(s); } }

  const Storage = {
    set(key, val) { try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) {} },
    get(key, def) { try { const raw = localStorage.getItem(PREFIX + key); return raw === null ? def : JSON.parse(raw); } catch (e) { return def; } },
    remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) {} },
    clearAll() { try { Object.keys(localStorage).forEach(k => { if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k); }); } catch (e) {} },

    saveCredentials(server, user, pass) { this.set('server', server); this.set('user', user); this.set('pass', enc(pass)); },
    getCredentials() { return { server: this.get('server',''), user: this.get('user',''), pass: dec(this.get('pass','')) }; },
    clearCredentials() { this.remove('server'); this.remove('user'); this.remove('pass'); },

    getFavorites() {
      const f = this.get('favorites', null);
      if (!f || typeof f !== 'object') return { live: [], vod: [], series: [] };
      f.live = f.live || []; f.vod = f.vod || []; f.series = f.series || [];
      return f;
    },
    saveFavorites(f) { this.set('favorites', f); },
    isFavorite(type, id) { const f = this.getFavorites(); return (f[type] || []).some(x => String(x.id) === String(id)); },
    toggleFavorite(type, item) {
      const f = this.getFavorites();
      if (!f[type]) f[type] = [];
      const idx = f[type].findIndex(x => String(x.id) === String(item.id));
      if (idx >= 0) { f[type].splice(idx, 1); this.saveFavorites(f); return false; }
      f[type].push(item); this.saveFavorites(f); return true;
    },
    getPref(k, d) { return this.get('pref_' + k, d); },
    setPref(k, v) { this.set('pref_' + k, v); }
  };
  window.Storage = Storage;
})();
