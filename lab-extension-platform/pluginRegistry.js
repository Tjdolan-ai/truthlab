// plugins/pluginRegistry.js
import medlab from './medlab.js'; // Assuming medlab.js exports { generateReport }

// Define plugin objects first
const medlabPlugin = {
  id: 'medlab',
  name: 'MedLab AI Report',
  description: 'Generates medical lab summary reports',
  run: medlab.generateReport // Ensure medlab.generateReport is the correct function reference
};

// Add more plugin objects here if needed:
// const anotherPlugin = { ... };

// Export as a Map
export const pluginRegistry = new Map([
  [medlabPlugin.id, medlabPlugin],
  // [anotherPlugin.id, anotherPlugin],
]);
