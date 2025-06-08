// lab-extension-platform/popup.js

// lab-extension-platform/popup.js

async function logReportMetadata(documentId, url, timestamp, pluginId) {
  const backendUrl = 'https://your-lab-backend.com/api/report-logs'; // As per issue
  const payload = {
    documentId,
    url,
    timestamp,
    pluginId,
  };

  console.log(`Attempting to log metadata for plugin: ${pluginId} to ${backendUrl}`, payload);

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    const responseData = await response.json(); // Assuming backend returns JSON
    console.log(`Successfully logged metadata for plugin: ${pluginId}`, responseData);
    return { synced: true, message: responseData.message || 'Successfully logged metadata.' };
  } catch (error) {
    console.error(`Error logging metadata for plugin ${pluginId}:`, error);
    return { synced: false, message: `Failed to log metadata: ${error.message}` };
  }
}
// Keep the rest of the file (handlePluginResults, main function with sample data) the same.
// Make sure this new logReportMetadata function replaces the old placeholder one.
// Function to process plugin results and log metadata
async function handlePluginResults(pluginResults) {
  const syncResults = {};

  if (!pluginResults || !Array.isArray(pluginResults)) {
    console.error('Invalid pluginResults: Expected an array.');
    return syncResults; // Return empty results if input is invalid
  }

  for (const result of pluginResults) {
    if (result && result.success === true) {
      const timestamp = new Date().toISOString();
      try {
        const syncStatus = await logReportMetadata(
          result.documentId,
          result.url,
          timestamp,
          result.pluginId
        );
        syncResults[result.pluginId] = syncStatus;
      } catch (error) {
        console.error(`Error syncing metadata for plugin ${result.pluginId}:`, error);
        syncResults[result.pluginId] = {
          synced: false,
          message: `Failed to sync metadata: ${error.message}`
        };
      }
    } else if (result && result.pluginId) {
      // If the plugin execution was not successful, or if success is not explicitly true
      syncResults[result.pluginId] = {
        synced: false,
        message: result.message || 'Plugin execution not successful or success flag missing.'
      };
    } else {
      console.warn('Skipping invalid plugin result item:', result);
    }
  }
  console.log('All plugin results processed. Sync results:', syncResults);
  return syncResults;
}

// Example usage (will be triggered by the extension's UI/workflow)
// For testing purposes, we can call it with sample data.
async function main() {
  // Placeholder for pluginResults - this would come from the actual plugin execution phase
  const samplePluginResults = [
    {
      pluginId: 'medlab',
      success: true,
      documentId: 'sampleDocId123',
      url: 'https://docs.google.com/document/d/sampleDocId123/edit',
      title: 'MedLab AI Report - 2023-10-27'
    },
    {
      pluginId: 'anotherPlugin',
      success: false,
      message: 'Plugin failed due to missing configuration.'
    },
    {
      pluginId: 'yetAnotherPlugin',
      success: true,
      documentId: 'sampleDocId456',
      url: 'https://docs.google.com/document/d/sampleDocId456/edit',
      title: 'Another Report - 2023-10-28'
    }
  ];

  console.log('Starting plugin results processing...');
  const results = await handlePluginResults(samplePluginResults);
  console.log('Final sync results:', results);

  // Example of how to display results or send them somewhere
  // This part would typically interact with the extension's UI or background script
  // For instance, updating a popup or sending a message to a content script.
  // if (chrome.runtime && chrome.runtime.sendMessage) {
  //   chrome.runtime.sendMessage({ type: 'SYNC_RESULTS', payload: results });
  // } else {
  //   // Fallback for environments where chrome.runtime is not available (e.g. node testing)
  //   document.body.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
  // }
}

// Self-executing main for demonstration if not part of a larger extension flow.
// In a real extension, this would be triggered by an event (e.g., button click in popup.html).
// For now, let's run it to see console logs.
main().catch(console.error);
