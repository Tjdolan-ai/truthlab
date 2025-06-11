// lab-extension-platform/lib/enrichment.test.js

import { logReportMetadata, enrichAllPluginDrafts, enrichPluginDraft as actualEnrichPluginDraft } from './enrichment.js';

// Mock chrome.storage.local and chrome.runtime.lastError
let mockStorage = {};
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const result = {};
        if (global.chrome.runtime.lastError) {
          if (typeof callback === 'function') callback(undefined); // Simulate error for callback pattern
          return Promise.reject(new Error(global.chrome.runtime.lastError.message)); // Simulate error for promise pattern
        }
        keys.forEach(key => {
          if (mockStorage[key] !== undefined) {
            result[key] = JSON.parse(JSON.stringify(mockStorage[key])); // Deep copy
          }
        });
        if (typeof callback === 'function') callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((items, callback) => {
        if (global.chrome.runtime.lastError) {
          if (typeof callback === 'function') callback(); // Simulate error for callback pattern
          return Promise.reject(new Error(global.chrome.runtime.lastError.message));  // Simulate error for promise pattern
        }
        Object.keys(items).forEach(key => {
          mockStorage[key] = JSON.parse(JSON.stringify(items[key])); // Deep copy
        });
        if (typeof callback === 'function') callback();
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        mockStorage = {};
        return Promise.resolve();
      })
    }
  },
  runtime: {
    lastError: null
  }
};

// Mock enrichPluginDraft for testing enrichAllPluginDrafts
jest.mock('./enrichment.js', () => {
  const originalModule = jest.requireActual('./enrichment.js');
  return {
    ...originalModule,
    enrichPluginDraft: jest.fn(),
  };
});
// We need to import enrichPluginDraft separately after mocking it for enrichAllPluginDrafts tests
const { enrichPluginDraft } = require('./enrichment.js');


describe('logReportMetadata', () => {
  beforeEach(() => {
    // Reset mocks and storage before each test
    global.chrome.runtime.lastError = null;
    mockStorage = {};
    jest.clearAllMocks();
    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    console.error.mockRestore();
  });

  it('should create new log array if one does not exist', async () => {
    const metadata = { pluginId: 'plugin1', timestamp: 'ts1', success: true, errorMessage: null };
    await logReportMetadata('plugin1', metadata);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      reportLogs: [metadata]
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should append to existing logs', async () => {
    const existingLog = { pluginId: 'plugin0', timestamp: 'ts0', success: false, errorMessage: 'err0' };
    mockStorage['reportLogs'] = [existingLog];
    const newMetadata = { pluginId: 'plugin1', timestamp: 'ts1', success: true, errorMessage: null };

    await logReportMetadata('plugin1', newMetadata);

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      reportLogs: [existingLog, newMetadata]
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should handle error during log retrieval and still attempt to save new log', async () => {
    global.chrome.runtime.lastError = { message: 'Get error' };
    const metadata = { pluginId: 'plugin1', timestamp: 'ts1', success: true, errorMessage: null };

    await logReportMetadata('plugin1', metadata);

    expect(console.error).toHaveBeenCalledWith('Error retrieving report logs for plugin1: Get error');
    // Check if set is still called with the new metadata, assuming the function tries to save even if retrieval fails
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      reportLogs: [metadata]
    });
  });

  it('should handle error during log retrieval (exception) and still attempt to save new log', async () => {
    chrome.storage.local.get.mockImplementationOnce(async () => {
      throw new Error('Get exception');
    });
    const metadata = { pluginId: 'plugin1', timestamp: 'ts1', success: true, errorMessage: null };

    await logReportMetadata('plugin1', metadata);

    expect(console.error).toHaveBeenCalledWith('Exception while retrieving report logs for plugin1: Error: Get exception');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      reportLogs: [metadata]
    });
  });


  it('should handle error during log saving', async () => {
    const metadata = { pluginId: 'plugin1', timestamp: 'ts1', success: true, errorMessage: null };
    // Simulate set error after a successful get
    chrome.storage.local.set.mockImplementationOnce(async () => {
      global.chrome.runtime.lastError = { message: 'Set error' }; // Set lastError for the .set call
      return Promise.resolve(); // or reject(new Error('Set error')) if it's an exception
    });
    // OR if set throws an exception:
    // chrome.storage.local.set.mockRejectedValueOnce(new Error('Set error'));


    await logReportMetadata('plugin1', metadata);
    expect(console.error).toHaveBeenCalledWith('Error saving report logs for plugin1: Set error');
  });

  it('should handle exception during log saving', async () => {
    const metadata = { pluginId: 'plugin1', timestamp: 'ts1', success: true, errorMessage: null };
    chrome.storage.local.set.mockImplementationOnce(async () => {
        throw new Error('Set exception');
    });
    await logReportMetadata('plugin1', metadata);
    expect(console.error).toHaveBeenCalledWith('Exception while saving report logs for plugin1: Error: Set exception');
  });


  it('should not log if chrome.storage.local is not available', async () => {
    const originalChrome = global.chrome;
    global.chrome = { ...global.chrome, storage: null }; // Simulate storage not available

    const metadata = { pluginId: 'plugin1', timestamp: 'ts1', success: true, errorMessage: null };
    await logReportMetadata('plugin1', metadata);

    expect(console.error).toHaveBeenCalledWith('chrome.storage.local is not available. Cannot log report metadata.');
    expect(global.chrome.storage?.local?.set).not.toHaveBeenCalled(); // storage is null, so access .local is not possible

    global.chrome = originalChrome; // Restore
  });
});

