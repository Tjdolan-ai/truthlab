// plugins/pluginRegistry.js

import medlab from './medlab.js';

export const pluginRegistry = [
  {
    id: 'medlab',
    name: 'MedLab AI Report',
    description: 'Generates medical lab summary reports',
    run: medlab.generateReport
  },
  // Add more plugins here
];
