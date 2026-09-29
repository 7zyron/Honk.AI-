import { BaseProjectImporter } from '../baseImporter';
import { ImportPayload, ImportSourceType } from '../types';

export class ManualFilesImporter extends BaseProjectImporter {
  readonly sourceType: ImportSourceType = 'manual';

  detectSource(input: ImportPayload): boolean {
    return input.sourceType === 'manual' || (Boolean(input.files) && Object.keys(input.files || {}).length > 0);
  }

  async fetchSource(input: ImportPayload): Promise<Record<string, string>> {
    if (!input.files || Object.keys(input.files).length === 0) {
      throw new Error('No files provided. Please paste your project files.');
    }
    return input.files;
  }
}
