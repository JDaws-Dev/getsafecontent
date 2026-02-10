// SafeTube Chrome Extension - Popup Script

const API_BASE = 'https://rightful-rabbit-333.convex.site'; // SafeTubes production

// State management
let kids = [];
let selectedKids = [];

// DOM elements
const stateLoading = document.getElementById('state-loading');
const stateLogin = document.getElementById('state-login');
const stateConnected = document.getElementById('state-connected');

const loginForm = document.getElementById('login-form');
const familyCodeInput = document.getElementById('family-code');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

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
      <div class="kid-avatar ${kid.color}">${kid.icon || kid.name.charAt(0).toUpperCase()}</div>
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

// Fetch kids from API
async function fetchKids(familyCode) {
  const response = await fetch(`${API_BASE}/extension/get-kids?familyCode=${familyCode}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to get kids');
  }

  return data.kids;
}

// Initialize popup
async function init() {
  try {
    const stored = await chrome.storage.local.get(['familyCode', 'selectedKids', 'kids']);

    if (stored.familyCode && stored.kids?.length) {
      // Already connected - show connected state
      kids = stored.kids;
      selectedKids = stored.selectedKids || [];
      renderKids();
      showState(stateConnected);
    } else if (stored.familyCode) {
      // Have code but no kids - try to fetch
      try {
        kids = await fetchKids(stored.familyCode);
        selectedKids = kids.map(k => k.id); // Default: all kids selected
        await chrome.storage.local.set({ kids, selectedKids });
        renderKids();
        showState(stateConnected);
      } catch {
        // Invalid code - show login
        await chrome.storage.local.clear();
        showState(stateLogin);
      }
    } else {
      // Not connected - show login
      showState(stateLogin);
    }
  } catch (error) {
    console.error('Init error:', error);
    showState(stateLogin);
  }
}

// Handle login form submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const familyCode = familyCodeInput.value.trim().toUpperCase();
  if (!familyCode || familyCode.length < 6) {
    showError('Please enter your 6-character family code');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Connecting...';

  try {
    kids = await fetchKids(familyCode);

    if (!kids.length) {
      showError('No kids found. Add kids in your SafeTube dashboard first.');
      return;
    }

    // Default: all kids selected
    selectedKids = kids.map(k => k.id);

    // Save to storage
    await chrome.storage.local.set({ familyCode, kids, selectedKids });

    // Show connected state
    renderKids();
    showState(stateConnected);

  } catch (error) {
    showError(error.message || 'Invalid family code');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Connect';
  }
});

// Handle save button
saveBtn.addEventListener('click', async () => {
  if (selectedKids.length === 0) {
    alert('Please select at least one kid');
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
  familyCodeInput.value = '';
  showState(stateLogin);
});

// Auto-uppercase family code input
familyCodeInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// Initialize
init();
