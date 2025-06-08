// lab-extension-platform/draftChecker.js

import { pluginRegistry } from './plugins/pluginRegistry.js';

/**
 * Checks chrome.storage.local for plugin draft data.
 * @returns {Promise<string[]>} A promise that resolves with an array of plugin IDs that have draft data.
 */
export const getReadyPlugins = () => {
  return new Promise((resolve) => {
    const readyPlugins = [];
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.warn('chrome.storage.local API not available. Returning empty list of ready plugins.');
      resolve([]);
      return;
    }

    if (!pluginRegistry || pluginRegistry.length === 0) {
      console.warn('Plugin registry is empty. Returning empty list of ready plugins.');
      resolve([]);
      return;
    }

    let checkedPlugins = 0;
    const totalPlugins = pluginRegistry.length;

    pluginRegistry.forEach((plugin) => {
      if (!plugin || !plugin.id) {
        console.warn('Encountered a plugin without an ID. Skipping.');
        checkedPlugins++;
        if (checkedPlugins === totalPlugins) {
          resolve(readyPlugins);
        }
        return;
      }

      const draftKey = `pluginDrafts:${plugin.id}`;
      try {
        chrome.storage.local.get([draftKey], (result) => {
          // Check if an error occurred during storage access
          if (chrome.runtime.lastError) {
            console.error(`Error accessing storage for ${draftKey}:`, chrome.runtime.lastError.message);
          } else if (result && result[draftKey] !== undefined) {
            readyPlugins.push(plugin.id);
          }
          checkedPlugins++;
          if (checkedPlugins === totalPlugins) {
            resolve(readyPlugins);
          }
        });
      } catch (error) {
        console.error(`Exception when trying to access chrome.storage.local for ${draftKey}:`, error);
        checkedPlugins++;
        if (checkedPlugins === totalPlugins) {
          resolve(readyPlugins);
        }
      }
    });
  });
};
