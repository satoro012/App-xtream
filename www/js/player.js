const Player = (() => {
  let onCloseCallback = null;

  function init() {}

  async function open(url, title, onClose) {
    onCloseCallback = onClose || null;
    
    try {
      const { VideoPlayer } = window.Capacitor.Plugins;
      await VideoPlayer.playVideo({ url, title });
      if (onCloseCallback) onCloseCallback();
    } catch (e) {
      console.error('Erro ao tocar vídeo:', e);
      if (onCloseCallback) onCloseCallback();
    }
  }

  function close() {
    if (onCloseCallback) onCloseCallback();
  }

  return { init, open, close };
})();
