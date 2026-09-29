// HONK APP BUILDER - Core Types & Interfaces

export type ImportSourceType = 'github' | 'zip' | 'url' | 'builder' | 'manual';
export type AppTargetType = 'web' | 'native_android';
export type ImportStatus = 'idle' | 'fetching' | 'validating' | 'extracting' | 'analyzing' | 'normalizing' | 'ready' | 'error';

export interface SecretDetection {
  file: string;
  line?: number;
  secretType: 'google_api_key' | 'openai_api_key' | 'github_token' | 'stripe_key' | 'jwt_secret' | 'database_url' | 'generic_secret';
  variableName: string;
  originalSnippet: string;
  sanitizedSnippet: string;
  recommendation: string;
}

export interface ProjectAnalysis {
  framework: 'React' | 'Next.js' | 'Vite' | 'Vue' | 'Svelte' | 'Vanilla HTML/JS' | 'Node/Express' | 'Angular' | 'Astro' | 'Android Kotlin' | 'Unknown';
  language: 'TypeScript' | 'JavaScript' | 'Kotlin' | 'HTML/CSS';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'gradle' | 'none';
  frontendDetected: boolean;
  backendDetected: boolean;
  databaseDetected: string | null;
  authDetected: string | null;
  environmentVariables: Array<{
    key: string;
    hasSecret: boolean;
    maskedDefault: string;
    description: string;
  }>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  dependenciesCount: number;
  routes: Array<{
    path: string;
    type: 'page' | 'api' | 'view';
    file: string;
  }>;
  components: string[];
  assets: string[];
  buildScripts: Record<string, string>;
  securityWarnings: SecretDetection[];
  targetType: AppTargetType;
  seoReport?: TechnicalSeoReport;
}

export interface TechnicalSeoReport {
  score: number; // 0-100
  hasTitle: boolean;
  titleContent?: string;
  hasMetaDescription: boolean;
  descriptionContent?: string;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasCanonical: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasStructuredData: boolean;
  hasSemanticHeadings: boolean;
  isMobileResponsive: boolean;
  suggestions: string[];
}

export interface HonkProject {
  id: string;
  name: string;
  description: string;
  sourceType: ImportSourceType;
  sourceUrl?: string;
  targetType: AppTargetType;
  status: 'ready' | 'analyzing' | 'error';
  files: Record<string, string>; // path -> content
  analysis: ProjectAnalysis;
  previewHtml?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

export interface ImportPayload {
  sourceType: ImportSourceType;
  githubUrl?: string;
  githubBranch?: string;
  githubSubpath?: string;
  zipBase64?: string;
  zipFileName?: string;
  url?: string;
  builderType?: string;
  projectName?: string;
  files?: Record<string, string>;
  targetType?: AppTargetType;
}

export interface ImportResult {
  success: boolean;
  project?: HonkProject;
  error?: string;
  diagnosticInfo?: string;
  isSourceUnavailable?: boolean;
}

export interface IProjectImporter {
  readonly sourceType: ImportSourceType;
  detectSource(input: ImportPayload): boolean;
  fetchSource(input: ImportPayload): Promise<Record<string, string>>;
  validateSource(files: Record<string, string>): Promise<{ valid: boolean; reason?: string }>;
  extractProject(files: Record<string, string>): Promise<Record<string, string>>;
  analyzeProject(files: Record<string, string>, targetType?: AppTargetType): Promise<ProjectAnalysis>;
  normalizeProject(files: Record<string, string>, analysis: ProjectAnalysis, projectName?: string): Promise<{
    files: Record<string, string>;
    previewHtml: string;
  }>;
  importProject(input: ImportPayload): Promise<ImportResult>;
}
