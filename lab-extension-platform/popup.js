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
// main().catch(console.error); // Comment out old main execution

function displayReports() {
  const reportsContainer = document.getElementById('reports-container'); // This ID will be added to popup.html
  if (!reportsContainer) {
    console.error('Error: Reports container not found in popup.html');
    // Try to create a placeholder if it doesn't exist, for basic testing
    // In a real scenario, popup.html should define this.
    document.body.innerHTML = '<div id="reports-container">Fallback container created. Check popup.html.</div>';
    // reportsContainer = document.getElementById('reports-container'); // Re-assign after creation
    // return; // Or simply return if strict HTML structure is expected
  }
  reportsContainer.innerHTML = ''; // Clear previous results

  chrome.storage.local.get(['latestReports'], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error retrieving from chrome.storage.local:', chrome.runtime.lastError);
      reportsContainer.textContent = 'Error loading reports.';
      return;
    }

    const latestReports = result.latestReports;
    if (!latestReports || Object.keys(latestReports).length === 0) {
      reportsContainer.textContent = 'No reports found or latest reports is empty.';
      return;
    }

    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none';
    ul.style.padding = '0';
    ul.style.fontFamily = 'Arial, sans-serif';


    for (const [pluginId, reportData] of Object.entries(latestReports)) {
      const li = document.createElement('li');
      li.style.marginBottom = '12px';
      li.style.border = '1px solid #ddd';
      li.style.padding = '8px';
      li.style.borderRadius = '4px';
      li.style.backgroundColor = '#f9f9f9';


      let statusIcon = '❌';
      let messageText = 'Error processing plugin or no summary available.';
      let titleText = pluginId; // Default title is pluginId

      if (reportData && reportData.reportData && reportData.reportData.aiLabSummary) {
        statusIcon = '✅';
        messageText = reportData.reportData.aiLabSummary;
        if (reportData.reportData.title) { // Check if a title is available
            titleText = reportData.reportData.title;
        }
      } else if (reportData && reportData.error) {
        messageText = reportData.error;
      } else if (reportData === null || (reportData && !reportData.reportData)) {
        // Specific case for when reportData might be null or missing nested reportData
        messageText = 'Plugin processing error or no data returned.';
      }


      // Sanitize messageText to prevent HTML injection if it comes from untrusted source
      // For aiLabSummary, it's generally trusted but good practice if displayed as HTML
      const tempDiv = document.createElement('div');
      tempDiv.textContent = messageText;
      const sanitizedMessage = tempDiv.innerHTML;


      li.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
          <span style="font-size: 1.2em; margin-right: 8px;">${statusIcon}</span>
          <strong style="font-size: 1.1em;">${titleText}</strong>
        </div>
        <p style="margin-left: 28px; font-size: 0.9em; color: #333; white-space: pre-wrap; word-wrap: break-word;">${sanitizedMessage.substring(0, 250)}${sanitizedMessage.length > 250 ? '...' : ''}</p>
        ${pluginId !== titleText ? `<small style="margin-left: 28px; color: #777;">Plugin ID: ${pluginId}</small>` : ''}
      `;
      ul.appendChild(li);
    }
    reportsContainer.appendChild(ul);
  });
}

async function newMain() {
  console.log('Popup script loaded. Attempting to display reports from local storage.');
  displayReports();

  // The old code related to samplePluginResults and handlePluginResults can be kept if needed for other things,
  // but for this task, we are focusing on displayReports.
  // For example:
  /*
  const samplePluginResults = [
    {
      pluginId: 'medlab',
      success: true,
      documentId: 'sampleDocId123',
      url: 'https://docs.google.com/document/d/sampleDocId123/edit',
      title: 'MedLab AI Report - 2023-10-27'
    },
    // ... other sample data
  ];
  console.log('Starting plugin results processing (old logic)...');
  const results = await handlePluginResults(samplePluginResults);
  console.log('Final sync results (old logic):', results);
  */
}

// document.addEventListener('DOMContentLoaded', newMain);
// Call newMain directly for simplicity in Chrome extension popups,
// as scripts are often executed after DOM is ready.
newMain().catch(console.error);
