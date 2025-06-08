// lab-extension-platform/background.js
// This is an illustrative background script for the plugin platform.

import { enrichAllPluginDrafts } from './lib/enrichment.js';
import { pluginRegistry } from './plugins/pluginRegistry.js'; // Assuming this is where plugins are listed

// This is a hypothetical list of plugins that are ready for processing.
// In a real extension, this might be determined dynamically.
// For the issue, it's referred to as 'readyPlugins'.
// We'll use the pluginRegistry as a stand-in for 'readyPlugins' for this example.
const readyPlugins = pluginRegistry; // Example: using all registered plugins

/**
 * Example function that triggers the enrichment process.
 * This could be called on a browser alarm, on startup, or in response to a message.
 */
async function performDraftEnrichment() {
  console.log('Background: Starting scheduled draft enrichment process...');

  if (!readyPlugins || readyPlugins.length === 0) {
    console.log('Background: No ready plugins to process. Enrichment skipped.');
    return;
  }

  try {
    const updatedDraftsMap = await enrichAllPluginDrafts(readyPlugins);
    console.log('Background: Enrichment process completed.');

    // The updatedDraftsMap contains pluginId -> enrichedDraftObject pairs.
    // You can now do something with this map, e.g., notify other parts of the extension,
    // or just log success.
    updatedDraftsMap.forEach((draft, pluginId) => {
      if (draft) {
        console.log(`Background: Plugin ${pluginId} was processed. New summary (if changed): ${draft.reportData && draft.reportData.aiLabSummary ? draft.reportData.aiLabSummary.substring(0,100)+'...' : 'N/A'}`);
      } else {
        console.log(`Background: Plugin ${pluginId} processing resulted in null (e.g. no draft or error).`);
      }
    });

    // Output as per issue spec (updatedDrafts: Map of pluginId to enriched draft objects)
    // This variable 'updatedDraftsMap' is the required output.
    // If this were triggered by a message, this map could be part of the response.

  } catch (error) {
    console.error('Background: An error occurred during the draft enrichment process:', error);
  }
}

// --- Example Triggers ---

// 1. On extension startup (after a brief delay to allow initialization)
chrome.runtime.onStartup.addListener(() => {
  console.log('Plugin platform background script started.');
  setTimeout(performDraftEnrichment, 5000); // Delay to ensure other things might be ready
});

// 2. Periodically (e.g., using an alarm)
// chrome.alarms.create('draftEnrichmentAlarm', { periodInMinutes: 60 });
// chrome.alarms.onAlarm.addListener((alarm) => {
//   if (alarm.name === 'draftEnrichmentAlarm') {
//     performDraftEnrichment();
//   }
// });

// 3. In response to a message (e.g., from a popup or options page)
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'triggerEnrichment') {
//     performDraftEnrichment().then(updatedDraftsMap => {
//       sendResponse({ success: true, data: updatedDraftsMap });
//     }).catch(error => {
//       sendResponse({ success: false, error: error.message });
//     });
//     return true; // Indicates asynchronous response
//   }
// });

// For demonstration, let's call it once when the script is loaded (e.g., on install/update)
// This is primarily for easy testing of the flow.
// In a production extension, you'd use a more robust trigger like onStartup or an alarm.
if (chrome && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      console.log('Extension installed/updated. Performing initial draft enrichment.');
      performDraftEnrichment();
    }
  });
} else {
  // Fallback for environments where onInstalled might not be typical (e.g. dev reloading)
  // Be cautious with calling this directly at the global scope if not desired on every load.
  // console.log('Executing performDraftEnrichment on script load (dev).');
  // performDraftEnrichment();
}

console.log('Plugin platform background.js loaded.');
// Note: The actual 'readyPlugins' list and how it's obtained needs to be
// confirmed with the overall architecture of the lab-extension-platform.
// The 'pluginRegistry' is used as a placeholder here.
