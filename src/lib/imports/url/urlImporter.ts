import { BaseProjectImporter } from '../baseImporter';
import { ImportPayload, ImportSourceType } from '../types';

export class PublicUrlImporter extends BaseProjectImporter {
  readonly sourceType: ImportSourceType = 'url';

  detectSource(input: ImportPayload): boolean {
    return input.sourceType === 'url' || Boolean(input.url && !input.url.includes('github.com'));
  }

  async fetchSource(input: ImportPayload): Promise<Record<string, string>> {
    const rawUrl = input.url || '';
    if (!rawUrl.trim()) {
      throw new Error('Project URL is required.');
    }

    // Call server inspection endpoint to verify if source is accessible
    const res = await fetch('/api/app-builder/import/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: rawUrl }),
    });

    if (!res.ok) {
      let errMsg = 'Failed to analyze project URL';
      let isSourceUnavailable = false;
      try {
        const data = await res.json();
        if (data.error) errMsg = data.error;
        if (data.isSourceUnavailable) isSourceUnavailable = true;
      } catch {}

      if (isSourceUnavailable || errMsg.includes('Source code isn\'t accessible')) {
        throw new Error("Source code isn't accessible from this URL. Import the project's GitHub repository, ZIP, or exported source files instead.");
      }
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (!data.files || Object.keys(data.files).length === 0) {
      throw new Error("Source code isn't accessible from this URL. Import the project's GitHub repository, ZIP, or exported source files instead.");
    }

    return data.files;
  }
}
