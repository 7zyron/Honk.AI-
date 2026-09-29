import { IProjectImporter, ImportPayload, ImportResult } from './types';
import { GitHubImporter } from './github/githubImporter';
import { ZipImporter } from './zip/zipImporter';
import { PublicUrlImporter } from './url/urlImporter';
import { SupportedBuilderImporter } from './builders/builderImporter';
import { ManualFilesImporter } from './manual/manualImporter';

export * from './types';
export * from './baseImporter';
export * from './github/githubImporter';
export * from './zip/zipImporter';
export * from './url/urlImporter';
export * from './builders/builderImporter';
export * from './manual/manualImporter';

export class ImporterRegistry {
  private static instance: ImporterRegistry;
  private importers: IProjectImporter[] = [];

  private constructor() {
    this.registerImporter(new GitHubImporter());
    this.registerImporter(new ZipImporter());
    this.registerImporter(new PublicUrlImporter());
    this.registerImporter(new SupportedBuilderImporter());
    this.registerImporter(new ManualFilesImporter());
  }

  public static getInstance(): ImporterRegistry {
    if (!ImporterRegistry.instance) {
      ImporterRegistry.instance = new ImporterRegistry();
    }
    return ImporterRegistry.instance;
  }

  public registerImporter(importer: IProjectImporter): void {
    // Avoid duplicates for same sourceType
    this.importers = this.importers.filter(i => i.sourceType !== importer.sourceType);
    this.importers.push(importer);
  }

  public getImporter(input: ImportPayload): IProjectImporter | null {
    // Try matching specific sourceType first
    if (input.sourceType) {
      const match = this.importers.find(i => i.sourceType === input.sourceType);
      if (match) return match;
    }

    // Try auto-detection
    for (const importer of this.importers) {
      if (importer.detectSource(input)) {
        return importer;
      }
    }

    return null;
  }

  public async importProject(input: ImportPayload): Promise<ImportResult> {
    const importer = this.getImporter(input);
    if (!importer) {
      return {
        success: false,
        error: 'Unsupported import source format or provider.',
        diagnosticInfo: 'Could not determine the appropriate import adapter for the provided payload.',
      };
    }

    return importer.importProject(input);
  }
}

export const defaultImporterRegistry = ImporterRegistry.getInstance();
