// lab-extension-platform/lib/enrichment.js

import { generateAiSummary } from './aiService.js';

// Placeholder texts that indicate a summary is missing or generic.
const PLACEHOLDER_SUMMARIES = [
  '', // Empty string
  'No summary provided.',
  'Enter AI lab analysis results here...',
  'No AI Lab Summary data available from previous API call. Please run the lab analysis first to populate this section with detailed findings and recommendations.',
  // Add any other common placeholder strings you might encounter.
];

/**
 * Retrieves a plugin draft from chrome.storage.local.
 * @param {string} pluginId - The ID of the plugin.
 * @returns {Promise<object|null>} The draft data or null if not found/error.
 */
async function getPluginDraft(pluginId) {
  const key = `pluginDrafts:${pluginId}`;
  try {
    // Ensure chrome.storage is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.error('chrome.storage.local is not available. Cannot get plugin draft.');
      return null;
    }
    const result = await chrome.storage.local.get([key]);
    if (chrome.runtime.lastError) {
      console.error(`Error retrieving draft for ${pluginId}:`, chrome.runtime.lastError.message);
      return null;
    }
    return result[key] || null;
  } catch (error) {
    console.error(`Exception while retrieving draft for ${pluginId}:`, error);
    return null;
  }
}

/**
 * Saves a plugin draft to chrome.storage.local.
 * @param {string} pluginId - The ID of the plugin.
 * @param {object} draftData - The data to save.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function savePluginDraft(pluginId, draftData) {
  const key = `pluginDrafts:${pluginId}`;
  try {
    // Ensure chrome.storage is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      console.error('chrome.storage.local is not available. Cannot save plugin draft.');
      return false;
    }
    await chrome.storage.local.set({ [key]: draftData });
    if (chrome.runtime.lastError) {
      console.error(`Error saving draft for ${pluginId}:`, chrome.runtime.lastError.message);
      return false;
    }
    console.log(`Successfully saved updated draft for ${pluginId}`);
    return true;
  } catch (error) {
    console.error(`Exception while saving draft for ${pluginId}:`, error);
    return false;
  }
}

/**
 * Enriches the aiLabSummary of a plugin's draft data if it's missing or a placeholder.
 *
 * @param {string} pluginId - The ID of the plugin whose draft needs enrichment.
 * @returns {Promise<object|null>} A promise that resolves to the updated draft data
 *                                  if enrichment was performed and saved,
 *                                  the original draft data if no enrichment was needed,
 *                                  or null if an error occurred or the draft wasn't found.
 */
export async function enrichPluginDraft(pluginId) {
  console.log(`Starting enrichment process for plugin: ${pluginId}`);

  const draftData = await getPluginDraft(pluginId);

  if (!draftData) {
    console.warn(`No draft data found for plugin ${pluginId}. Skipping enrichment.`);
    return null;
  }

  if (!draftData.reportData) {
    console.warn(`No reportData found in draft for plugin ${pluginId}. Skipping enrichment.`);
    return draftData;
  }

  const currentSummary = draftData.reportData.aiLabSummary ? draftData.reportData.aiLabSummary.trim() : '';
  const needsEnrichment = PLACEHOLDER_SUMMARIES.some(placeholder => placeholder.trim() === currentSummary);

  if (needsEnrichment) {
    console.log(`AI Lab Summary for ${pluginId} is missing or placeholder. Attempting enrichment.`);
    const { aiLabSummary, ...inputForAI } = draftData.reportData;
    const newSummary = await generateAiSummary(inputForAI);

    if (newSummary) {
      const updatedReportData = { ...draftData.reportData, aiLabSummary: newSummary };
      const updatedDraftData = { ...draftData, reportData: updatedReportData };

      const saveSuccess = await savePluginDraft(pluginId, updatedDraftData);
      if (saveSuccess) {
        console.log(`Successfully enriched and saved draft for ${pluginId}`);
        return updatedDraftData;
      } else {
        console.error(`Failed to save enriched draft for ${pluginId}. Returning original data.`);
        return draftData;
      }
    } else {
      console.error(`AI summary generation failed for ${pluginId}. No changes made.`);
      return draftData;
    }
  } else {
    console.log(`AI Lab Summary for ${pluginId} is already present and not a placeholder. No enrichment needed.`);
    return draftData;
  }
}

