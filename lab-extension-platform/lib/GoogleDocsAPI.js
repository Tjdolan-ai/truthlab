// lib/GoogleDocsAPI.js

export class GoogleDocsAPI {
  constructor() {
    this.baseUrl = 'https://docs.googleapis.com/v1';
  }

  async getToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(token);
      });
    });
  }

  async makeRequest(endpoint, options = {}) {
    const token = await this.getToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
    const res = await fetch(endpoint, { ...options, headers });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async createDocument(title) {
    return await this.makeRequest(`${this.baseUrl}/documents`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  async addFormattedContent(documentId, blocks) {
    const requests = [];
    let index = 1;

    for (const block of blocks) {
      requests.push({
        insertText: { text: block.text, location: { index } }
      });

      if (block.style) {
        const endIndex = index + block.text.length;
        requests.push({
          updateTextStyle: {
            range: { startIndex: index, endIndex },
            textStyle: {
              bold: block.style.bold || false,
              fontSize: block.style.fontSize ? {
                magnitude: block.style.fontSize,
                unit: 'PT'
              } : undefined
            },
            fields: 'bold,fontSize'
          }
        });
      }

      index += block.text.length;
    }

    return await this.makeRequest(
      `${this.baseUrl}/documents/${documentId}:batchUpdate`,
      { method: 'POST', body: JSON.stringify({ requests }) }
    );
  }
}
