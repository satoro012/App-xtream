/**
 * backhandler.js
 * Faz o botão físico de Voltar do Android navegar entre as telas do app
 * (player -> lista, detalhe de série -> lista, ajustes -> lista, busca -> fecha busca)
 * em vez de fechar o app direto.
 */
(function () {
  function activeScreenId() {
    const el = document.querySelector('.screen.active');
    return el ? el.id : null;
  }

  function handleBack() {
    const screen = activeScreenId();

    if (screen === 'screen-player') {
      Player.close();
      return;
    }
    if (screen === 'screen-series-detail') {
      document.getElementById('btn-series-back').click();
      return;
    }
    if (screen === 'screen-settings') {
      document.getElementById('btn-settings-back').click();
      return;
    }
    if (screen === 'screen-app') {
      const searchBar = document.getElementById('search-bar');
      if (!searchBar.classList.contains('hidden')) {
        document.getElementById('btn-search-close').click();
        return;
      }
      // Já está na tela principal: sai do app
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.Capacitor.Plugins.App.exitApp();
      }
      return;
    }
    // Tela de login: sai do app
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.exitApp();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', handleBack);
    }
  });
})();