/**
 * Orchestrates the enrichment process for all plugins listed in readyPlugins.
 *
 * @param {Array<object>} readyPlugins - An array of plugin objects. Each object is expected
 *                                       to have an 'id' property (string).
 * @returns {Promise<Map<string, object>>} A promise that resolves to a Map where keys are
 *                                          pluginIds and values are the (potentially)
 *                                          enriched draft objects. If a plugin had no draft
 *                                          or an error occurred, its entry might be missing
 *                                          or its value might be null/original draft.
 */
export async function enrichAllPluginDrafts(readyPlugins) {
  console.log('Starting enrichment for all ready plugins.');
  const updatedDrafts = new Map();

  if (!readyPlugins || !Array.isArray(readyPlugins)) {
    console.error('readyPlugins is not a valid array. Cannot proceed.');
    return updatedDrafts; // Return empty map
  }

  if (readyPlugins.length === 0) {
    console.log('No ready plugins to process.');
    return updatedDrafts;
  }

  // Using a for...of loop to handle async operations sequentially if needed,
  // or Promise.all for parallel execution.
  // For this use case, processing them sequentially might be safer with storage operations.
  for (const plugin of readyPlugins) {
    if (!plugin || typeof plugin.id !== 'string') {
      console.warn('Encountered invalid plugin object or missing plugin ID. Skipping:', plugin);
      continue;
    }
    const pluginId = plugin.id;
    let success = false;
    let errorMessage = null;
    let enrichedDraftResult = null;

    try {
      enrichedDraftResult = await enrichPluginDraft(pluginId);
      if (enrichedDraftResult) { // Could be original or updated draft
        updatedDrafts.set(pluginId, enrichedDraftResult);
        success = true;
      } else {
        // If enrichPluginDraft returned null (e.g. no draft found, error)
        updatedDrafts.set(pluginId, null);
        success = false;
        errorMessage = `Plugin ${pluginId}: Enrichment process resulted in null or no changes (e.g., no draft found or internal error during enrichment).`;
        console.log(`No draft or error for plugin ${pluginId}, result set to null in map.`);
      }
    } catch (error) {
      console.error(`Unhandled error during enrichment for plugin ${pluginId}:`, error);
      updatedDrafts.set(pluginId, null); // Indicate failure for this plugin
      success = false;
      errorMessage = error.message;
    }

    const metadata = {
      pluginId: pluginId,
      timestamp: new Date().toISOString(),
      success: success,
      errorMessage: errorMessage,
    };
    await logReportMetadata(pluginId, metadata);
  }

  console.log('Finished enrichment process for all plugins.');
  return updatedDrafts;
}

export default {
  enrichPluginDraft,
  enrichAllPluginDrafts,
  logReportMetadata,
};

// --- New function logReportMetadata added below ---

export async function logReportMetadata(pluginId, metadata) {
  if (!chrome.storage || !chrome.storage.local) {
    console.error('chrome.storage.local is not available. Cannot log report metadata.');
    return;
  }

  const storageKey = 'reportLogs';
  let logs = [];

  try {
    const result = await chrome.storage.local.get([storageKey]);
    if (chrome.runtime.lastError) {
      console.error(`Error retrieving report logs for ${pluginId}: ${chrome.runtime.lastError.message}`);
      // Potentially return or decide not to overwrite logs if retrieval fails significantly
    } else if (result && result[storageKey] && Array.isArray(result[storageKey])) {
      logs = result[storageKey];
    }
  } catch (error) {
    console.error(`Exception while retrieving report logs for ${pluginId}: ${error}`);
    // Potentially return or decide not to overwrite logs
  }

  logs.push(metadata); // Add the new log entry

  try {
    await chrome.storage.local.set({ [storageKey]: logs });
    if (chrome.runtime.lastError) {
      console.error(`Error saving report logs for ${pluginId}: ${chrome.runtime.lastError.message}`);
    } else {
      console.log(`Report metadata for ${pluginId} logged successfully. Total logs: ${logs.length}`);
    }
  } catch (error) {
    console.error(`Exception while saving report logs for ${pluginId}: ${error}`);
  }
}
