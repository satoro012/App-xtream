(function () {
  'use strict';
  const API = {
    server: '', username: '', password: '',
    setCredentials(server, user, pass) {
      let s = String(server || '').trim().replace(/\/+$/, '');
      if (s && !/^https?:\/\//i.test(s)) s = 'http://' + s;
      this.server = s;
      this.username = String(user || '').trim();
      this.password = String(pass || '');
    },
    _base() { return 'username=' + encodeURIComponent(this.username) + '&password=' + encodeURIComponent(this.password); },
    async _fetch(url) {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error('Erro HTTP ' + res.status);
      const text = await res.text();
      try { return JSON.parse(text); } catch (e) { throw new Error('Resposta inválida do servidor.'); }
    },
    authenticate() { return this._fetch(this.server + '/player_api.php?' + this._base()); },
    getLiveCategories() { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_live_categories'); },
    getLiveStreams() { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_live_streams'); },
    getVodCategories() { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_vod_categories'); },
    getVodStreams() { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_vod_streams'); },
    getVodInfo(vodId) { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_vod_info&vod_id=' + encodeURIComponent(vodId)); },
    getSeriesCategories() { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_series_categories'); },
    getSeriesList() { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_series'); },
    getSeriesInfo(seriesId) { return this._fetch(this.server + '/player_api.php?' + this._base() + '&action=get_series_info&series_id=' + encodeURIComponent(seriesId)); },
    liveUrl(streamId) { return this.server + '/live/' + this.username + '/' + this.password + '/' + streamId + '.m3u8'; },
    vodUrl(streamId, ext) { return this.server + '/movie/' + this.username + '/' + this.password + '/' + streamId + '.' + (ext || 'mp4'); },
    seriesUrl(episodeId, ext) { return this.server + '/series/' + this.username + '/' + this.password + '/' + episodeId + '.' + (ext || 'mp4'); }
  };
  window.API = API;
})();

/**
 * Sobrescreve a função que monta a URL do servidor:
 * agora vem do ConfigLoader (painel), não mais digitado pelo usuário.
 */
function getServidorConfigurado() {
  return ConfigLoader.getXtreamServer();
}