// For enrichAllPluginDrafts, we need to use the *actual* logReportMetadata
// but the *mocked* enrichPluginDraft.
// So we re-import logReportMetadata or spy on the original one from originalModule.
const originalModule = jest.requireActual('./enrichment.js');
const logReportMetadataSpy = jest.spyOn(originalModule, 'logReportMetadata');


describe('enrichAllPluginDrafts - Logging', () => {
  beforeEach(() => {
    // Reset mocks and storage before each test
    global.chrome.runtime.lastError = null;
    mockStorage = {}; // Clear storage
    jest.clearAllMocks(); // Clears jest.fn() call counts etc.

    // Ensure enrichPluginDraft (the mock) is reset
    enrichPluginDraft.mockReset();

    // Spy on console.error and console.log
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {}); // To suppress other logs from the function

    // Reset spy on logReportMetadata if it was used in previous tests directly
    logReportMetadataSpy.mockClear();
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
  });

  it('should call logReportMetadata with success true when enrichPluginDraft succeeds', async () => {
    const readyPlugins = [{ id: 'p1' }];
    const enrichedData = { reportData: { aiLabSummary: 'enriched summary' } };
    enrichPluginDraft.mockResolvedValue(enrichedData); // enrichPluginDraft is already mocked via jest.mock

    await originalModule.enrichAllPluginDrafts(readyPlugins);

    expect(logReportMetadataSpy).toHaveBeenCalledTimes(1);
    expect(logReportMetadataSpy).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({
        pluginId: 'p1',
        success: true,
        errorMessage: null,
        timestamp: expect.any(String),
      })
    );
    // Also check that enrichPluginDraft was called
    expect(enrichPluginDraft).toHaveBeenCalledWith('p1');
  });

  it('should call logReportMetadata with success false when enrichPluginDraft returns null', async () => {
    const readyPlugins = [{ id: 'p2' }];
    enrichPluginDraft.mockResolvedValue(null);

    await originalModule.enrichAllPluginDrafts(readyPlugins);

    expect(logReportMetadataSpy).toHaveBeenCalledTimes(1);
    expect(logReportMetadataSpy).toHaveBeenCalledWith(
      'p2',
      expect.objectContaining({
        pluginId: 'p2',
        success: false,
        errorMessage: 'Plugin p2: Enrichment process resulted in null or no changes (e.g., no draft found or internal error during enrichment).',
        timestamp: expect.any(String),
      })
    );
  });

  it('should call logReportMetadata with success false and error message when enrichPluginDraft throws', async () => {
    const readyPlugins = [{ id: 'p3' }];
    const error = new Error('Enrichment failed');
    enrichPluginDraft.mockRejectedValue(error);

    await originalModule.enrichAllPluginDrafts(readyPlugins);

    expect(logReportMetadataSpy).toHaveBeenCalledTimes(1);
    expect(logReportMetadataSpy).toHaveBeenCalledWith(
      'p3',
      expect.objectContaining({
        pluginId: 'p3',
        success: false,
        errorMessage: 'Enrichment failed',
        timestamp: expect.any(String),
      })
    );
  });

  it('should call logReportMetadata for each plugin', async () => {
    const readyPlugins = [{ id: 'p1' }, { id: 'p2' }];
    enrichPluginDraft
      .mockResolvedValueOnce({ data: 'enriched for p1' }) // For p1
      .mockResolvedValueOnce(null); // For p2

    await originalModule.enrichAllPluginDrafts(readyPlugins);

    expect(logReportMetadataSpy).toHaveBeenCalledTimes(2);
    expect(logReportMetadataSpy).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ pluginId: 'p1', success: true, errorMessage: null })
    );
    expect(logReportMetadataSpy).toHaveBeenCalledWith(
      'p2',
      expect.objectContaining({ pluginId: 'p2', success: false, errorMessage: expect.any(String) })
    );
  });

  it('should handle empty readyPlugins array', async () => {
    const readyPlugins = [];
    await originalModule.enrichAllPluginDrafts(readyPlugins);
    expect(logReportMetadataSpy).not.toHaveBeenCalled();
    expect(enrichPluginDraft).not.toHaveBeenCalled();
  });

  it('should handle invalid plugin objects in readyPlugins array', async () => {
    const readyPlugins = [{ id: 'p1' }, { name: 'invalid plugin' }, { id: 'p2' }];
    enrichPluginDraft
      .mockResolvedValueOnce({ data: 'enriched for p1' }) // For p1
      .mockResolvedValueOnce({ data: 'enriched for p2' }); // For p2 (should be called for p2)

    await originalModule.enrichAllPluginDrafts(readyPlugins);

    expect(enrichPluginDraft).toHaveBeenCalledTimes(2); // Called for p1 and p2
    expect(enrichPluginDraft).toHaveBeenCalledWith('p1');
    expect(enrichPluginDraft).toHaveBeenCalledWith('p2');

    expect(logReportMetadataSpy).toHaveBeenCalledTimes(2); // Logged for p1 and p2
    expect(logReportMetadataSpy).toHaveBeenCalledWith('p1', expect.objectContaining({ success: true }));
    expect(logReportMetadataSpy).toHaveBeenCalledWith('p2', expect.objectContaining({ success: true }));

    // Check console warning for the invalid plugin
    expect(console.warn).toHaveBeenCalledWith('Encountered invalid plugin object or missing plugin ID. Skipping:', {name: 'invalid plugin'});
  });
});
