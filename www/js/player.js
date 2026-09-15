(function () {
  'use strict';
  const Player = {
    video: null, overlay: null, titleEl: null, errEl: null, currentUrl: '', onCloseCb: null,
    init() {
      this.video = document.getElementById('video');
      this.overlay = document.getElementById('player-overlay');
      this.titleEl = document.getElementById('player-title');
      this.errEl = document.getElementById('player-error');
      document.getElementById('player-close').addEventListener('click', () => this.close());
      document.getElementById('player-fs').addEventListener('click', () => this.toggleFullscreen());
      this.video.addEventListener('error', () => {
        this.showError('Não foi possível reproduzir este conteúdo. O servidor pode estar offline, o formato não é suportado ou o link expirou.');
      });
      this.video.addEventListener('playing', () => { this.errEl.hidden = true; });
    },
    open(url, title, onClose) {
      if (!url) return;
      this.currentUrl = url;
      this.titleEl.textContent = title || '';
      this.onCloseCb = onClose || null;
      this.overlay.classList.remove('hidden');
      this.errEl.hidden = true;
      this.video.src = url;
      const p = this.video.play();
      if (p && p.catch) p.catch(() => {});
    },
    close() {
      try { this.video.pause(); this.video.removeAttribute('src'); this.video.load(); } catch (e) {}
      this.overlay.classList.add('hidden');
      this.currentUrl = '';
      const cb = this.onCloseCb; this.onCloseCb = null;
      if (cb) cb();
    },
    toggleFullscreen() {
      const v = this.video;
      if (document.fullscreenElement) { document.exitFullscreen && document.exitFullscreen(); }
      else if (v.requestFullscreen) { v.requestFullscreen(); }
      else if (v.webkitEnterFullscreen) { v.webkitEnterFullscreen(); }
    },
    showError(msg) { this.errEl.textContent = msg; this.errEl.hidden = false; }
  };
  window.Player = Player;
})();
