// SafeTube Chrome Extension - Connect Script
// Runs on getsafefamily.com (SafeTube lives at /tube; the old getsafetube.com
// address forwards there). Mirrors the parent's sign-in token from the web app
// into extension storage, so the extension acts as the signed-in parent
// without ever asking for a password (and so Google sign-in just works).
//
// The web app keeps its login in localStorage under `safefamily_jwt` (the one
// shared Safe Family sign-in); `safetube_jwt` is the pre-one-site key. Logging in
// happens in-page (no reload), so we poll briefly rather than rely on events.

(function () {
  'use strict';

  const JWT_KEYS = ['safefamily_jwt', 'safetube_jwt'];
  let lastSeen = undefined;

  async function sync() {
    let token = null;
    try {
      token = JWT_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) || null;
    } catch {
      return;
    }
    if (token === lastSeen) return;
    lastSeen = token;

    if (token) {
      await chrome.storage.local.set({ userToken: token, tokenSavedAt: Date.now() });
    } else {
      // Parent logged out of the site — the extension shouldn't keep acting as them.
      await chrome.storage.local.remove(['userToken', 'tokenSavedAt', 'kids']);
    }
  }

  sync();
  // Cheap: one localStorage read every 2s while a SafeTube tab is open.
  setInterval(sync, 2000);
})();
