// lab-extension-platform/plugins/pluginRegistry.js
import medlab from './medlab.js';

// Define plugin configurations
const medlabPlugin = {
  id: 'medlab',
  name: 'MedLab AI Report',
  description: 'Generates medical lab summary reports.',
  run: medlab.generateReport // Assumes medlab.js exports a 'generateReport' function
};

// Add more plugin configurations here, if needed.

// Register plugins by adding them to the Map.
export const pluginRegistry = new Map([
  [medlabPlugin.id, medlabPlugin],
  // Example for another plugin:
  // [anotherPlugin.id, anotherPlugin],
]);
