import { BaseProjectImporter } from '../baseImporter';
import { ImportPayload, ImportSourceType } from '../types';

export class GitHubImporter extends BaseProjectImporter {
  readonly sourceType: ImportSourceType = 'github';

  detectSource(input: ImportPayload): boolean {
    if (input.sourceType === 'github') return true;
    if (input.githubUrl && /github\.com/i.test(input.githubUrl)) return true;
    if (input.url && /github\.com/i.test(input.url)) return true;
    return false;
  }

  async fetchSource(input: ImportPayload): Promise<Record<string, string>> {
    const rawUrl = input.githubUrl || input.url || '';
    if (!rawUrl.trim()) {
      throw new Error('GitHub repository URL is required.');
    }

    // Parse owner and repo
    const parsed = this.parseGitHubUrl(rawUrl);
    if (!parsed) {
      throw new Error('Invalid GitHub URL. Format should be: https://github.com/owner/repository');
    }

    const { owner, repo, branch, subpath } = parsed;

    // Use backend proxy or direct GitHub API
    const apiUrl = `/api/app-builder/import/github`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner,
        repo,
        branch: input.githubBranch || branch || 'main',
        subpath: input.githubSubpath || subpath || '',
      }),
    });

    if (!res.ok) {
      let errMsg = `GitHub repository could not be accessed.`;
      try {
        const data = await res.json();
        if (data.error) errMsg = data.error;
        if (data.diagnosticInfo) errMsg += ` (${data.diagnosticInfo})`;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (!data.files || Object.keys(data.files).length === 0) {
      throw new Error(`No files found in GitHub repository ${owner}/${repo}.`);
    }

    return data.files;
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string; subpath?: string } | null {
    const cleaned = url.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const match = cleaned.match(/^github\.com\/([^/]+)\/([^/]+)(?:\/(?:tree|blob)\/([^/]+)(?:\/(.*))?)?/);
    if (!match) {
      // Also support shorthand owner/repo
      const shortMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
      if (shortMatch) {
        return {
          owner: shortMatch[1],
          repo: shortMatch[2].replace(/\.git$/, ''),
        };
      }
      return null;
    }

    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, ''),
      branch: match[3],
      subpath: match[4],
    };
  }

  async extractProject(files: Record<string, string>): Promise<Record<string, string>> {
    const filtered: Record<string, string> = {};
    for (const [path, content] of Object.entries(files)) {
      // Filter out binaries, node_modules, .git
      if (
        path.startsWith('.git/') ||
        path.includes('node_modules/') ||
        path.startsWith('dist/') ||
        path.startsWith('.next/') ||
        path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.ico')
      ) {
        continue;
      }
      filtered[path] = content;
    }
    return Object.keys(filtered).length > 0 ? filtered : files;
  }
}
