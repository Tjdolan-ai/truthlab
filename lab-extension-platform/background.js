// lab-extension-platform/background.js
import { GoogleDocsAPI } from '../lib/GoogleDocsAPI.js';
import { pluginRegistry } from '../plugins/pluginRegistry.js'; // Import the registry

/**
 * Generates reports for a list of specified plugins.
 *
 * @param {string[]} readyPlugins - An array of plugin IDs to generate reports for.
 * @param {boolean} debugMode - If true, draft data will not be deleted after report generation.
 * @returns {Promise<Object>} A promise that resolves to an object mapping plugin IDs to their report generation results.
 */
async function generateAllReports(readyPlugins, debugMode) {
  console.log('generateAllReports called with:', readyPlugins, 'Debug mode:', debugMode, 'using plugin registry.');
  const allResults = {};

  for (const pluginId of readyPlugins) {
    console.log(`Processing plugin: ${pluginId}`);
    const pluginStorageKey = `pluginResults:${pluginId}`;
    const draftStorageKey = `pluginDrafts:${pluginId}`;

    try {
      // Find the plugin in the registry
      const plugin = pluginRegistry.find(p => p.id === pluginId);

      if (!plugin || typeof plugin.run !== 'function') {
        throw new Error(`Plugin ${pluginId} is not registered or does not have a valid run function.`);
      }

      const docsAPI = new GoogleDocsAPI();

      const storageData = await new Promise((resolve, reject) => {
        chrome.storage.local.get([draftStorageKey], (result) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve(result);
        });
      });

      const reportDataForPlugin = storageData[draftStorageKey];
      if (!reportDataForPlugin) {
        throw new Error(`No draft data found for plugin ${pluginId} at key ${draftStorageKey}`);
      }

      // Call the plugin's run function from the registry
      const reportResult = await plugin.run(reportDataForPlugin, docsAPI);

      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [pluginStorageKey]: reportResult }, () => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          resolve();
        });
      });
      console.log(`Successfully stored result for plugin ${pluginId} at key ${pluginStorageKey}`);
      allResults[pluginId] = reportResult;

      if (!debugMode) {
        await new Promise((resolve, reject) => {
          chrome.storage.local.remove([draftStorageKey], () => {
            if (chrome.runtime.lastError) {
              return reject(chrome.runtime.lastError);
            }
            resolve();
          });
        });
        console.log(`Successfully deleted draft data for plugin ${pluginId} from key ${draftStorageKey}`);
      }

    } catch (error) {
      console.error(`Error processing plugin ${pluginId}:`, error);
      const errorResult = { success: false, error: error.message, documentId: null, url: null };
      try {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ [pluginStorageKey]: errorResult }, () => {
            if (chrome.runtime.lastError) {
              console.error(`Failed to store error result for ${pluginId}:`, chrome.runtime.lastError.message);
            }
            resolve();
          });
        });
      } catch (storageError) {
        console.error(`Secondary error while trying to store error state for ${pluginId}:`, storageError);
      }
      allResults[pluginId] = errorResult;
    }
  }

  console.log('generateAllReports finished. Results:', allResults);
  return allResults;
}

// Message listener remains the same
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "generateAllReports") {
    console.log("Received generateAllReports message from popup:", message.payload);
    if (message.payload && message.payload.readyPlugins && typeof message.payload.debugMode === 'boolean') {
      generateAllReports(message.payload.readyPlugins, message.payload.debugMode)
        .then(results => {
          console.log("Sending response to popup:", { results });
          sendResponse({ results: results });
        })
        .catch(error => {
          console.error("Error in generateAllReports from message listener:", error);
          sendResponse({ error: error.message });
        });
      return true;
    } else {
      console.error("Invalid payload for generateAllReports message:", message.payload);
      sendResponse({ error: "Invalid payload for generateAllReports message." });
      return false;
    }
  }
});
