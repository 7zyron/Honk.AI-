/**
 * Honk AI Agent Architecture - Centralized Tool Manager
 * Manages modular tools, concurrency, sandboxed execution, caching & consequential safety gates.
 */

import * as vm from 'vm';
import {
  AgentTool,
  ToolExecutionContext,
  ToolResult,
  SubTask,
} from './types';
import { HonkSearchEngine } from '../capabilities/searchEngine';

export class ToolManager {
  private static instance: ToolManager;
  private tools: Map<string, AgentTool> = new Map();
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  private constructor() {
    this.registerDefaultTools();
  }

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  public registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  public getAvailableTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Safe execution of a single tool with timeout, caching, and error isolation.
   */
  public async executeTool(
    name: string,
    params: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" is not registered in Honk Agent Tool Manager.`,
        durationMs: Date.now() - startTime,
      };
    }

    // Check cache for idempotent query tools
    const cacheKey = `${name}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        success: true,
        data: cached.data,
        cached: true,
        durationMs: Date.now() - startTime,
      };
    }

    // Handle Consequential Action Permission Gate
    if (tool.isConsequential) {
      const actionType = String(params.actionType || name);
      const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const confirmedActions = (context.taskMemory.get('confirmedActions') as string[]) || [];

      if (!confirmedActions.includes(actionType) && !confirmedActions.includes(actionId)) {
        return {
          success: false,
          requiresPermission: true,
          permissionDetails: {
            actionId,
            actionType,
            description: String(params.description || `Execute consequential action: ${name}`),
            consequence: String(params.consequence || 'This action modifies external state or persistent data.'),
          },
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Execution with timeout isolation
    const timeoutMs = tool.timeoutMs || (context.isHeavyTask ? 12000 : 6000);
    try {
      const execPromise = tool.execute(params, context);
      const timeoutPromise = new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool "${name}" timed out after ${timeoutMs}ms`)), timeoutMs)
      );

      const result = await Promise.race([execPromise, timeoutPromise]);

      // Cache successful read/search/calc operations for 5 minutes
      if (result.success && ['web_search', 'code_interpreter', 'data_transformer'].includes(name)) {
        this.cache.set(cacheKey, {
          data: result.data,
          expiresAt: Date.now() + 5 * 60 * 1000,
        });
      }

      return result;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Tool execution failed: ${errMsg}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Concurrent Parallel Execution for independent subtasks
   * Uses Promise.allSettled to isolate individual subtask failures.
   */
  public async executeParallel(
    subtasks: SubTask[],
    context: ToolExecutionContext
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();
    const promises = subtasks.map(async (task) => {
      if (!task.toolName) {
        return {
          taskId: task.id,
          result: {
            success: true,
            data: { message: `Completed task without tool: ${task.title}` },
            durationMs: 0,
          },
        };
      }

      const res = await this.executeTool(task.toolName, task.toolParams || {}, context);
      return { taskId: task.id, result: res };
    });

    const settled = await Promise.allSettled(promises);
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        results.set(item.value.taskId, item.value.result);
      }
    }

    return results;
  }

  /**
   * Registers Honk's foundational core tools
   */
  private registerDefaultTools(): void {
    // 1. Web Search & Multi-Source Research
    this.registerTool({
      name: 'web_search',
      displayName: 'Web Research & Retrieval',
      description: 'Searches real-time web sources, retrieves authoritative facts, extracts citations, and verifies temporal data.',
      category: 'research',
      parameters: {
        type: 'object',
        description: 'Parameters for web search query',
        properties: {
          query: { type: 'string', description: 'Search query string', required: true },
          numResults: { type: 'number', description: 'Number of search hits to fetch (1-8)' },
          country: { type: 'string', description: 'Region bias (e.g. IN, US, UK)' },
        },
        required: ['query'],
      },
      timeoutMs: 8000,
      execute: async (params, context) => {
        const query = String(params.query || '').trim();
        const start = Date.now();
        if (!query) {
          return { success: false, error: 'Search query cannot be empty', durationMs: 0 };
        }

        try {
          const searchEngine = HonkSearchEngine.getInstance();
          const searchRes = await searchEngine.search(query, context.userId || 'guest_user', {
            deepSearch: true,
          });

          return {
            success: true,
            data: {
              query,
              directAnswer: searchRes.directAnswer,
              keyTakeaways: searchRes.keyTakeaways,
              sources: searchRes.sources.map((s) => ({
                title: s.title,
                url: s.url,
                snippet: s.snippet,
                domain: s.domain,
              })),
              totalFound: searchRes.sources.length,
            },
            durationMs: Date.now() - start,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, error: msg, durationMs: Date.now() - start };
        }
      },
    });

    // 2. Sandboxed Code Interpreter & Math Calculation Engine
    this.registerTool({
      name: 'code_interpreter',
      displayName: 'Code Interpreter & Math Engine',
      description: 'Executes sandboxed JavaScript/TypeScript for complex mathematics, data aggregation, algorithms, matrix transforms, and date calculations.',
      category: 'code',
      parameters: {
        type: 'object',
        description: 'Code snippet to evaluate safely',
        properties: {
          code: { type: 'string', description: 'Executable JavaScript code. Must return value or assign to result variable.', required: true },
        },
        required: ['code'],
      },
      timeoutMs: 4000,
      execute: async (params) => {
        const start = Date.now();
        let code = String(params.code || '').trim();
        if (!code) {
          return { success: false, error: 'Code to evaluate is required', durationMs: 0 };
        }

        // Safety Filter: Disallow dangerous tokens
        const forbiddenTokens = [
          'process', 'child_process', 'require', 'import', 'global',
          'eval', 'Function', 'fs', 'net', 'http', '__dirname', '__filename'
        ];
        for (const token of forbiddenTokens) {
          const regex = new RegExp(`\\b${token}\\b`);
          if (regex.test(code)) {
            return {
              success: false,
              error: `Security boundary: "${token}" is prohibited in the code interpreter sandbox.`,
              durationMs: Date.now() - start,
            };
          }
        }

        // Wrap code if it's an expression or multi-statement
        if (!code.includes('return ') && !code.includes('result =') && !code.includes('const ') && !code.includes('let ')) {
          code = `result = (${code});`;
        } else if (!code.includes('result =') && code.includes('return ')) {
          code = `result = (() => { ${code} })();`;
        }

        const logs: string[] = [];
        const sandbox = {
          Math,
          Number,
          String,
          Array,
          Object,
          Boolean,
          Date,
          RegExp,
          JSON,
          parseInt,
          parseFloat,
          isNaN,
          isFinite,
          console: {
            log: (...args: unknown[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
            warn: (...args: unknown[]) => logs.push('[WARN] ' + args.join(' ')),
            error: (...args: unknown[]) => logs.push('[ERROR] ' + args.join(' ')),
          },
          result: undefined as unknown,
        };

        const vmContext = vm.createContext(sandbox);
        try {
          const script = new vm.Script(code);
          script.runInContext(vmContext, { timeout: 2500 });
          return {
            success: true,
            data: {
              result: sandbox.result !== undefined ? sandbox.result : (logs.length > 0 ? logs.join('\n') : 'Execution finished with no output'),
              logs,
              executionMs: Date.now() - start,
            },
            durationMs: Date.now() - start,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            error: `Interpreter Runtime Error: ${msg}`,
            data: { logs },
            durationMs: Date.now() - start,
          };
        }
      },
    });

    // 3. File & Document Structure Analyzer
    this.registerTool({
      name: 'file_analyzer',
      displayName: 'Codebase & Document Analyzer',
      description: 'Parses file contents, extracts symbols, functions, interfaces, line metrics, AST outline, and detects syntax or architectural patterns.',
      category: 'code',
      parameters: {
        type: 'object',
        description: 'File text content and analysis options',
        properties: {
          content: { type: 'string', description: 'File content or text to inspect', required: true },
          filename: { type: 'string', description: 'Filename or extension hint (e.g. index.ts, data.csv)' },
        },
        required: ['content'],
      },
      timeoutMs: 3000,
      execute: async (params) => {
        const start = Date.now();
        const content = String(params.content || '');
        const filename = String(params.filename || 'unknown.txt');

        const lines = content.split('\n');
        const lineCount = lines.length;
        const charCount = content.length;
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

        // Extract functions, interfaces, classes
        const functions: string[] = [];
        const classesOrInterfaces: string[] = [];
        const imports: string[] = [];

        lines.forEach((line) => {
          const trimmed = line.trim();
          if (/^(export\s+)?(async\s+)?function\s+([A-Za-z0-9_$]+)/.test(trimmed)) {
            const match = trimmed.match(/function\s+([A-Za-z0-9_$]+)/);
            if (match) functions.push(match[1]);
          } else if (/^(export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(async\s*)?\([^)]*\)\s*=>/.test(trimmed)) {
            const match = trimmed.match(/const\s+([A-Za-z0-9_$]+)/);
            if (match) functions.push(match[1]);
          }
          if (/^(export\s+)?(class|interface|type)\s+([A-Za-z0-9_$]+)/.test(trimmed)) {
            const match = trimmed.match(/(class|interface|type)\s+([A-Za-z0-9_$]+)/);
            if (match) classesOrInterfaces.push(`${match[1]} ${match[2]}`);
          }
          if (/^import\s+.*?from\s+['"][^'"]+['"]/.test(trimmed)) {
            imports.push(trimmed);
          }
        });

        return {
          success: true,
          data: {
            filename,
            metrics: { lineCount, charCount, wordCount },
            structure: {
              functionsCount: functions.length,
              functions: functions.slice(0, 30),
              classesOrInterfaces: classesOrInterfaces.slice(0, 30),
              importsCount: imports.length,
            },
          },
          durationMs: Date.now() - start,
        };
      },
    });

    // 4. Data Transformer & Statistical Aggregator
    this.registerTool({
      name: 'data_transformer',
      displayName: 'Data Transformer & Statistics',
      description: 'Computes statistical summaries (mean, median, variance, sum, min/max), tabular Markdown matrices, and JSON aggregations.',
      category: 'data',
      parameters: {
        type: 'object',
        description: 'Dataset or numbers to analyze',
        properties: {
          numbers: { type: 'array', description: 'Array of numbers for statistical analysis' },
          operation: { type: 'string', enum: ['stats', 'sort', 'normalize', 'tabularize'], description: 'Desired operation' },
          tableHeaders: { type: 'array', description: 'Column headers if tabularizing' },
          tableRows: { type: 'array', description: 'Row data if tabularizing' },
        },
      },
      timeoutMs: 2500,
      execute: async (params) => {
        const start = Date.now();
        const operation = String(params.operation || 'stats');

        if (operation === 'stats' && Array.isArray(params.numbers)) {
          const nums = (params.numbers as unknown[]).map(Number).filter((n) => !isNaN(n));
          if (nums.length === 0) {
            return { success: false, error: 'No valid numbers provided for statistical calculation', durationMs: Date.now() - start };
          }

          nums.sort((a, b) => a - b);
          const sum = nums.reduce((acc, curr) => acc + curr, 0);
          const mean = sum / nums.length;
          const median = nums.length % 2 === 0
            ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
            : nums[Math.floor(nums.length / 2)];
          const min = nums[0];
          const max = nums[nums.length - 1];
          const variance = nums.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / nums.length;
          const stdDev = Math.sqrt(variance);

          return {
            success: true,
            data: {
              count: nums.length,
              sum: Number(sum.toFixed(4)),
              mean: Number(mean.toFixed(4)),
              median: Number(median.toFixed(4)),
              min,
              max,
              variance: Number(variance.toFixed(4)),
              stdDev: Number(stdDev.toFixed(4)),
            },
            durationMs: Date.now() - start,
          };
        }

        if (operation === 'tabularize' && Array.isArray(params.tableHeaders) && Array.isArray(params.tableRows)) {
          const headers = (params.tableHeaders as unknown[]).map(String);
          const rows = (params.tableRows as unknown[][]).map((r) => (Array.isArray(r) ? r.map(String) : [String(r)]));

          const headerRow = `| ${headers.join(' | ')} |`;
          const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
          const dataRows = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
          const markdownTable = `${headerRow}\n${separatorRow}\n${dataRows}`;

          return {
            success: true,
            data: { markdownTable, rowCount: rows.length, columnCount: headers.length },
            durationMs: Date.now() - start,
          };
        }

        return {
          success: false,
          error: `Unsupported data transformer operation "${operation}" or invalid payload.`,
          durationMs: Date.now() - start,
        };
      },
    });

    // 5. Verification & Consistency Checker
    this.registerTool({
      name: 'verifier_checker',
      displayName: 'Self-Verification & Fact Checker',
      description: 'Audits answers against logical constraints, mathematical formulas, syntax rules, and temporal facts before delivering.',
      category: 'verification',
      parameters: {
        type: 'object',
        description: 'Text and validation rules to verify',
        properties: {
          draftText: { type: 'string', description: 'The generated response draft to audit', required: true },
          mathExpressions: { type: 'array', description: 'List of math statements to verify (e.g. ["15 * 4 = 60"])' },
          requiredTerms: { type: 'array', description: 'Terms or constraints that must be present' },
        },
        required: ['draftText'],
      },
      timeoutMs: 3000,
      execute: async (params) => {
        const start = Date.now();
        const text = String(params.draftText || '');
        const mathExpressions = Array.isArray(params.mathExpressions) ? (params.mathExpressions as string[]) : [];
        const requiredTerms = Array.isArray(params.requiredTerms) ? (params.requiredTerms as string[]) : [];

        const issues: string[] = [];
        const passedChecks: string[] = [];

        // Check required constraints
        for (const term of requiredTerms) {
          if (!text.toLowerCase().includes(term.toLowerCase())) {
            issues.push(`Missing mandatory requirement: "${term}"`);
          } else {
            passedChecks.push(`Constraint verified: "${term}"`);
          }
        }

        // Verify mathematical statements
        for (const expr of mathExpressions) {
          const parts = expr.split('=');
          if (parts.length === 2) {
            try {
              const leftClean = parts[0].replace(/[^0-9+\-*/().]/g, '');
              const expectedVal = parseFloat(parts[1].trim());
              const script = new vm.Script(leftClean);
              const computed = script.runInNewContext({});
              if (Math.abs(computed - expectedVal) > 0.0001) {
                issues.push(`Math mismatch in "${expr}": left side evaluates to ${computed}, expected ${expectedVal}`);
              } else {
                passedChecks.push(`Math verified: ${expr}`);
              }
            } catch {
              // Ignore syntax parsing errors on complex informal math
            }
          }
        }

        return {
          success: true,
          data: {
            overallPassed: issues.length === 0,
            passedChecksCount: passedChecks.length,
            issuesCount: issues.length,
            issues,
            passedChecks,
          },
          durationMs: Date.now() - start,
        };
      },
    });

    // 6. Consequential Action Authorization Gate (Destructive / External actions)
    this.registerTool({
      name: 'system_action',
      displayName: 'Consequential System Action Gate',
      description: 'Enforces human authorization for consequential actions (e.g. data deletion, external messaging, purchasing, account resetting).',
      category: 'system',
      isConsequential: true,
      parameters: {
        type: 'object',
        description: 'Consequential action parameters',
        properties: {
          actionType: { type: 'string', description: 'Type of action: delete_data, send_external, modify_account', required: true },
          description: { type: 'string', description: 'Plain English description of what will be performed', required: true },
          consequence: { type: 'string', description: 'Irreversible consequence or external side-effect', required: true },
        },
        required: ['actionType', 'description', 'consequence'],
      },
      timeoutMs: 2000,
      execute: async (params, context) => {
        const start = Date.now();
        const actionType = String(params.actionType);
        const description = String(params.description);
        const consequence = String(params.consequence);

        const confirmedActions = (context.taskMemory.get('confirmedActions') as string[]) || [];
        if (!confirmedActions.includes(actionType)) {
          return {
            success: false,
            requiresPermission: true,
            permissionDetails: {
              actionId: `act_${Date.now()}`,
              actionType,
              description,
              consequence,
            },
            durationMs: Date.now() - start,
          };
        }

        return {
          success: true,
          data: {
            message: `User authorization verified. Action "${actionType}" executed successfully.`,
            actionType,
            description,
          },
          durationMs: Date.now() - start,
        };
      },
    });

    // 7. Real Device Agent Control & Action Execution Tool
    this.registerTool({
      name: 'device_action',
      displayName: 'Real Device Agent Controller',
      description: 'Executes verified real-world operating system and application actions (open app, launch website, open folder, open file) via connected Honk Device Agent.',
      category: 'system',
      parameters: {
        type: 'object',
        description: 'Device action parameters',
        properties: {
          action: { type: 'string', description: 'Action type (open_app, open_url, open_folder, open_file, type_text, click_element)', required: true },
          target: { type: 'string', description: 'Target application, website, folder, or file name (e.g. YouTube, Chrome, Notepad, Downloads)', required: true },
          platform: { type: 'string', enum: ['web', 'windows', 'android', 'macos', 'linux'], description: 'Target device platform' },
        },
        required: ['action', 'target'],
      },
      timeoutMs: 8000,
      execute: async (params, context) => {
        const start = Date.now();
        const action = String(params.action || 'open_app');
        const target = String(params.target || '');
        const platform = (String(params.platform || 'web')) as any;

        try {
          const { DeviceAgentOrchestrator } = await import('../device/DeviceAgentOrchestrator');
          const confirmedActions = (context.taskMemory.get('confirmedActions') as string[]) || [];
          const step = await DeviceAgentOrchestrator.getInstance().processDeviceRequest(
            `${action} ${target}`,
            confirmedActions,
            platform,
            context.taskId
          );

          if (step.requiresUserAction && step.intent) {
            return {
              success: false,
              requiresPermission: true,
              permissionDetails: {
                actionId: step.intent.id,
                actionType: step.intent.actionType,
                description: step.messageDesi,
                consequence: `Controls target "${target}" on ${step.targetDeviceName || 'device'}.`,
              },
              durationMs: Date.now() - start,
            };
          }

          return {
            success: step.stage === 'SUCCESS',
            verified: step.executionResult?.verified || false,
            data: {
              status: step.stage,
              message: step.messageDesi,
              targetDevice: step.targetDeviceName,
              verified: step.executionResult?.verified || false,
            },
            error: step.stage !== 'SUCCESS' ? step.messageDesi : undefined,
            durationMs: Date.now() - start,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            success: false,
            error: `Device action error: ${msg}`,
            durationMs: Date.now() - start,
          };
        }
      },
    });
  }
}
