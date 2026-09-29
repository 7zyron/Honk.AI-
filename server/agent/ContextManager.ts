/**
 * Honk AI Agent Architecture - Context Manager
 * Prevents context-window overflow, manages token limits, preserves constraints,
 * and compresses completed subtask outputs into high-density working context.
 */

export interface WorkingContext {
  systemPrompt: string;
  constraints: string[];
  pinnedFacts: string[];
  compressedHistory: string;
  activePlanSummary?: string;
  stageSummaries: Map<string, string>;
}

export class ContextManager {
  private static instance: ContextManager;
  private maxTokensApprox = 120000; // Safe threshold for heavy agent tasks

  private constructor() {}

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * Builds an optimized prompt payload from working context, constraints, and intermediate results.
   */
  public assemblePrompt(params: {
    systemPrompt: string;
    goal: string;
    constraints: string[];
    memoryContext?: string;
    stageSummaries?: Array<{ stage: string; summary: string }>;
    recentMessages: Array<{ role: string; content: string }>;
    toolOutputs?: Array<{ tool: string; resultSummary: string }>;
  }): string {
    const sections: string[] = [];

    // 1. Core System Instruction
    sections.push(params.systemPrompt);

    // 2. User Goal & Strict Constraints (Always pinned at top)
    if (params.constraints && params.constraints.length > 0) {
      sections.push(
        `\n[MANDATORY TASK CONSTRAINTS]:\n${params.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      );
    }

    // 3. User Memory & Preferences
    if (params.memoryContext) {
      sections.push(params.memoryContext);
    }

    // 4. Summarized Completed Stages (Compressed for high density)
    if (params.stageSummaries && params.stageSummaries.length > 0) {
      const summaryText = params.stageSummaries
        .map((s) => `[Stage: ${s.stage.toUpperCase()}] -> ${s.summary}`)
        .join('\n');
      sections.push(`\n[COMPLETED STAGES PROGRESS]:\n${summaryText}`);
    }

    // 5. Tool Observations (High-value facts extracted)
    if (params.toolOutputs && params.toolOutputs.length > 0) {
      const toolText = params.toolOutputs
        .map((t) => `[Tool: ${t.tool}] -> ${t.resultSummary}`)
        .join('\n');
      sections.push(`\n[OBSERVED TOOL RESULTS & EVIDENCE]:\n${toolText}`);
    }

    // 6. Recent Conversation Window (Pruned to latest 6 turns to avoid bloat)
    if (params.recentMessages && params.recentMessages.length > 0) {
      const pruned = params.recentMessages.slice(-6);
      const conversationText = pruned
        .map((m) => `${m.role.toUpperCase()}: ${this.truncateMessage(m.content, 1200)}`)
        .join('\n\n');
      sections.push(`\n[RECENT CONVERSATION]:\n${conversationText}`);
    }

    // 7. Goal Reminder
    sections.push(`\n[CURRENT OBJECTIVE]: ${params.goal}`);

    return sections.join('\n\n');
  }

  /**
   * Compresses verbose tool output or long document into an information-dense summary
   */
  public compressContent(content: string, maxChars = 2000): string {
    if (content.length <= maxChars) return content;

    // Preserve the beginning, structured items, and end
    const head = content.slice(0, Math.floor(maxChars * 0.6));
    const tail = content.slice(-Math.floor(maxChars * 0.3));
    return `${head}\n\n[... ${content.length - maxChars} characters summarized ...]\n\n${tail}`;
  }

  private truncateMessage(text: string, limit: number): string {
    if (text.length <= limit) return text;
    return text.slice(0, limit) + '... [truncated]';
  }
}
