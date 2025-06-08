// lab-extension-platform/background.js
import { GoogleDocsAPI } from '../lib/GoogleDocsAPI.js';
import { pluginRegistry } from '../plugins/pluginRegistry.js';

async function getStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result[key]);
    });
  });
}

async function setStorage(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

async function removeStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([key], () => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve();
    });
  });
}

/**
 * Processes a single plugin to generate a report.
 * Retrieves plugin data, calls the plugin's run function, stores the result,
 * and handles draft data cleanup.
 *
 * @param {string} pluginId - The ID of the plugin to process.
 * @param {GoogleDocsAPI} docsAPI - An instance of the GoogleDocsAPI.
 * @param {boolean} debugMode - If true, draft data will not be deleted.
 * @param {Object} plugin - The plugin object from the registry.
 * @returns {Promise<Object>} A promise that resolves to the report generation result.
 */
async function processPlugin(pluginId, docsAPI, debugMode, plugin) {
  const pluginStorageKey = `pluginResults:${pluginId}`;
  const draftStorageKey = `pluginDrafts:${pluginId}`;

  try {
    if (!plugin || typeof plugin.run !== 'function') {
      throw new Error(`Plugin ${pluginId} is not valid or does not have a run function.`);
    }

    const reportDataForPlugin = await getStorage(draftStorageKey);
    if (!reportDataForPlugin) {
      throw new Error(`No draft data found for plugin ${pluginId} at key ${draftStorageKey}`);
    }

    // TODO: Consider AI enrichment hooks from enrichment.js around this point,
    // potentially modifying reportDataForPlugin before it's used by the plugin.

    const reportResult = await plugin.run(reportDataForPlugin, docsAPI);

    await setStorage(pluginStorageKey, reportResult);
    console.log(`Successfully stored result for plugin ${pluginId} at key ${pluginStorageKey}`);

    if (!debugMode) {
      await removeStorage(draftStorageKey);
      console.log(`Successfully deleted draft data for plugin ${pluginId} from key ${draftStorageKey}`);
    }
    return reportResult; // Return the actual result for generateAllReports to collect

  } catch (error) {
    console.error(`Error processing plugin ${pluginId}:`, error);
    const errorResult = { success: false, error: error.message, documentId: null, url: null };
    try {
      await setStorage(pluginStorageKey, errorResult);
    } catch (storageError) {
      console.error(`Secondary error while trying to store error state for ${pluginId}:`, storageError);
    }
    return errorResult;
  }
}

/**
 * Generates reports for a list of specified plugins using a plugin registry and a single GoogleDocsAPI instance.
 *
 * @param {string[]} readyPlugins - An array of plugin IDs to generate reports for.
 * @param {boolean} debugMode - If true, draft data will not be deleted after report generation.
 * @returns {Promise<Object>} A promise that resolves to an object mapping plugin IDs to their report generation results.
 */
async function generateAllReports(readyPlugins, debugMode) {
  console.log('generateAllReports called with:', readyPlugins, 'Debug mode:', debugMode);
  const allResults = {};

  const docsAPI = new GoogleDocsAPI(); // Single instance for all plugins

  for (const pluginId of readyPlugins) {
    console.log(`Processing plugin: ${pluginId}`);

    const plugin = pluginRegistry.get(pluginId);

    if (!plugin) {
      console.error(`Plugin ${pluginId} not found in registry.`);
      allResults[pluginId] = { success: false, error: `Plugin ${pluginId} not found in registry.`, documentId: null, url: null };
      continue;
    }

    allResults[pluginId] = await processPlugin(pluginId, docsAPI, debugMode, plugin);
  }

  console.log('generateAllReports finished. Results:', allResults);
  return allResults;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "generateAllReports") {
    console.log("Received 'generateAllReports' message from popup:", message.payload);
    if (message.payload && Array.isArray(message.payload.readyPlugins) && typeof message.payload.debugMode === 'boolean') {
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
