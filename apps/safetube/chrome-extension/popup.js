// SafeTube Chrome Extension - Popup Script

const API_BASE = 'https://rightful-rabbit-333.convex.site'; // SafeTubes production
const SAFETUBE_URL = 'https://getsafetube.com/admin';

// State management
let kids = [];
let selectedKids = [];

// DOM elements
const stateLoading = document.getElementById('state-loading');
const stateLogin = document.getElementById('state-login');
const stateConnected = document.getElementById('state-connected');

const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const connectedLabel = document.getElementById('connected-label');

const kidsList = document.getElementById('kids-list');
const saveBtn = document.getElementById('save-btn');
const disconnectBtn = document.getElementById('disconnect-btn');

// Show a specific state
function showState(state) {
  stateLoading.classList.remove('active');
  stateLogin.classList.remove('active');
  stateConnected.classList.remove('active');
  state.classList.add('active');
}

// Show error
function showError(message) {
  loginError.textContent = message;
  loginError.style.display = 'block';
}

// Hide error
function hideError() {
  loginError.style.display = 'none';
}

// Render kids list
function renderKids() {
  kidsList.innerHTML = kids.map(kid => `
    <div class="kid-item ${selectedKids.includes(kid.id) ? 'selected' : ''}" data-id="${kid.id}">
      <div class="kid-avatar ${kid.color}">${kid.name.charAt(0).toUpperCase()}</div>
      <span class="kid-name">${kid.name}</span>
      <div class="kid-check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.kid-item').forEach(item => {
    item.addEventListener('click', () => {
      const kidId = item.dataset.id;
      if (selectedKids.includes(kidId)) {
        selectedKids = selectedKids.filter(id => id !== kidId);
      } else {
        selectedKids.push(kidId);
      }
      renderKids();
    });
  });
}

// Fetch kids as the signed-in parent. Throws { signIn: true } when the token
// is missing/expired so the caller can send the parent back to the site.
async function fetchKids(userToken) {
  const response = await fetch(`${API_BASE}/extension/get-kids`, {
    headers: { 'Authorization': `Bearer ${userToken}` },
  });
  const data = await response.json();

  if (response.status === 401) {
    const err = new Error(data.error || 'Please sign in to SafeTube again.');
    err.signIn = true;
    throw err;
  }
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get kids');
  }

  return data;
}

// Initialize popup
async function init() {
  hideError();
  try {
    const stored = await chrome.storage.local.get(['userToken', 'selectedKids', 'kids']);

    if (!stored.userToken) {
      showState(stateLogin);
      return;
    }

    // Always re-fetch on open: validates the token and picks up new kids.
    const data = await fetchKids(stored.userToken);
    kids = data.kids;

    if (!kids.length) {
      showState(stateLogin);
      showError('No kids found. Add kids in your SafeTube dashboard first.');
      return;
    }

    const knownIds = kids.map(k => k.id);
    // Keep the parent's previous selection; new kids default to selected.
    if (Array.isArray(stored.selectedKids) && stored.kids?.length) {
      const previouslyKnown = new Set(stored.kids.map(k => k.id));
      selectedKids = knownIds.filter(id => !previouslyKnown.has(id) || stored.selectedKids.includes(id));
    } else {
      selectedKids = knownIds;
    }

    await chrome.storage.local.set({ kids, selectedKids });
    if (data.email) connectedLabel.textContent = `Connected as ${data.email}`;
    renderKids();
    showState(stateConnected);
  } catch (error) {
    console.error('Init error:', error);
    if (error.signIn) {
      await chrome.storage.local.remove(['userToken', 'tokenSavedAt']);
      showState(stateLogin);
      showError('Your SafeTube sign-in has expired. Open SafeTube and sign in again.');
    } else {
      showState(stateLogin);
      showError(error.message || 'Could not reach SafeTube. Check your connection.');
    }
  }
}

// "Open SafeTube to connect" — the connect script on getsafetube.com copies the
// sign-in over once the parent is logged in there.
loginBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: SAFETUBE_URL });
});

// If the popup is still open when the token lands, connect live.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.userToken?.newValue) init();
});

// Handle save button
saveBtn.addEventListener('click', async () => {
  if (selectedKids.length === 0) {
    saveBtn.textContent = 'Pick at least one kid';
    setTimeout(() => { saveBtn.textContent = 'Save Selection'; }, 1500);
    return;
  }

  await chrome.storage.local.set({ selectedKids });

  saveBtn.textContent = 'Saved!';
  setTimeout(() => {
    saveBtn.textContent = 'Save Selection';
  }, 1500);
});

// Handle disconnect
disconnectBtn.addEventListener('click', async () => {
  await chrome.storage.local.clear();
  kids = [];
  selectedKids = [];
  showState(stateLogin);
});

// Initialize
init();
