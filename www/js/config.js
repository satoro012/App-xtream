/**
 * config.js
 * Identidade deste APK específico.
 * TENANT_ID muda a cada cliente que você compilar.
 * APP_SECRET é o mesmo em todos os APKs (validado no backend).
 */
const TENANT_ID = "tenant_TESTE"; // <- troca pelo ID gerado no painel
const APP_SECRET = "um_segredo_bem_forte_aqui_troque_isso_123xyz"; // <- mesmo valor do netlify env:set APP_SECRET
const PAINEL_BASE_URL = "https://SUA_URL_NETLIFY.netlify.app"; // <- troca depois do deploy
