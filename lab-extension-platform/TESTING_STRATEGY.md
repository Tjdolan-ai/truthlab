# Testing Strategy for AI Draft Enrichment

This document outlines the testing strategy for the AI draft enrichment functionality implemented in `lib/enrichment.js` and `lib/aiService.js`.

## 1. Unit Tests

Unit tests should focus on individual functions and modules in isolation.

### a. `aiService.js`
   - **`generateAiSummary(inputData)`**:
     - Mock any external AI SDK calls if this were a real implementation.
     - Verify that it returns a string (the placeholder summary).
     - Test with different `inputData` to ensure it's passed along (if the placeholder were more dynamic).
     - Test promise resolution.

### b. `enrichment.js`
   - **`enrichPluginDraft(pluginId)`**:
     - **Mock `chrome.storage.local.get`**:
       - Simulate draft found with no `aiLabSummary`.
       - Simulate draft found with a placeholder `aiLabSummary`.
       - Simulate draft found with a valid, non-placeholder `aiLabSummary`.
       - Simulate draft not found.
       - Simulate `chrome.storage.local.get` error.
     - **Mock `chrome.storage.local.set`**:
       - Verify it's called with the correct `pluginId` and updated data when enrichment occurs.
       - Simulate `chrome.storage.local.set` error and ensure original data (or appropriate error indication) is returned.
     - **Mock `aiService.generateAiSummary`**:
       - Ensure it's called when `aiLabSummary` is missing or placeholder.
       - Ensure it's NOT called when `aiLabSummary` is already good.
       - Simulate AI service returning a new summary.
       - Simulate AI service failing (returning null or throwing an error).
     - **Test Cases**:
       - Plugin draft has no `reportData`: Should return original draft.
       - Plugin draft has `reportData` but no `aiLabSummary` field: Should attempt enrichment.
       - `aiLabSummary` is empty string: Should enrich.
       - `aiLabSummary` matches one of the `PLACEHOLDER_SUMMARIES`: Should enrich.
       - `aiLabSummary` is valid: Should not enrich, returns original data.
       - Storage read error: Should return null or handle gracefully.
       - Storage write error after enrichment: Should return original data (or handle error).
       - AI generation failure: Should return original data.

   - **`enrichAllPluginDrafts(readyPlugins)`**:
     - **Mock `enrichPluginDraft`**:
       - Simulate it returning updated draft.
       - Simulate it returning original draft.
       - Simulate it returning null.
     - **Test Cases**:
       - `readyPlugins` is empty array: Should return empty Map.
       - `readyPlugins` is null/undefined: Should return empty Map and log error.
       - `readyPlugins` contains valid plugins: Verify `enrichPluginDraft` is called for each.
       - `readyPlugins` contains invalid plugin objects (e.g., no `id`): Should skip invalid ones and log warning.
       - Verify the output Map correctly maps `pluginId` to the result from `enrichPluginDraft`.

## 2. Integration Tests (Conceptual)

Integration tests would check the interaction between modules, particularly how `enrichment.js` uses `aiService.js` and `chrome.storage.local`.

- **Test `enrichPluginDraft` with the actual `aiService.js` (placeholder version)**:
  - Ensure the placeholder summary from `aiService.js` is correctly integrated into the draft.
- **Test `enrichAllPluginDrafts` with `enrichPluginDraft`**:
  - Focus on the flow of data and calls between these functions.

## 3. Mocking Dependencies

- **`chrome.storage.local`**:
  - Use a library like `sinon-chrome` or create a simple in-memory mock.
  - Example mock structure:
    ```javascript
    global.chrome = {
      storage: {
        local: {
          get: (keys, callback) => { /* ... */ },
          set: (items, callback) => { /* ... */ },
        },
      },
      runtime: {
        lastError: null, // or an error object
      },
    };
    ```
- **AI Service (`aiService.js`)**:
  - Since it's already a placeholder, it's easy to test with.
  - For testing functions that *use* `aiService.js`, you can use `jest.mock('./aiService.js')` or Sinon stubs to control its behavior per test case (e.g., make `generateAiSummary` return different values or throw errors).

## 4. Test Execution Environment

- Use a test runner like Jest or Mocha.
- Configure the environment to support ES modules if not already set up (e.g., via Babel or Node's experimental modules flag).

## 5. End-to-End (E2E) Tests (Manual / Future Automation)

- **Manual Testing in Browser**:
  1. Load the extension in developer mode.
  2. Manually create mock plugin drafts in `chrome.storage.local` via the dev console:
     - One with an empty `aiLabSummary`.
     - One with a placeholder `aiLabSummary`.
     - One with a filled `aiLabSummary`.
  3. Trigger the `performDraftEnrichment()` function in `background.js` (e.g., by reinstalling the extension if using the `onInstalled` trigger, or by sending a message if that trigger is implemented).
  4. Inspect `chrome.storage.local` to verify that:
     - Drafts needing enrichment were updated with the placeholder AI summary.
     - Drafts not needing enrichment were left untouched.
  5. Check background script console logs for correct processing messages.
- **Automated E2E (using Puppeteer/Selenium)**:
  - More complex to set up but would provide robust testing of the full flow within a live browser environment.
  - Would involve programmatically controlling the browser, inspecting extension storage, and checking console logs.

This conceptual testing strategy should provide good coverage for the implemented AI draft enrichment feature.
