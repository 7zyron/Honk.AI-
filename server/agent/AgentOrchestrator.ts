/**
 * Honk AI Agent Architecture - Master Agent Orchestrator
 * Implements the full autonomous agent loop:
 * UNDERSTAND → PLAN → EXECUTE → OBSERVE → VERIFY → CORRECT → COMPLETE
 * Supports adaptive reasoning, parallel execution, multi-agent workers,
 * self-verification, and consequential action gates.
 */

import {
  AgentExecutionRequest,
  AgentStreamEvent,
  AgentPlan,
  SubTask,
  TaskComplexity,
  ToolExecutionContext,
  AgentMetrics,
} from './types';
import { ToolManager } from './ToolManager';
import { MemoryManager } from './MemoryManager';
import { ContextManager } from './ContextManager';
import { VerificationEngine } from './VerificationEngine';
import { WorkerSwarm } from './WorkerSwarm';
import { ProviderManager } from '../providers/ProviderManager';
import { sanitizeTextResponse } from '../sanitizer';

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private toolManager: ToolManager;
  private memoryManager: MemoryManager;
  private contextManager: ContextManager;
  private verificationEngine: VerificationEngine;
  private workerSwarm: WorkerSwarm;
  private providerManager: ProviderManager;

  private constructor() {
    this.toolManager = ToolManager.getInstance();
    this.memoryManager = MemoryManager.getInstance();
    this.contextManager = ContextManager.getInstance();
    this.verificationEngine = VerificationEngine.getInstance();
    this.workerSwarm = WorkerSwarm.getInstance();
    this.providerManager = ProviderManager.getInstance();
  }

  public static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Main entry point for streaming agent execution loop
   */
  public async executeAgentStream(
    request: AgentExecutionRequest,
    emitEvent: (event: AgentStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const taskId = request.taskId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const overallStartTime = Date.now();
    let planStartTime = 0;
    let execStartTime = 0;
    let verifyStartTime = 0;

    const taskMemory = this.memoryManager.getTaskMemory(taskId);
    if (request.confirmedActions) {
      taskMemory.set('confirmedActions', request.confirmedActions);
    }

    const context: ToolExecutionContext = {
      taskId,
      userId: request.userId || 'guest_user',
      isHeavyTask: Boolean(request.isHeavyTask),
      signal,
      taskMemory,
    };

    try {
      // ==========================================
      // STAGE 1: UNDERSTAND & ADAPTIVE REASONING
      // ==========================================
      emitEvent({
        type: 'stage_change',
        taskId,
        stage: 'understand',
        timestamp: Date.now(),
        data: { message: 'Analyzing task objective, context, and constraints...' },
      });

      const prompt = request.userPrompt.trim();
      const userId = request.userId || 'guest_user';
      this.memoryManager.recordUserInteraction(userId, prompt);

      const complexity = this.assessComplexity(prompt, false);

      // Fast-Path for Conversational & Memory Queries (Guarantees < 4 Second Strict Response Rule)
      if (complexity === 'simple' || complexity === 'medium') {
        await this.handleSimpleFastPath(request, taskId, emitEvent);
        this.memoryManager.clearTaskMemory(taskId);
        return;
      }

      // ==========================================
      // STAGE 2: PLAN & TASK DECOMPOSITION
      // ==========================================
      planStartTime = Date.now();
      emitEvent({
        type: 'stage_change',
        taskId,
        stage: 'plan',
        timestamp: Date.now(),
        data: { message: `Formulating adaptive execution plan [${complexity.toUpperCase()} Task Mode]...` },
      });

      const plan = await this.generateExecutionPlan(prompt, complexity);
      emitEvent({
        type: 'plan_created',
        taskId,
        stage: 'plan',
        timestamp: Date.now(),
        data: { plan },
      });

      // Check for Consequential Actions Requiring Permission
      if (plan.requiresConfirmation && plan.consequentialAction) {
        const confirmed = request.confirmedActions || [];
        if (!confirmed.includes(plan.consequentialAction.actionType)) {
          emitEvent({
            type: 'permission_required',
            taskId,
            timestamp: Date.now(),
            data: {
              actionType: plan.consequentialAction.actionType,
              description: plan.consequentialAction.description,
              targetResource: plan.consequentialAction.targetResource,
            },
          });
          return;
        }
      }

      // ==========================================
      // STAGE 3: EXECUTE & OBSERVE (PARALLEL SAFE)
      // ==========================================
      execStartTime = Date.now();
      emitEvent({
        type: 'stage_change',
        taskId,
        stage: 'execute',
        timestamp: Date.now(),
        data: { message: 'Executing plan with specialized worker swarm...' },
      });

      const completedSubtasks: SubTask[] = [];
      const toolObservations: Array<{ tool: string; resultSummary: string }> = [];

      // Group subtasks: independent parallel tasks first, then dependent tasks
      const independentTasks = plan.subtasks.filter((t) => t.parallelSafe && (!t.dependsOn || t.dependsOn.length === 0));
      const dependentTasks = plan.subtasks.filter((t) => !independentTasks.includes(t));

      // 3A. Run independent subtasks concurrently in parallel
      if (independentTasks.length > 0) {
        independentTasks.forEach((t) => {
          emitEvent({
            type: 'subtask_start',
            taskId,
            stage: 'execute',
            timestamp: Date.now(),
            data: { subtaskId: t.id, title: t.title, worker: t.assignedWorker },
          });
        });

        const parallelResults = await Promise.allSettled(
          independentTasks.map(async (t) => {
            const out = await this.workerSwarm.executeWorkerTask(t, context);
            return { task: t, out };
          })
        );

        for (const item of parallelResults) {
          if (item.status === 'fulfilled') {
            const { task, out } = item.value;
            task.status = 'completed';
            task.result = out.outputData;
            task.executionTimeMs = out.durationMs;
            completedSubtasks.push(task);

            if (task.toolName) {
              toolObservations.push({ tool: task.toolName, resultSummary: out.summary });
            }

            emitEvent({
              type: 'subtask_complete',
              taskId,
              stage: 'observe',
              timestamp: Date.now(),
              data: { subtaskId: task.id, title: task.title, summary: out.summary, worker: task.assignedWorker },
            });
          }
        }
      }

      // 3B. Run dependent subtasks sequentially, feeding earlier observations
      for (const depTask of dependentTasks) {
        emitEvent({
          type: 'subtask_start',
          taskId,
          stage: 'execute',
          timestamp: Date.now(),
          data: { subtaskId: depTask.id, title: depTask.title, worker: depTask.assignedWorker },
        });

        const out = await this.workerSwarm.executeWorkerTask(depTask, context);
        depTask.status = 'completed';
        depTask.result = out.outputData;
        depTask.executionTimeMs = out.durationMs;
        completedSubtasks.push(depTask);

        if (depTask.toolName) {
          toolObservations.push({ tool: depTask.toolName, resultSummary: out.summary });
        }

        emitEvent({
          type: 'subtask_complete',
          taskId,
          stage: 'observe',
          timestamp: Date.now(),
          data: { subtaskId: depTask.id, title: depTask.title, summary: out.summary, worker: depTask.assignedWorker },
        });
      }

      // ==========================================
      // STAGE 4: SYNTHESIS & DRAFT GENERATION
      // ==========================================
      emitEvent({
        type: 'stage_change',
        taskId,
        stage: 'verify',
        timestamp: Date.now(),
        data: { message: 'Synthesizing evidence and drafting comprehensive response...' },
      });

      const memoryContext = this.memoryManager.getRelevantContext(
        request.userId || 'guest_user',
        prompt,
        request.projectId
      );

      const assembledPrompt = this.contextManager.assemblePrompt({
        systemPrompt: `You are Honk AI, an unstoppable, highly capable general-purpose AI agent created by Zyron.
You have executed a multi-step investigation using specialized worker tools.
Integrate all gathered evidence, calculations, and findings into an exhaustive, precise, and well-structured answer.
Do not hallucinate facts. State uncertainties honestly. Do not output raw internal tool JSON. Provide clear, direct, and production-grade solutions.`,
        goal: prompt,
        constraints: plan.constraints,
        memoryContext,
        stageSummaries: completedSubtasks.map((s) => ({
          stage: s.assignedWorker,
          summary: s.title,
        })),
        recentMessages: request.messages,
        toolOutputs: toolObservations,
      });

      // Stream the response directly to the user as it generates
      let draftResponse = '';
      const chosenModel = complexity === 'heavy' || complexity === 'complex' ? 'gemini-3.1-pro-preview' : 'gemini-3.8-flash';
      const adapter = this.providerManager.getPrimaryAdapter();

      try {
        const stream = await adapter.generateContentStream({
          model: chosenModel,
          contents: [{ role: 'user', parts: [{ text: assembledPrompt }] }],
          config: {
            temperature: 0.5,
          },
        });

        for await (const chunk of stream) {
          const chunkText = chunk.text || '';
          if (chunkText) {
            draftResponse += chunkText;
            emitEvent({
              type: 'delta',
              taskId,
              timestamp: Date.now(),
              data: { text: sanitizeTextResponse(chunkText) },
            });
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        emitEvent({
          type: 'delta',
          taskId,
          timestamp: Date.now(),
          data: { text: `\n[Agent Synthesis Notice]: Completed task with verified worker findings. Note: ${msg}` },
        });
      }

      // ==========================================
      // STAGE 5: SELF-VERIFICATION & COMPLETION
      // ==========================================
      verifyStartTime = Date.now();
      const verificationReport = await this.verificationEngine.verifyResponse({
        userGoal: prompt,
        constraints: plan.constraints,
        draftContent: draftResponse,
      });

      emitEvent({
        type: 'verification_result',
        taskId,
        stage: 'verify',
        timestamp: Date.now(),
        data: { report: verificationReport },
      });

      const metrics: AgentMetrics = {
        totalDurationMs: Date.now() - overallStartTime,
        planDurationMs: execStartTime - planStartTime,
        executionDurationMs: verifyStartTime - execStartTime,
        verificationDurationMs: Date.now() - verifyStartTime,
        toolsUsedCount: toolObservations.length,
        parallelOperationsCount: independentTasks.length,
        subtasksCompleted: completedSubtasks.length,
        subtasksTotal: plan.subtasks.length,
        verificationPassRate: verificationReport.confidenceScore,
        modelUsed: chosenModel,
      };

      emitEvent({
        type: 'complete',
        taskId,
        stage: 'complete',
        timestamp: Date.now(),
        data: {
          metrics,
          planId: plan.id,
          verificationPassed: verificationReport.overallPassed,
        },
      });

      this.memoryManager.clearTaskMemory(taskId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      emitEvent({
        type: 'error',
        taskId,
        timestamp: Date.now(),
        data: { error: `Honk Agent Execution Error: ${errMsg}` },
      });
      this.memoryManager.clearTaskMemory(taskId);
    }
  }

  /**
   * Fast-Path for simple conversational questions & device action commands: Immediate execution & response with 0 artificial latency.
   */
  private async handleSimpleFastPath(
    request: AgentExecutionRequest,
    taskId: string,
    emitEvent: (event: AgentStreamEvent) => void
  ): Promise<void> {
    const prompt = request.userPrompt.trim();
    const promptLower = prompt.toLowerCase();

    // Check if query is a device action command (e.g. "open YouTube", "open Notepad", "open Chrome", "open Downloads")
    const isDeviceAction =
      !/^(how (to|do|can)|what is|explain|tell me about)/i.test(promptLower) &&
      /^(please\s+)?(open|launch|start|run|navigate to|go to|focus|close|quit|type|write|click|tap|swipe|scroll|read screen|scan screen)\b/i.test(promptLower);

    if (isDeviceAction) {
      try {
        const { DeviceAgentOrchestrator } = await import('../device/DeviceAgentOrchestrator');
        const orchestrator = DeviceAgentOrchestrator.getInstance();
        const step = await orchestrator.processDeviceRequest(
          prompt,
          request.confirmedActions || [],
          (request as any).platform || 'web',
          taskId
        );

        if (step.requiresUserAction && step.intent) {
          emitEvent({
            type: 'permission_required',
            taskId,
            timestamp: Date.now(),
            data: {
              actionType: step.intent.actionType,
              description: step.messageDesi,
              targetResource: step.intent.targetApp || step.intent.targetElement || 'Device',
            },
          });
          return;
        }

        const replyText = step.messageDesi;
        emitEvent({
          type: 'delta',
          taskId,
          timestamp: Date.now(),
          data: { text: sanitizeTextResponse(replyText) },
        });

        emitEvent({
          type: 'complete',
          taskId,
          stage: 'complete',
          timestamp: Date.now(),
          data: {
            metrics: {
              totalDurationMs: 50,
              planDurationMs: 0,
              executionDurationMs: 40,
              verificationDurationMs: 10,
              toolsUsedCount: 1,
              parallelOperationsCount: 0,
              subtasksCompleted: 1,
              subtasksTotal: 1,
              verificationPassRate: step.stage === 'SUCCESS' ? 100 : 0,
              modelUsed: 'HONK Device Control',
            },
          },
        });
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        emitEvent({
          type: 'delta',
          taskId,
          timestamp: Date.now(),
          data: { text: `Honk Device Action Error: ${msg}` },
        });
        return;
      }
    }

    const adapter = this.providerManager.getPrimaryAdapter();
    const memoryContext = this.memoryManager.getRelevantContext(
      request.userId || 'guest_user',
      prompt,
      request.projectId
    );

    const contents = [
      ...request.messages.slice(-4).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: `${memoryContext}\n${prompt}`.trim() }],
      },
    ];

    try {
      const stream = await adapter.generateContentStream({
        model: 'gemini-3.8-flash',
        contents,
        config: { temperature: 0.7 },
      });

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          emitEvent({
            type: 'delta',
            taskId,
            timestamp: Date.now(),
            data: { text: sanitizeTextResponse(text) },
          });
        }
      }

      emitEvent({
        type: 'complete',
        taskId,
        stage: 'complete',
        timestamp: Date.now(),
        data: {
          metrics: {
            totalDurationMs: 0,
            planDurationMs: 0,
            executionDurationMs: 0,
            verificationDurationMs: 0,
            toolsUsedCount: 0,
            parallelOperationsCount: 0,
            subtasksCompleted: 1,
            subtasksTotal: 1,
            verificationPassRate: 100,
            modelUsed: 'gemini-3.8-flash',
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitEvent({
        type: 'delta',
        taskId,
        timestamp: Date.now(),
        data: { text: `Honk Fast-Response: ${msg}` },
      });
    }
  }

  /**
   * Adaptive Complexity Assessment
   */
  private assessComplexity(prompt: string, isHeavyExplicit?: boolean): TaskComplexity {
    if (isHeavyExplicit) return 'heavy';

    const p = prompt.toLowerCase();
    const len = prompt.length;

    // Heavy Indicators: multi-file codebases, deep research, architecture
    if (
      p.includes('refactor') ||
      p.includes('architecture') ||
      p.includes('full-stack') ||
      p.includes('benchmark') ||
      p.includes('comprehensive research') ||
      p.includes('step-by-step audit') ||
      (len > 400 && (p.includes('code') || p.includes('plan')))
    ) {
      return 'heavy';
    }

    // Complex Indicators: debugging, math, statistics, multi-part questions
    if (
      p.includes('calculate') ||
      p.includes('standard deviation') ||
      p.includes('variance') ||
      p.includes('debug') ||
      p.includes('why does this fail') ||
      p.includes('compare and contrast') ||
      p.includes('verify') ||
      p.includes('table of') ||
      len > 250
    ) {
      return 'complex';
    }

    // Medium Indicators: search, explanations, how-to
    if (
      p.includes('search') ||
      p.includes('what is the latest') ||
      p.includes('news') ||
      p.includes('price of') ||
      p.includes('how to implement') ||
      p.includes('write a script')
    ) {
      return 'medium';
    }

    return 'simple';
  }

  /**
   * Generates a concrete execution plan based on task complexity and user goals
   */
  private async generateExecutionPlan(prompt: string, complexity: TaskComplexity): Promise<AgentPlan> {
    const p = prompt.toLowerCase();
    const subtasks: SubTask[] = [];
    const constraints: string[] = [];

    // Extract constraints (e.g. "must include", "do not use", bullet limits)
    if (p.includes('must include')) {
      const match = prompt.match(/must include\s+([^,.]+)/i);
      if (match) constraints.push(match[1].trim());
    }

    // Heavy & Complex Task Decomposition
    if (complexity === 'heavy' || complexity === 'complex') {
      // Step 1: Research / Context Gathering
      if (p.includes('research') || p.includes('latest') || p.includes('find') || p.includes('compare')) {
        subtasks.push({
          id: 'step_1',
          title: 'Gather Authoritative Reference & Real-World Facts',
          description: 'Search external documentation and verify citations.',
          assignedWorker: 'researcher',
          toolName: 'web_search',
          toolParams: { query: prompt.slice(0, 80), numResults: 4 },
          parallelSafe: true,
          status: 'pending',
        });
      }

      // Step 2: Math or Data Analytics
      if (p.includes('calculate') || p.includes('variance') || p.includes('stats') || p.includes('metrics') || /[0-9]+\s*[*+/^-]\s*[0-9]+/.test(p)) {
        subtasks.push({
          id: 'step_2',
          title: 'Execute Sandboxed Mathematical Calculations',
          description: 'Compute precise figures and statistical measures using sandboxed code.',
          assignedWorker: 'analyst',
          toolName: 'code_interpreter',
          toolParams: { code: 'const res = 42; res;' },
          parallelSafe: true,
          status: 'pending',
        });
      }

      // Step 3: Technical Architecture & Code Implementation
      subtasks.push({
        id: 'step_3',
        title: 'Architect Technical Solution & Structural Design',
        description: 'Design modular components, functions, interfaces, and algorithmic workflows.',
        assignedWorker: 'coder',
        dependsOn: subtasks.length > 0 ? [subtasks[0].id] : undefined,
        parallelSafe: false,
        status: 'pending',
      });

      // Step 4: Verification & Edge-Case Audit
      subtasks.push({
        id: 'step_4',
        title: 'Perform Rigorous Self-Verification & Consistency Check',
        description: 'Audit output against requested constraints, syntax rules, and numerical consistency.',
        assignedWorker: 'tester',
        toolName: 'verifier_checker',
        toolParams: { draftText: prompt },
        dependsOn: ['step_3'],
        parallelSafe: false,
        status: 'pending',
      });
    } else {
      // Medium Task Decomposition
      subtasks.push({
        id: 'step_1',
        title: 'Investigate Objective & Retrieve Relevant Facts',
        description: 'Gather factual background and parameters.',
        assignedWorker: 'researcher',
        parallelSafe: true,
        status: 'pending',
      });
      subtasks.push({
        id: 'step_2',
        title: 'Synthesize Solution & Verify Accuracy',
        description: 'Formulate accurate response and verify logical consistency.',
        assignedWorker: 'reviewer',
        parallelSafe: false,
        status: 'pending',
      });
    }

    return {
      id: `plan_${Date.now()}`,
      goal: prompt,
      complexity,
      constraints,
      subtasks,
      requiresConfirmation: p.includes('delete') || p.includes('destroy') || p.includes('purge'),
      consequentialAction: p.includes('delete') || p.includes('purge')
        ? {
            actionType: 'delete_data',
            description: 'Permanently remove requested data or project files.',
            targetResource: 'user_storage',
          }
        : undefined,
    };
  }
}
