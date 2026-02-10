// SafeTube Chrome Extension - Content Script
// Runs on YouTube video pages and Shorts

(function() {
  'use strict';

  const API_BASE = 'https://rightful-rabbit-333.convex.site'; // SafeTubes production

  let currentVideoId = null;
  let buttonContainer = null;

  // Check if we're on a Shorts page
  function isShorts() {
    return location.pathname.startsWith('/shorts/');
  }

  // Extract video ID from URL
  function getVideoId() {
    if (isShorts()) {
      // Shorts URL: /shorts/VIDEO_ID
      const match = location.pathname.match(/\/shorts\/([^\/\?]+)/);
      return match ? match[1] : null;
    } else {
      // Regular video URL: /watch?v=VIDEO_ID
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('v');
    }
  }

  // Get video metadata from the page
  function getVideoMetadata() {
    const videoId = getVideoId();
    if (!videoId) return null;

    let title, channelTitle, channelId;

    if (isShorts()) {
      // Shorts page selectors
      const titleElement = document.querySelector('ytd-reel-video-renderer[is-active] #title') ||
                           document.querySelector('h2.title') ||
                           document.querySelector('[id="title"]');
      title = titleElement?.textContent?.trim() || 'YouTube Short';

      const channelElement = document.querySelector('ytd-reel-video-renderer[is-active] ytd-channel-name a') ||
                            document.querySelector('ytd-channel-name a') ||
                            document.querySelector('#channel-name a');
      channelTitle = channelElement?.textContent?.trim() || 'Unknown Channel';

      const channelLink = channelElement?.href || '';
      const channelIdMatch = channelLink.match(/\/(channel|c|@)\/([^\/\?]+)/);
      channelId = channelIdMatch ? channelIdMatch[2] : channelTitle;
    } else {
      // Regular video page selectors - YouTube updates their DOM frequently
      const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
                           document.querySelector('h1.style-scope.ytd-watch-metadata yt-formatted-string') ||
                           document.querySelector('h1.ytd-watch-metadata') ||
                           document.querySelector('h1.title') ||
                           document.querySelector('#title h1') ||
                           document.querySelector('yt-formatted-string.style-scope.ytd-watch-metadata');
      title = titleElement?.textContent?.trim() || 'Unknown Title';

      // Try multiple selectors for channel name - YouTube's structure varies
      const channelElement = document.querySelector('#owner #channel-name a') ||
                            document.querySelector('ytd-channel-name #text a') ||
                            document.querySelector('ytd-channel-name a') ||
                            document.querySelector('#upload-info #channel-name a') ||
                            document.querySelector('#channel-name #text-container a') ||
                            document.querySelector('.ytd-channel-name a') ||
                            document.querySelector('#owner-sub-count')?.closest('#owner')?.querySelector('a');

      // Also try to get from meta tags as fallback
      const metaChannelName = document.querySelector('meta[itemprop="name"]')?.content ||
                              document.querySelector('link[itemprop="name"]')?.content ||
                              document.querySelector('span[itemprop="author"] link[itemprop="name"]')?.content;

      channelTitle = channelElement?.textContent?.trim() || metaChannelName || 'Unknown Channel';

      const channelLink = channelElement?.href || '';
      const channelIdMatch = channelLink.match(/\/(channel|c|@)\/([^\/\?]+)/);
      channelId = channelIdMatch ? channelIdMatch[2] : channelTitle;
    }

    // Get duration from video element
    const videoElement = document.querySelector('video');
    const durationSeconds = videoElement ? Math.floor(videoElement.duration) : 0;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Thumbnail
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      videoId,
      title,
      thumbnailUrl,
      channelId,
      channelTitle,
      duration,
      durationSeconds
    };
  }

  // Create the SafeTube button
  function createButton(forShorts = false) {
    const container = document.createElement('div');
    container.id = 'safetube-button-container';

    if (forShorts) {
      container.className = 'safetube-shorts-container';
      container.innerHTML = `
        <button id="safetube-add-btn" class="safetube-btn safetube-shorts-btn">
          <svg class="safetube-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M10 8l6 4-6 4V8z" fill="currentColor"></path>
          </svg>
          <span>SafeTube</span>
        </button>
      `;
    } else {
      container.innerHTML = `
        <button id="safetube-add-btn" class="safetube-btn">
          <svg class="safetube-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M10 8l6 4-6 4V8z" fill="currentColor"></path>
          </svg>
          <span>Add to SafeTube</span>
        </button>
      `;
    }
    return container;
  }

  // Show feedback message
  function showFeedback(message, isSuccess) {
    const btn = document.getElementById('safetube-add-btn');
    if (!btn) return;

    const originalHTML = btn.innerHTML;
    const shortLabel = isShorts();

    btn.innerHTML = `
      <svg class="safetube-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${isSuccess
          ? '<path d="M20 6L9 17l-5-5"></path>'
          : '<circle cx="12" cy="12" r="10"></circle><path d="M15 9l-6 6M9 9l6 6"></path>'}
      </svg>
      <span>${shortLabel ? (isSuccess ? 'Added!' : 'Error') : message}</span>
    `;
    btn.classList.add(isSuccess ? 'safetube-success' : 'safetube-error');

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.classList.remove('safetube-success', 'safetube-error');
    }, 2500);
  }

  // Handle button click
  async function handleAddClick() {
    const btn = document.getElementById('safetube-add-btn');
    if (!btn) return;

    // Get stored family code and selected kids
    const stored = await chrome.storage.local.get(['familyCode', 'selectedKids']);

    if (!stored.familyCode) {
      showFeedback('Set up in extension popup first', false);
      return;
    }

    if (!stored.selectedKids?.length) {
      showFeedback('Select kids in popup first', false);
      return;
    }

    const shortLabel = isShorts();

    // Show loading state
    btn.innerHTML = `
      <svg class="safetube-icon safetube-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
      </svg>
      <span>${shortLabel ? '...' : 'Adding...'}</span>
    `;
    btn.disabled = true;

    try {
      const metadata = getVideoMetadata();
      if (!metadata) {
        throw new Error('Could not get video info');
      }

      const response = await fetch(`${API_BASE}/extension/add-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyCode: stored.familyCode,
          kidProfileIds: stored.selectedKids,
          ...metadata
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add video');
      }

      showFeedback(`Added for ${data.addedFor} kid${data.addedFor > 1 ? 's' : ''}!`, true);

    } catch (error) {
      console.error('SafeTube error:', error);
      showFeedback(error.message || 'Failed to add', false);
    } finally {
      btn.disabled = false;
    }
  }

  // Inject button into YouTube page
  function injectButton() {
    const videoId = getVideoId();
    if (!videoId) return;

    // Don't re-inject for same video
    if (currentVideoId === videoId && document.getElementById('safetube-button-container')) return;
    currentVideoId = videoId;

    // Remove old button if exists
    const existing = document.getElementById('safetube-button-container');
    if (existing) existing.remove();

    let target = null;

    if (isShorts()) {
      // Shorts page - inject near the action buttons (like, comment, share)
      const targetSelectors = [
        'ytd-reel-video-renderer[is-active] #actions',  // Active short's actions
        '#actions',  // Fallback
        'ytd-shorts-video-renderer #actions',
      ];

      for (const selector of targetSelectors) {
        target = document.querySelector(selector);
        if (target) break;
      }
    } else {
      // Regular video page
      const targetSelectors = [
        '#top-level-buttons-computed',  // Next to like/share buttons
        '#actions #menu',               // Alternate location
        '#info-contents #top-row',      // Another fallback
      ];

      for (const selector of targetSelectors) {
        target = document.querySelector(selector);
        if (target) break;
      }
    }

    if (!target) {
      console.log('SafeTube: Could not find injection target');
      return;
    }

    buttonContainer = createButton(isShorts());

    // Insert at the right spot
    if (isShorts()) {
      // For Shorts, insert at the top of the actions column
      target.insertBefore(buttonContainer, target.firstChild);
    } else if (target.id === 'top-level-buttons-computed') {
      // Insert as first child of button row
      target.insertBefore(buttonContainer, target.firstChild);
    } else {
      target.appendChild(buttonContainer);
    }

    // Add click handler
    const btn = document.getElementById('safetube-add-btn');
    if (btn) {
      btn.addEventListener('click', handleAddClick);
    }
  }

  // Wait for YouTube's dynamic content to load
  function waitForElement(selectors, callback, maxAttempts = 30) {
    let attempts = 0;
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];

    const check = () => {
      for (const selector of selectorList) {
        const element = document.querySelector(selector);
        if (element) {
          callback();
          return;
        }
      }
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(check, 500);
      }
    };
    check();
  }

  // Initialize on page load
  function init() {
    if (isShorts()) {
      waitForElement([
        'ytd-reel-video-renderer[is-active] #actions',
        '#actions',
        'ytd-shorts-video-renderer #actions'
      ], injectButton);
    } else if (location.pathname === '/watch') {
      waitForElement('#top-level-buttons-computed', injectButton);
    }
  }

  // YouTube uses SPA navigation, so we need to watch for URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      currentVideoId = null; // Reset to allow new injection
      if (url.includes('/watch') || url.includes('/shorts/')) {
        setTimeout(init, 1000); // Give YouTube time to render
      }
    }
  }).observe(document.body, { subtree: true, childList: true });

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
