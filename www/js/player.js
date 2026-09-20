const Player = (() => {
  let progressHandler = null;
  let endedHandler = null;
  let listenersReady = false;

  function init() {
    if (listenersReady) return;
    try {
      const { VideoPlayer } = window.Capacitor.Plugins;
      VideoPlayer.addListener('progress', (data) => { if (progressHandler) progressHandler(data); });
      VideoPlayer.addListener('ended', (data) => { if (endedHandler) endedHandler(data); });
      listenersReady = true;
    } catch (e) { console.error('Não foi possível registrar listeners do player:', e); }
  }

  function onProgress(cb) { progressHandler = cb; }
  function onEnded(cb) { endedHandler = cb; }

  async function open(url, title, opts) {
    opts = opts || {};
    try {
      const { VideoPlayer } = window.Capacitor.Plugins;
      await VideoPlayer.playVideo({
        url,
        title,
        isLive: !!opts.isLive,
        itemKey: opts.key || '',
        startPositionMs: opts.startPositionMs || 0
      });
    } catch (e) {
      console.error('Erro ao tocar vídeo:', e);
    }
  }

  function close() {}

  return { init, open, close, onProgress, onEnded };
})();
