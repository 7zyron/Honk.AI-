import { BaseProjectImporter } from '../baseImporter';
import { ImportPayload, ImportSourceType } from '../types';

export class SupportedBuilderImporter extends BaseProjectImporter {
  readonly sourceType: ImportSourceType = 'builder';

  detectSource(input: ImportPayload): boolean {
    return input.sourceType === 'builder' || Boolean(input.builderType);
  }

  async fetchSource(input: ImportPayload): Promise<Record<string, string>> {
    // If files are provided directly in payload
    if (input.files && Object.keys(input.files).length > 0) {
      return input.files;
    }

    const builderType = input.builderType || 'react-vite';

    // Call server to fetch standard template or parse builder format
    const res = await fetch('/api/app-builder/import/builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        builderType,
        projectName: input.projectName || 'Builder Imported App',
      }),
    });

    if (!res.ok) {
      let errMsg = 'Failed to import builder project';
      try {
        const data = await res.json();
        if (data.error) errMsg = data.error;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    return data.files || {};
  }
}
