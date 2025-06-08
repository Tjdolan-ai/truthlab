// lab-extension-platform/popup.js
document.addEventListener('DOMContentLoaded', () => {
  const generateButton = document.getElementById('generateReportsButton');
  const statusMessage = document.getElementById('statusMessage');

  if (generateButton) {
    generateButton.addEventListener('click', () => {
      statusMessage.textContent = 'Processing... please wait.';
      generateButton.disabled = true;

      // For now, hardcode the plugins and debug mode
      // In a real scenario, this might come from UI elements or stored settings
      const examplePlugins = ['medlab']; // Assuming 'medlab' is a valid plugin ID
      const exampleDebugMode = false; // Or true, for testing

      chrome.runtime.sendMessage(
        {
          action: "generateAllReports",
          payload: {
            readyPlugins: examplePlugins,
            debugMode: exampleDebugMode
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            statusMessage.textContent = `Error: ${chrome.runtime.lastError.message}`;
            console.error(chrome.runtime.lastError.message);
          } else if (response && response.error) {
            statusMessage.textContent = `Error: ${response.error}`;
            console.error(response.error);
          } else if (response && response.results) {
            statusMessage.textContent = 'Reports generation initiated. Check console for details.';
            console.log('Report generation results:', response.results);
            // Could display a summary of results here
          } else {
            statusMessage.textContent = 'Request sent. No immediate confirmation from background.';
          }
          generateButton.disabled = false;
        }
      );
    });
  } else {
    console.error('Generate button not found in popup.html');
    statusMessage.textContent = 'Error: Popup UI not loaded correctly.';
  }
});
