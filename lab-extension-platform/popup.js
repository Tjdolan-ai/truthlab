// lab-extension-platform/popup.js

async function logReportMetadata(metadata) {
  // IMPORTANT: Replace with the actual backend URL when available.
  const backendUrl = 'https://your-placeholder-backend.com/api/report-logs';
  console.log('Logging report metadata:', metadata);

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Logging failed for ${metadata.pluginId}: ${response.status} ${errorText}`);
      // Optionally, update UI or retry
    } else {
      console.log(`Successfully logged metadata for ${metadata.pluginId}`);
    }
  } catch (err) {
    console.error(`Failed to log report metadata for ${metadata.pluginId}:`, err);
    // Optionally, update UI
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const generateButton = document.getElementById('generateReportsButton');
  const statusMessage = document.getElementById('statusMessage');

  if (generateButton) {
    generateButton.addEventListener('click', async () => { // Make handler async
      statusMessage.textContent = 'Processing... please wait.';
      generateButton.disabled = true;

      const examplePlugins = ['medlab'];
      const exampleDebugMode = false;

      chrome.runtime.sendMessage(
        {
          action: "generateAllReports",
          payload: {
            readyPlugins: examplePlugins,
            debugMode: exampleDebugMode
          }
        },
        async (response) => { // Make callback async
          if (chrome.runtime.lastError) {
            statusMessage.textContent = `Error: ${chrome.runtime.lastError.message}`;
            console.error(chrome.runtime.lastError.message);
            generateButton.disabled = false;
            return;
          }

          if (response && response.error) {
            statusMessage.textContent = `Error from background: ${response.error}`;
            console.error(response.error);
          } else if (response && response.results) {
            statusMessage.textContent = 'Report generation process completed. Logging metadata...';
            console.log('Report generation results received:', response.results);

            const pluginResults = response.results;
            let allLoggingAttemptsSuccessful = true;
            for (const [pluginId, result] of Object.entries(pluginResults)) {
              const metadataToLog = {
                documentId: result.documentId || null,
                pluginId: pluginId,
                title: result.title || null,
                url: result.url || null,
                timestamp: new Date().toISOString(),
                success: result.success,
                error: result.error || null
              };
              try {
                await logReportMetadata(metadataToLog);
                // Individual log success is handled by logReportMetadata itself via console.
              } catch (e) {
                // logReportMetadata already logs its own errors.
                // We set this flag to false to update the final status message.
                allLoggingAttemptsSuccessful = false;
              }
            }
            if(allLoggingAttemptsSuccessful) {
                statusMessage.textContent = 'All reports processed and metadata logging initiated.';
            } else {
                statusMessage.textContent = 'Reports processed. Some metadata logging failed; check console.';
            }

          } else {
            statusMessage.textContent = 'Request sent. No specific confirmation from background received.';
          }
          generateButton.disabled = false;
        }
      );
    });
  } else {
    console.error('Generate Reports button not found in popup.html');
    if(statusMessage) statusMessage.textContent = 'Error: Popup UI did not load correctly.';
  }
});
