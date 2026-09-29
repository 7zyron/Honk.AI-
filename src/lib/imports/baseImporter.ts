import {
  IProjectImporter,
  ImportSourceType,
  ImportPayload,
  ImportResult,
  ProjectAnalysis,
  AppTargetType,
} from './types';
import { analyzeProjectFiles } from '../projectAnalyzer';
import { convertToHonkProject } from '../conversionEngine';

export abstract class BaseProjectImporter implements IProjectImporter {
  abstract readonly sourceType: ImportSourceType;

  abstract detectSource(input: ImportPayload): boolean;
  abstract fetchSource(input: ImportPayload): Promise<Record<string, string>>;

  async validateSource(files: Record<string, string>): Promise<{ valid: boolean; reason?: string }> {
    const fileKeys = Object.keys(files);
    if (fileKeys.length === 0) {
      return { valid: false, reason: 'No readable project files found in source.' };
    }
    return { valid: true };
  }

  async extractProject(files: Record<string, string>): Promise<Record<string, string>> {
    // Default passthrough, subclasses can filter or strip root directories
    return files;
  }

  async analyzeProject(files: Record<string, string>, targetType?: AppTargetType): Promise<ProjectAnalysis> {
    return analyzeProjectFiles(files, targetType);
  }

  async normalizeProject(
    files: Record<string, string>,
    analysis: ProjectAnalysis,
    projectName?: string
  ): Promise<{ files: Record<string, string>; previewHtml: string }> {
    const proj = convertToHonkProject(files, analysis, projectName, this.sourceType);
    return {
      files: proj.files,
      previewHtml: proj.previewHtml || '',
    };
  }

  async importProject(input: ImportPayload): Promise<ImportResult> {
    try {
      const rawFiles = await this.fetchSource(input);
      const validation = await this.validateSource(rawFiles);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason || 'Project validation failed.',
          diagnosticInfo: 'The source repository or upload did not contain valid project structure.',
        };
      }

      const extracted = await this.extractProject(rawFiles);
      const analysis = await this.analyzeProject(extracted, input.targetType);
      const projectName = input.projectName || this.deriveProjectName(input, extracted);

      const honkProject = convertToHonkProject(
        extracted,
        analysis,
        projectName,
        this.sourceType,
        input.githubUrl || input.url
      );

      return {
        success: true,
        project: honkProject,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Import failed unexpectedly.',
        diagnosticInfo: err.stack || String(err),
      };
    }
  }

  protected deriveProjectName(input: ImportPayload, files: Record<string, string>): string {
    if (input.projectName && input.projectName.trim()) {
      return input.projectName.trim();
    }

    if (input.githubUrl) {
      const parts = input.githubUrl.replace(/\/$/, '').split('/');
      const last = parts[parts.length - 1];
      if (last) return last.replace(/\.git$/, '');
    }

    if (input.zipFileName) {
      return input.zipFileName.replace(/\.zip$/i, '');
    }

    const pkg = files['package.json'];
    if (pkg) {
      try {
        const parsed = JSON.parse(pkg);
        if (parsed.name) return parsed.name;
      } catch {}
    }

    return 'Imported Application';
  }
}
