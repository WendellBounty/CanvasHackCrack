const activate = () => {
  // Simplified activation logic
  chrome.storage.local.get({
    blockedUrls: [] // Get the blocked URLs from storage
  }, async prefs => {
    try {
      // Always unregister scripts before registering new ones
      await chrome.scripting.unregisterContentScripts();

      const props = {
        'allFrames': true,
        'matchOriginAsFallback': true,
        'runAt': 'document_start',
        'matches': ['*://*/*']
      };

      // Filter out invalid URLs and map to proper format
      const blockedHosts = prefs.blockedUrls
        .map(url => {
          try {
            // Ensure URL has a protocol for the URL constructor
            const fullUrl = url.trim().startsWith('http') ? url.trim() : `http://${url.trim()}`;
            const cleanedUrl = new URL(fullUrl);
            return `*://${cleanedUrl.hostname}/*`; // Match based on hostname
          } catch (e) {
            console.error(`Invalid URL skipped: ${url}`);
            return null; // Skip invalid URLs
          }
        })
        .filter(url => url !== null);

      const scriptConfig = {
        ...props,
        'id': 'main',
        'js': ['inject.js'],
        'world': 'MAIN'
      };
      
      if (blockedHosts.length > 0) {
        scriptConfig.excludeMatches = blockedHosts;
      }

      await chrome.scripting.registerContentScripts([scriptConfig]);

      console.log("CanvasHack scripts registered.", scriptConfig);

    } catch (e) {
      console.error('CanvasHack Blocker Registration Failed', e);
    }
  });
};

// Run activate when the extension starts up or is installed/updated
chrome.runtime.onStartup.addListener(activate);
chrome.runtime.onInstalled.addListener(activate);

// Listen for messages from the popup to update blocked URLs or reload tabs
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "reloadTab") {
    chrome.tabs.reload(sender.tab.id);
  } else if (request.action === 'updateBlockedUrls') {
    activate(); // Re-run activate to apply new blocking rules
  }
});