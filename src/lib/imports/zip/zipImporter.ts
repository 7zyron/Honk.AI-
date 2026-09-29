import JSZip from 'jszip';
import { BaseProjectImporter } from '../baseImporter';
import { ImportPayload, ImportSourceType } from '../types';

export class ZipImporter extends BaseProjectImporter {
  readonly sourceType: ImportSourceType = 'zip';

  detectSource(input: ImportPayload): boolean {
    return input.sourceType === 'zip' || Boolean(input.zipBase64);
  }

  async fetchSource(input: ImportPayload): Promise<Record<string, string>> {
    if (!input.zipBase64) {
      throw new Error('ZIP file data is missing or empty.');
    }

    try {
      // Decode base64 to binary
      let base64Data = input.zipBase64;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const zip = await JSZip.loadAsync(bytes.buffer);
      const files: Record<string, string> = {};

      const entries = Object.keys(zip.files);
      if (entries.length === 0) {
        throw new Error('ZIP archive is empty.');
      }

      // Check for common single root folder in ZIPs (e.g. project-main/src/...)
      const nonDirEntries = entries.filter(e => !zip.files[e].dir);
      let commonPrefix = '';
      if (nonDirEntries.length > 0) {
        const first = nonDirEntries[0].split('/');
        if (first.length > 1) {
          const candidate = first[0] + '/';
          if (nonDirEntries.every(e => e.startsWith(candidate))) {
            commonPrefix = candidate;
          }
        }
      }

      for (const [filename, fileObj] of Object.entries(zip.files)) {
        if (fileObj.dir) continue;

        // Skip binary and system files
        if (
          filename.includes('__MACOSX') ||
          filename.includes('.DS_Store') ||
          filename.includes('node_modules/') ||
          filename.includes('.git/') ||
          filename.endsWith('.exe') ||
          filename.endsWith('.dll') ||
          filename.endsWith('.zip')
        ) {
          continue;
        }

        const normalizedPath = commonPrefix && filename.startsWith(commonPrefix)
          ? filename.slice(commonPrefix.length)
          : filename;

        try {
          const text = await fileObj.async('string');
          files[normalizedPath] = text;
        } catch {
          // If binary or encoding error, skip or store placeholder
        }
      }

      if (Object.keys(files).length === 0) {
        throw new Error('No readable text or code files found in ZIP archive.');
      }

      return files;
    } catch (err: any) {
      throw new Error(`Failed to extract ZIP file: ${err.message || String(err)}`);
    }
  }
}
