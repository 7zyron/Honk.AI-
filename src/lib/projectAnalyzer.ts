import { ProjectAnalysis, AppTargetType } from './imports/types';
import { scanAndSanitizeSecrets } from './securityScanner';
import { analyzeTechnicalSeo } from './seoAnalyzer';

/**
 * HONK Project Analyzer
 * Examines raw files to detect frameworks, architectures, dependencies,
 * routes, frontend, backend, database, auth, and secrets.
 */

export function analyzeProjectFiles(files: Record<string, string>, targetType: AppTargetType = 'web'): ProjectAnalysis {
  const filePaths = Object.keys(files);
  const pkgContent = files['package.json'] || files['/package.json'];
  
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};
  let buildScripts: Record<string, string> = {};

  if (pkgContent) {
    try {
      const parsed = JSON.parse(pkgContent);
      if (parsed.dependencies && typeof parsed.dependencies === 'object') {
        dependencies = parsed.dependencies;
      }
      if (parsed.devDependencies && typeof parsed.devDependencies === 'object') {
        devDependencies = parsed.devDependencies;
      }
      if (parsed.scripts && typeof parsed.scripts === 'object') {
        buildScripts = parsed.scripts;
      }
    } catch {
      // Ignore JSON parse errors in malformed package.json
    }
  }

  const allDepNames = [...Object.keys(dependencies), ...Object.keys(devDependencies)];

  // 1. Language Detection
  let language: ProjectAnalysis['language'] = 'JavaScript';
  const hasTsFiles = filePaths.some(p => p.endsWith('.ts') || p.endsWith('.tsx') || p === 'tsconfig.json');
  const hasKotlinFiles = filePaths.some(p => p.endsWith('.kt') || p.endsWith('.kts') || p.includes('build.gradle'));
  if (hasKotlinFiles || targetType === 'native_android') {
    language = 'Kotlin';
  } else if (hasTsFiles) {
    language = 'TypeScript';
  } else if (filePaths.some(p => p.endsWith('.html') || p.endsWith('.css'))) {
    language = 'HTML/CSS';
  }

  // 2. Framework Detection
  let framework: ProjectAnalysis['framework'] = 'Unknown';
  if (hasKotlinFiles || targetType === 'native_android') {
    framework = 'Android Kotlin';
  } else if (allDepNames.includes('next') || filePaths.some(p => p.startsWith('pages/') || p.startsWith('app/') || p.includes('next.config'))) {
    framework = 'Next.js';
  } else if (allDepNames.includes('vite') || filePaths.some(p => p.includes('vite.config'))) {
    framework = 'Vite';
  } else if (allDepNames.includes('react') || filePaths.some(p => p.endsWith('.jsx') || p.endsWith('.tsx'))) {
    framework = 'React';
  } else if (allDepNames.includes('vue') || filePaths.some(p => p.endsWith('.vue'))) {
    framework = 'Vue';
  } else if (allDepNames.includes('svelte') || filePaths.some(p => p.endsWith('.svelte'))) {
    framework = 'Svelte';
  } else if (allDepNames.includes('@angular/core') || filePaths.some(p => p.includes('angular.json'))) {
    framework = 'Angular';
  } else if (allDepNames.includes('astro')) {
    framework = 'Astro';
  } else if (allDepNames.includes('express') || filePaths.some(p => p.includes('server.ts') || p.includes('server.js'))) {
    framework = 'Node/Express';
  } else if (filePaths.some(p => p.endsWith('.html'))) {
    framework = 'Vanilla HTML/JS';
  }

  // 3. Package Manager
  let packageManager: ProjectAnalysis['packageManager'] = 'npm';
  if (hasKotlinFiles || filePaths.some(p => p.includes('gradle'))) {
    packageManager = 'gradle';
  } else if (filePaths.some(p => p.includes('pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (filePaths.some(p => p.includes('yarn.lock'))) {
    packageManager = 'yarn';
  } else if (!pkgContent) {
    packageManager = 'none';
  }

  // 4. Frontend Detection
  const frontendDetected = filePaths.some(p => 
    p.endsWith('.html') || p.endsWith('.tsx') || p.endsWith('.jsx') || 
    p.endsWith('.vue') || p.endsWith('.svelte') || p.includes('src/') || p.includes('public/')
  );

  // 5. Backend Detection
  const backendDetected = allDepNames.some(d => ['express', 'fastify', 'koa', 'hono', '@nestjs/core'].includes(d)) ||
    filePaths.some(p => 
      p.startsWith('server/') || p.startsWith('api/') || p.includes('server.ts') || 
      p.includes('server.js') || p.includes('pages/api/') || p.includes('app/api/')
    );

  // 6. Database Detection
  let databaseDetected: string | null = null;
  if (allDepNames.includes('@prisma/client') || filePaths.some(p => p.includes('schema.prisma'))) {
    databaseDetected = 'Prisma ORM';
  } else if (allDepNames.includes('drizzle-orm')) {
    databaseDetected = 'Drizzle ORM';
  } else if (allDepNames.includes('@supabase/supabase-js')) {
    databaseDetected = 'Supabase';
  } else if (allDepNames.includes('firebase') || allDepNames.includes('firebase-admin')) {
    databaseDetected = 'Firebase Firestore';
  } else if (allDepNames.includes('mongodb') || allDepNames.includes('mongoose')) {
    databaseDetected = 'MongoDB';
  } else if (allDepNames.includes('pg') || allDepNames.includes('postgres')) {
    databaseDetected = 'PostgreSQL';
  } else if (allDepNames.includes('better-sqlite3') || allDepNames.includes('sqlite3')) {
    databaseDetected = 'SQLite';
  } else {
    // Check if client storage or state is used
    const hasLocalStorage = Object.values(files).some(c => c.includes('localStorage') || c.includes('indexedDB'));
    if (hasLocalStorage) {
      databaseDetected = 'Local State / IndexedDB';
    }
  }

  // 7. Authentication Detection
  let authDetected: string | null = null;
  if (allDepNames.includes('@clerk/clerk-react') || allDepNames.includes('@clerk/nextjs')) {
    authDetected = 'Clerk Authentication';
  } else if (allDepNames.includes('next-auth') || allDepNames.includes('@auth/core')) {
    authDetected = 'NextAuth / Auth.js';
  } else if (allDepNames.includes('firebase') && Object.values(files).some(c => c.includes('signInWith') || c.includes('auth()'))) {
    authDetected = 'Firebase Auth';
  } else if (allDepNames.includes('@supabase/supabase-js') && Object.values(files).some(c => c.includes('supabase.auth'))) {
    authDetected = 'Supabase Auth';
  } else if (allDepNames.includes('jsonwebtoken') || allDepNames.includes('passport')) {
    authDetected = 'Custom JWT / Passport';
  }

  // 8. Routes Detection
  const routes: ProjectAnalysis['routes'] = [];
  for (const p of filePaths) {
    if (p.startsWith('pages/api/') || p.startsWith('src/pages/api/') || p.includes('/api/')) {
      const routePath = p.replace(/^.*pages\/api/, '/api').replace(/^.*app\/api/, '/api').replace(/\.[^/.]+$/, '');
      routes.push({ path: routePath, type: 'api', file: p });
    } else if (p.startsWith('pages/') || p.startsWith('src/pages/')) {
      let routePath = p.replace(/^.*pages/, '').replace(/\.[^/.]+$/, '');
      if (routePath.endsWith('/index')) routePath = routePath.replace(/\/index$/, '') || '/';
      routes.push({ path: routePath || '/', type: 'page', file: p });
    } else if (p.startsWith('app/') && (p.endsWith('page.tsx') || p.endsWith('page.jsx') || p.endsWith('page.js'))) {
      const routePath = '/' + p.replace(/^app\/?/, '').replace(/\/page\.[^/.]+$/, '');
      routes.push({ path: routePath, type: 'page', file: p });
    }
  }

  if (routes.length === 0 && frontendDetected) {
    routes.push({ path: '/', type: 'page', file: filePaths.find(p => p.includes('App.') || p.includes('index.html')) || 'index.html' });
  }

  // 9. Components & Assets
  const components = filePaths.filter(p => p.includes('components/') || p.includes('src/components/'));
  const assets = filePaths.filter(p => 
    p.includes('assets/') || p.includes('public/') || 
    /\.(png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|css)$/i.test(p)
  );

  // 10. Security & Secrets Scanning
  const { warnings, detectedEnvVars } = scanAndSanitizeSecrets(files);

  // 11. SEO Report
  const seoReport = analyzeTechnicalSeo(files);

  return {
    framework,
    language,
    packageManager,
    frontendDetected,
    backendDetected,
    databaseDetected,
    authDetected,
    environmentVariables: detectedEnvVars,
    dependencies,
    devDependencies,
    dependenciesCount: Object.keys(dependencies).length + Object.keys(devDependencies).length,
    routes,
    components,
    assets,
    buildScripts,
    securityWarnings: warnings,
    targetType: hasKotlinFiles || targetType === 'native_android' ? 'native_android' : 'web',
    seoReport,
  };
}
