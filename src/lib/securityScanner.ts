import { SecretDetection } from './imports/types';

/**
 * HONK Security & Secrets Scanner
 * Detects sensitive tokens, API keys, database credentials, and replaces them
 * with safe environment variable references (e.g., process.env.API_KEY or import.meta.env.VITE_API_KEY)
 * Never exposes raw secret values.
 */

interface SecretPattern {
  type: SecretDetection['secretType'];
  regex: RegExp;
  envVarPrefix: string;
  description: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    type: 'google_api_key',
    regex: /AIza[0-9A-Za-z-_]{35}/g,
    envVarPrefix: 'GEMINI_API_KEY',
    description: 'Google AI / Firebase API Key',
  },
  {
    type: 'openai_api_key',
    regex: /sk-[a-zA-Z0-9]{20,64}/g,
    envVarPrefix: 'OPENAI_API_KEY',
    description: 'OpenAI Secret Key',
  },
  {
    type: 'github_token',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}/g,
    envVarPrefix: 'GITHUB_ACCESS_TOKEN',
    description: 'GitHub Personal Access Token',
  },
  {
    type: 'stripe_key',
    regex: /(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99}/g,
    envVarPrefix: 'STRIPE_SECRET_KEY',
    description: 'Stripe Secret Key',
  },
  {
    type: 'database_url',
    regex: /(?:postgres|postgresql|mongodb\+srv|mysql):\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_!@#$%^&*()\-+=]+@[a-zA-Z0-9_.-]+(?::[0-9]+)?\/[a-zA-Z0-9_.-]+/g,
    envVarPrefix: 'DATABASE_URL',
    description: 'Database Connection String with Credentials',
  },
  {
    type: 'jwt_secret',
    regex: /(?:jwt_secret|jwtSecret|JWT_SECRET)\s*[:=]\s*['"`]([a-zA-Z0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]{16,})['"`]/g,
    envVarPrefix: 'JWT_SECRET',
    description: 'Hardcoded JWT Signing Secret',
  },
];

export function scanAndSanitizeSecrets(files: Record<string, string>): {
  sanitizedFiles: Record<string, string>;
  warnings: SecretDetection[];
  detectedEnvVars: Array<{ key: string; hasSecret: boolean; maskedDefault: string; description: string }>;
  envExampleContent: string;
} {
  const sanitizedFiles: Record<string, string> = { ...files };
  const warnings: SecretDetection[] = [];
  const envVarsMap = new Map<string, { key: string; hasSecret: boolean; maskedDefault: string; description: string }>();

  // Process .env and .env.example files first if present
  for (const [filePath, content] of Object.entries(files)) {
    if (filePath.endsWith('.env') || filePath.endsWith('.env.local') || filePath.endsWith('.env.example')) {
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
          if (match) {
            const key = match[1];
            const val = match[2]?.trim() || '';
            const isSecret = /KEY|SECRET|TOKEN|PASSWORD|AUTH|PRIVATE|CREDENTIAL/i.test(key) || val.length > 20;
            envVarsMap.set(key, {
              key,
              hasSecret: isSecret,
              maskedDefault: isSecret ? '••••••••••••••••' : (val ? val.slice(0, 4) + '...' : ''),
              description: `Configuration key for ${key}`,
            });
          }
        }
      }
    }
  }

  // Scan all source code files
  for (const [filePath, content] of Object.entries(files)) {
    // Skip binary representations or mock files
    if (typeof content !== 'string') continue;

    let modifiedContent = content;
    let fileHasEdits = false;
    let counter = 1;

    for (const pattern of SECRET_PATTERNS) {
      const matches = Array.from(content.matchAll(pattern.regex));
      for (const m of matches) {
        const secretStr = m[0];
        if (!secretStr) continue;

        const isClientFile = !filePath.startsWith('server') && !filePath.includes('/api/') && !filePath.includes('backend');
        const envVarName = isClientFile && !pattern.envVarPrefix.startsWith('VITE_') 
          ? `VITE_${pattern.envVarPrefix}_${counter}` 
          : `${pattern.envVarPrefix}_${counter}`;

        const envRef = isClientFile 
          ? `(import.meta.env.${envVarName} || '')` 
          : `(process.env.${envVarName} || '')`;

        const maskedValue = secretStr.length > 8 
          ? `${secretStr.slice(0, 3)}••••••••${secretStr.slice(-3)}`
          : '••••••••';

        warnings.push({
          file: filePath,
          secretType: pattern.type,
          variableName: envVarName,
          originalSnippet: maskedValue,
          sanitizedSnippet: envRef,
          recommendation: `Secret detected in ${filePath} — securely replaced with environment variable ${envVarName}. Configure this variable in deployment settings before running in production.`,
        });

        envVarsMap.set(envVarName, {
          key: envVarName,
          hasSecret: true,
          maskedDefault: '••••••••••••••••',
          description: pattern.description,
        });

        // Replace raw secret with environment reference
        modifiedContent = modifiedContent.split(secretStr).join(envRef);
        fileHasEdits = true;
        counter++;
      }
    }

    if (fileHasEdits) {
      sanitizedFiles[filePath] = modifiedContent;
    }
  }

  // Generate or update safe .env.example
  const envLines: string[] = [
    '# HONK Safe Environment Variables Template',
    '# Configure required keys before deploying',
    '',
  ];

  for (const env of envVarsMap.values()) {
    envLines.push(`# ${env.description}`);
    envLines.push(`${env.key}=`);
    envLines.push('');
  }

  const envExampleContent = envLines.join('\n');
  sanitizedFiles['.env.example'] = envExampleContent;

  return {
    sanitizedFiles,
    warnings,
    detectedEnvVars: Array.from(envVarsMap.values()),
    envExampleContent,
  };
}
