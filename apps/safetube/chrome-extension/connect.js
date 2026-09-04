// SafeTube Chrome Extension - Connect Script
// Runs on getsafetube.com. Mirrors the parent's sign-in token from the web app
// into extension storage, so the extension acts as the signed-in parent
// without ever asking for a password (and so Google sign-in just works).
//
// The web app keeps its login in localStorage under `safetube_jwt`. Logging in
// happens in-page (no reload), so we poll briefly rather than rely on events.

(function () {
  'use strict';

  const JWT_KEY = 'safetube_jwt';
  let lastSeen = undefined;

  async function sync() {
    let token = null;
    try {
      token = localStorage.getItem(JWT_KEY);
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
