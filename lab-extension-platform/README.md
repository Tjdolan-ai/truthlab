# Lab Extension Platform

This is a modular Chrome extension for generating AI-powered lab reports inside Google Docs.

## Features

- 🔌 Plugin system for multiple report types (MedLab, Genomics, PathScan, etc.)
- 🧠 Integrates with Claude or Gemini for AI summaries
- 📝 Creates fully formatted Google Docs via the Docs API
- 🔒 Uses secure OAuth2 flow with Chrome Identity API

## Plugin Architecture

Each plugin lives in `/plugins/` and defines a `generateReport(reportData, docsAPI)` function.

### Example:

```js
import { generateReport } from './plugins/medlab.js';

generateReport(data, new GoogleDocsAPI());
