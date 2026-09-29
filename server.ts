import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';

import { Capability, PublicHonkModel, SUPPORTED_INDIAN_LANGUAGES } from './server/types';
import { handleUnifiedChatRequest } from './server/capabilities/chat';
import { executeVisionAnalysis } from './server/capabilities/vision';
import { analyzePhotoKheecho, followUpPhotoKheecho } from './server/capabilities/photoKheecho';
import { executeImageGeneration } from './server/capabilities/image';
import { createVideoJob, getVideoJob, cancelVideoJob } from './server/capabilities/video';
import {
  createAppBuilderJob,
  getAppBuilderJob,
  listAppBuilderJobs,
  deleteAppBuilderJob,
  refineAppBuilderJob,
  exportAppBuilderJob,
} from './server/capabilities/appBuilder';
import {
  executePublishPipeline,
  listDeployments,
  getDeployment,
  deleteDeployment,
  AVAILABLE_CODING_MODELS,
} from './server/capabilities/deployEngine';
import {
  fetchGitHubRepositoryFiles,
  inspectPublicProjectUrl,
  fetchBuilderTemplate,
  repairApplicationWithAi,
} from './server/capabilities/importEngine';
import { executeDocumentAnalysis } from './server/capabilities/document';
import { executeAudioTranscription, executeTextToSpeech } from './server/capabilities/audio';
import {
  synthesizePiperSpeech,
  getPiperTtsStatus,
  isPiperTtsConfigured,
  diagnoseVoicePipeline,
} from './server/capabilities/piperTts';
import { executeTranslation } from './server/capabilities/language';
import { executePromptEnhancement } from './server/capabilities/promptEnhancement';
import {
  handleDeviceAgentRequest,
  handleExecuteDeviceActionRequest,
  handleGetDeviceStatusRequest,
  handleDeviceConnectRequest,
  handleDeviceDisconnectRequest,
  handleEmergencyStopRequest,
  handleGetPermissionsRequest,
  handleTestConnectionRequest,
  handleVerifyStateRequest,
} from './server/capabilities/deviceAgent';
import {
  handleGetShieldStatus,
  handleGetShieldSettings,
  handleUpdateShieldSettings,
  handleVerifyShieldPin,
  handleSetShieldPin,
  handleGetShieldContacts,
  handleAddShieldContact,
  handleUpdateShieldContact,
  handleDeleteShieldContact,
  handleTestContactAlert,
  handleGetShieldEvents,
  handleRegisterFailedAttempt,
  handleResolveShieldEvent,
  handleDeleteShieldEvent,
  handleClearShieldEvents,
  handleExecuteEmergencyAction,
} from './server/capabilities/honkShield';
import {
  extractAuthIdentity,
  checkCapabilityRateLimit,
  setCapabilityRateLimit,
  requireCapability,
  sendSafeError,
} from './server/security';
import { ProviderManager } from './server/providers/ProviderManager';
import {
  handleCreateShare,
  handleGetShare,
  handleGetUserShares,
  handleRevokeShare,
} from './server/sharedChats';
import { AgentOrchestrator } from './server/agent/AgentOrchestrator';
import { ToolManager } from './server/agent/ToolManager';
import { MemoryManager } from './server/agent/MemoryManager';
import { AgentBenchmark } from './server/agent/AgentBenchmark';
import { HonkSearchEngine } from './server/capabilities/searchEngine';
import { requireDeveloperAuth, RBACManager } from './server/auth/rbac';
import { VersionManager } from './server/improvement/VersionManager';
import { ExperimentManager } from './server/improvement/ExperimentManager';
import { SelfImprovementEngine } from './server/improvement/SelfImprovementEngine';
import { EvaluationHarness } from './server/improvement/EvaluationHarness';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable gzip/deflate compression for fast transfer on 2G and slow connections
app.use(
  compression({
    filter: (req, res) => {
      // Don't compress SSE events or audio streams to prevent buffering & latency
      if (
        req.headers.accept?.includes('text/event-stream') ||
        req.path === '/api/chat' ||
        req.path === '/v1/chat' ||
        req.path.startsWith('/api/tts')
      ) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// High limit for handling base64 file and image uploads, large code pastes, and documents
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS headers for unified API access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-honk-key, x-user-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// -------------------------------------------------------------
// Device Agent & Permission Control Endpoints
// -------------------------------------------------------------
app.get('/api/device/status', handleGetDeviceStatusRequest);
app.post('/api/device/connect', handleDeviceConnectRequest);
app.post('/api/device/disconnect', handleDeviceDisconnectRequest);
app.post('/api/device/execute', handleExecuteDeviceActionRequest);
app.post('/api/device/request', handleDeviceAgentRequest);
app.post('/api/device/stop', handleEmergencyStopRequest);
app.get('/api/device/permissions', handleGetPermissionsRequest);
app.post('/api/device/test-connection', handleTestConnectionRequest);
app.post('/api/device/verify', handleVerifyStateRequest);

// -------------------------------------------------------------
// HONK SHIELD — Device Security & Intrusion Protection Endpoints
// -------------------------------------------------------------
app.get('/api/shield/status', handleGetShieldStatus);
app.get('/api/shield/settings', handleGetShieldSettings);
app.post('/api/shield/settings', handleUpdateShieldSettings);
app.post('/api/shield/verify-pin', handleVerifyShieldPin);
app.post('/api/shield/set-pin', handleSetShieldPin);
app.get('/api/shield/contacts', handleGetShieldContacts);
app.post('/api/shield/contacts', handleAddShieldContact);
app.put('/api/shield/contacts/:id', handleUpdateShieldContact);
app.delete('/api/shield/contacts/:id', handleDeleteShieldContact);
app.post('/api/shield/contacts/test', handleTestContactAlert);
app.get('/api/shield/events', handleGetShieldEvents);
app.post('/api/shield/failed-attempt', handleRegisterFailedAttempt);
app.post('/api/shield/events/resolve', handleResolveShieldEvent);
app.post('/api/shield/events/delete', handleDeleteShieldEvent);
app.post('/api/shield/events/clear', handleClearShieldEvents);
app.post('/api/shield/emergency', handleExecuteEmergencyAction);

// -------------------------------------------------------------
// SEO & Autodiscovery: Robots.txt, Sitemap.xml & OpenSearch 1.1
// -------------------------------------------------------------
app.get('/opensearch.xml', (_req: Request, res: Response) => {
  const openSearchPath = fs.existsSync(path.join(process.cwd(), 'public', 'opensearch.xml'))
    ? path.join(process.cwd(), 'public', 'opensearch.xml')
    : path.join(process.cwd(), 'dist', 'opensearch.xml');

  if (fs.existsSync(openSearchPath)) {
    res.set({
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    });
    res.sendFile(openSearchPath);
  } else {
    // Direct fallback with exact specification
    res.set({
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    }).send(`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Honk</ShortName>
  <Description>Search the web with Honk</Description>
  <Url type="text/html" template="https://honk-ai-harshil.ai.studio/search?q={searchTerms}"/>
</OpenSearchDescription>`);
  }
});

app.get('/robots.txt', (_req: Request, res: Response) => {
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  if (fs.existsSync(robotsPath)) {
    res.type('text/plain').sendFile(robotsPath);
  } else {
    res.type('text/plain').send('User-agent: *\nAllow: /\n\nSitemap: https://honk-ai-harshil.ai.studio/sitemap.xml\n');
  }
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    res.type('application/xml').sendFile(sitemapPath);
  } else {
    res.status(404).send('Not Found');
  }
});

// Serve static files from public directory (favicons, robots, sitemaps, logos)
app.use(express.static(path.join(process.cwd(), 'public')));

app.get(['/site.webmanifest', '/manifest.json'], (_req: Request, res: Response) => {
  const manifestPath = path.join(process.cwd(), 'public', 'site.webmanifest');
  if (fs.existsSync(manifestPath)) {
    res.type('application/manifest+json').sendFile(manifestPath);
  } else {
    res.status(404).json({ error: 'Manifest not found' });
  }
});

app.get('/sw.js', (_req: Request, res: Response) => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  if (fs.existsSync(swPath)) {
    res.set({
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.sendFile(swPath);
  } else {
    res.status(404).send('Service worker not found');
  }
});

// -------------------------------------------------------------
// OpenAPI Spec
// -------------------------------------------------------------
app.get(['/openapi.json', '/v1/openapi.json'], (_req: Request, res: Response) => {
  const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
  if (fs.existsSync(openapiPath)) {
    res.type('application/json').sendFile(openapiPath);
  } else {
    res.status(404).json({ error: 'OpenAPI specification not found' });
  }
});

// -------------------------------------------------------------
// System Health & Monitoring
// -------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  const providerManager = ProviderManager.getInstance();
  const status = providerManager.getHealthStatus();

  res.json({
    status: 'ok',
    appName: 'Honk AI',
    platform: 'HONK AI Master Platform',
    timestamp: Date.now(),
    hasApiKey: status.configured,
    circuitState: status.circuitState,
  });
});

// In-memory store for user preferences (synchronized with account)
const userPreferencesStore = new Map<string, any>();

// User Preferences API (theme, accent color, customizations)
app.get('/api/user/preferences', (req: Request, res: Response) => {
  const { userId } = extractAuthIdentity(req);
  const prefs = userPreferencesStore.get(userId) || null;
  res.json({ success: true, userId, preferences: prefs });
});

app.post('/api/user/preferences', (req: Request, res: Response) => {
  const { userId } = extractAuthIdentity(req);
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    res.status(400).json({ error: 'Invalid preferences payload' });
    return;
  }
  const existing = userPreferencesStore.get(userId) || {};
  const updated = { ...existing, ...incoming, updatedAt: Date.now() };
  userPreferencesStore.set(userId, updated);
  res.json({ success: true, userId, preferences: updated });
});

// Compatibility Usage Endpoint for Frontend
app.get('/api/quota', (req: Request, res: Response) => {
  const { userId } = extractAuthIdentity(req);
  const check = checkCapabilityRateLimit(userId, Capability.CHAT);

  res.json({
    userId,
    limit: check.limit,
    used: check.limit - check.remaining,
    remaining: check.remaining,
    resetAt: check.resetAt,
    isLimitReached: check.remaining <= 0,
  });
});

// Reset endpoint for testing rate limits
app.post('/api/quota/reset', (req: Request, res: Response) => {
  const { userId } = extractAuthIdentity(req);
  setCapabilityRateLimit(userId, Capability.CHAT, 0);
  const check = checkCapabilityRateLimit(userId, Capability.CHAT);
  res.json({
    message: 'Daily counter reset successfully',
    limit: check.limit,
    used: 0,
    remaining: check.limit,
    resetAt: check.resetAt,
  });
});

app.post('/api/quota/set-count', (req: Request, res: Response) => {
  const { userId } = extractAuthIdentity(req);
  const { count } = req.body;
  if (typeof count !== 'number') return res.status(400).json({error: 'Invalid count'});
  setCapabilityRateLimit(userId, Capability.CHAT, count);
  const check = checkCapabilityRateLimit(userId, Capability.CHAT);
  res.json({
    userId,
    limit: check.limit,
    used: check.limit - check.remaining,
    remaining: check.remaining,
    resetAt: check.resetAt,
    isLimitReached: check.remaining <= 0,
  });
});

// -------------------------------------------------------------
// 1. Unified Models & Capabilities Endpoints
// -------------------------------------------------------------
app.get('/v1/models', (_req: Request, res: Response) => {
  res.json({
    object: 'list',
    data: [
      {
        id: PublicHonkModel.HONK,
        name: 'HONK',
        description: 'Ultra-fast daily intelligence for conversation, writing, and everyday assistance.',
        contextWindow: 1048576,
        capabilities: ['chat', 'vision', 'code', 'translation'],
      },
      {
        id: PublicHonkModel.HONK_1_5,
        name: 'HONK 1.5',
        description: 'High-capacity model optimized for deep document analysis, comprehensive research, and complex problem-solving.',
        contextWindow: 2097152,
        capabilities: ['chat', 'reasoning', 'document', 'vision', 'code'],
      },
      {
        id: PublicHonkModel.HONK_2_0,
        name: 'HONK 2.0',
        description: 'State-of-the-art analytical engine with extended internal reasoning budget for advanced STEM, mathematics, and intricate software architectures.',
        contextWindow: 1048576,
        capabilities: ['chat', 'reasoning', 'code', 'architecture'],
      },
    ],
  });
});

app.get('/v1/capabilities', (_req: Request, res: Response) => {
  res.json({
    capabilities: Object.values(Capability),
    supportedIndianLanguages: SUPPORTED_INDIAN_LANGUAGES,
    features: {
      streaming: true,
      hinglishSupport: true,
      asyncVideoJobs: true,
      appBuilder: true,
      audioIntelligence: true,
      documentIntelligence: true,
    },
  });
});

// -------------------------------------------------------------
// 2. Chat & Reasoning: POST /v1/chat & POST /api/chat
// -------------------------------------------------------------
// Preserved: SSE streaming, HONK, HONK 1.5, HONK 2.0, auth, Hinglish
app.post('/v1/chat', handleUnifiedChatRequest);
app.post('/api/chat', handleUnifiedChatRequest);

// -------------------------------------------------------------
// 3. Vision: POST /v1/vision
// -------------------------------------------------------------
app.post('/v1/vision', requireCapability(Capability.VISION), async (req: Request, res: Response) => {
  try {
    const { image, prompt, mode } = req.body;
    if (!image) {
      res.status(400).json({ error: 'Image data is required (base64 data URI)' });
      return;
    }
    const result = await executeVisionAnalysis({ image, prompt, mode });
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Vision analysis failed');
  }
});

// -------------------------------------------------------------
// 3b. PHOTO KHEECHO, KAAM KHATAM: POST /api/photo-kheecho/analyze & /follow-up
// -------------------------------------------------------------
app.post('/api/photo-kheecho/analyze', requireCapability(Capability.VISION), async (req: Request, res: Response) => {
  try {
    const { image, question, language, history } = req.body;
    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Image data is required (base64 data URI format)' });
      return;
    }
    const result = await analyzePhotoKheecho({
      image,
      question,
      language,
      history,
    });
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Photo Kheecho analysis failed');
  }
});

app.post('/api/photo-kheecho/follow-up', requireCapability(Capability.VISION), async (req: Request, res: Response) => {
  try {
    const { image, question, language, history } = req.body;
    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Image context reference is required for follow-up questions' });
      return;
    }
    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }
    const result = await followUpPhotoKheecho({
      image,
      question,
      language,
      history: Array.isArray(history) ? history : [],
    });
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Photo Kheecho follow-up failed');
  }
});

// -------------------------------------------------------------
// 3c. HONK SEARCH — "BEFORE YOU THINK": Predictive Search & Memory API
// -------------------------------------------------------------

// Instant Predictive Suggestions (<30ms)
app.get('/api/search/predict', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const engine = HonkSearchEngine.getInstance();
    const predictions = await engine.getPredictionService().getPredictions(q, userId);
    res.json({ success: true, predictions, query: q });
  } catch (err) {
    sendSafeError(res, err, 'Failed to fetch search predictions');
  }
});

// Primary Search Action (1 HONK = The Internet Searched For You)
app.post('/api/search', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const { query, options } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    const engine = HonkSearchEngine.getInstance();
    const result = await engine.search(query.trim(), userId, options);
    res.json({ success: true, result });
  } catch (err) {
    sendSafeError(res, err, 'Honk Search failed');
  }
});

// Memory API: List or Search Memories
app.get('/api/search/memory', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const engine = HonkSearchEngine.getInstance();
    const memoryService = engine.getMemoryService();

    const isEnabled = memoryService.isMemoryEnabled(userId);
    const memories = q ? await memoryService.searchMemory(userId, q) : await memoryService.getMemories(userId);

    res.json({ success: true, isEnabled, memories });
  } catch (err) {
    sendSafeError(res, err, 'Failed to fetch search memory');
  }
});

// Memory API: Save Memory Item
app.post('/api/search/memory', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const { query, summary, keyFacts, sources, tags, userNotes } = req.body;
    if (!query || !summary) {
      res.status(400).json({ error: 'Query and summary are required to save memory' });
      return;
    }

    const engine = HonkSearchEngine.getInstance();
    const saved = await engine.getMemoryService().saveMemory(userId, {
      userId,
      query,
      summary,
      keyFacts: Array.isArray(keyFacts) ? keyFacts : [],
      sources: Array.isArray(sources) ? sources : [],
      tags: Array.isArray(tags) ? tags : [],
      userNotes,
    });

    res.json({ success: true, memory: saved });
  } catch (err) {
    sendSafeError(res, err, 'Failed to save search memory');
  }
});

// Memory API: Update Personal Note
app.patch('/api/search/memory/:id/notes', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const memoryId = req.params.id;
    const { notes } = req.body;
    const engine = HonkSearchEngine.getInstance();
    const updated = await engine.getMemoryService().updateMemoryNotes(userId, memoryId, typeof notes === 'string' ? notes : '');
    res.json({ success: true, memory: updated });
  } catch (err) {
    sendSafeError(res, err, 'Failed to update memory notes');
  }
});

// Memory API: Delete Single Memory Item
app.delete('/api/search/memory/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const memoryId = req.params.id;
    const engine = HonkSearchEngine.getInstance();
    await engine.getMemoryService().deleteMemory(userId, memoryId);
    res.json({ success: true, deletedId: memoryId });
  } catch (err) {
    sendSafeError(res, err, 'Failed to delete search memory');
  }
});

// Memory API: Clear All Search Memory
app.post('/api/search/memory/clear', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const engine = HonkSearchEngine.getInstance();
    await engine.getMemoryService().clearMemory(userId);
    res.json({ success: true, message: 'All search memories cleared' });
  } catch (err) {
    sendSafeError(res, err, 'Failed to clear search memory');
  }
});

// Memory API: Toggle Memory Enabled / Disabled
app.post('/api/search/memory/toggle', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const { enabled } = req.body;
    const engine = HonkSearchEngine.getInstance();
    engine.getMemoryService().setMemoryEnabled(userId, Boolean(enabled));
    res.json({ success: true, isEnabled: Boolean(enabled) });
  } catch (err) {
    sendSafeError(res, err, 'Failed to toggle search memory');
  }
});

// OpenSearch Suggestions API for browser search bar autocompletion (Microsoft Edge / Chromium)
app.get('/api/search/opensearch-suggestions', async (req: Request, res: Response) => {
  try {
    const { userId } = extractAuthIdentity(req);
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const engine = HonkSearchEngine.getInstance();
    const predictions = await engine.getPredictionService().getPredictions(q, userId);
    const suggestions = predictions.map((p) => p.text);
    res.set({
      'Content-Type': 'application/x-suggestions+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    });
    res.json([q, suggestions]);
  } catch (err) {
    res.set({
      'Content-Type': 'application/x-suggestions+json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.json([req.query.q || '', []]);
  }
});

// -------------------------------------------------------------
// 4. AI Image: POST /v1/image, POST /api/generate-image, POST /api/image
// -------------------------------------------------------------
const handleImageGeneration = async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, resolution, mode, inputImage, engine, model } = req.body;
    if (!prompt && !inputImage) {
      res.status(400).json({ error: 'Prompt or inputImage is required' });
      return;
    }
    const result = await executeImageGeneration({
      prompt,
      aspectRatio,
      resolution,
      mode,
      inputImage,
      model: engine || model,
    });
    res.json(result);
  } catch (err: any) {
    sendSafeError(res, err, 'Image generation failed');
  }
};

app.post('/v1/image', requireCapability(Capability.IMAGE), handleImageGeneration);
app.post('/api/generate-image', requireCapability(Capability.IMAGE), handleImageGeneration);
app.post('/api/image', requireCapability(Capability.IMAGE), handleImageGeneration);

// -------------------------------------------------------------
// 5. AI Video: POST /v1/video, GET /v1/video/:id, POST /v1/video/:id/cancel
// -------------------------------------------------------------
app.post('/v1/video', requireCapability(Capability.VIDEO), (req: Request, res: Response) => {
  const { prompt, aspectRatio, durationSeconds } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Video prompt is required' });
    return;
  }
  const job = createVideoJob(prompt, { aspectRatio, durationSeconds });
  res.status(202).json({
    message: 'Video generation job created successfully',
    job,
  });
});

app.get('/v1/video/:id', (req: Request, res: Response) => {
  const job = getVideoJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Video job not found' });
    return;
  }
  res.json({ job });
});

app.post('/v1/video/:id/cancel', (req: Request, res: Response) => {
  const cancelled = cancelVideoJob(req.params.id);
  if (!cancelled) {
    res.status(400).json({ error: 'Job cannot be cancelled or was not found' });
    return;
  }
  res.json({ message: 'Video job cancelled successfully', id: req.params.id });
});

// -------------------------------------------------------------
// 6. AI App Builder: POST /v1/app-builder/generate, GET /v1/app-builder/:id, etc.
// -------------------------------------------------------------
app.post('/v1/app-builder/generate', requireCapability(Capability.APP_BUILDER), async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Application specification prompt is required' });
      return;
    }
    const job = await createAppBuilderJob(prompt);
    res.status(201).json({ job });
  } catch (err) {
    sendSafeError(res, err, 'App builder generation failed');
  }
});

app.get('/v1/app-builder/:id', (req: Request, res: Response) => {
  const job = getAppBuilderJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Application job not found' });
    return;
  }
  res.json({ job });
});

app.post('/v1/app-builder/:id/refine', requireCapability(Capability.APP_BUILDER), async (req: Request, res: Response) => {
  try {
    const { instruction } = req.body;
    if (!instruction) {
      res.status(400).json({ error: 'Refinement instruction is required' });
      return;
    }
    const job = await refineAppBuilderJob(req.params.id, instruction);
    res.json({ job });
  } catch (err) {
    sendSafeError(res, err, 'App refinement failed');
  }
});

app.post('/v1/app-builder/:id/export', (req: Request, res: Response) => {
  try {
    const exported = exportAppBuilderJob(req.params.id);
    res.json(exported);
  } catch (err) {
    sendSafeError(res, err, 'App export failed');
  }
});

// -------------------------------------------------------------
// 7. Document Intelligence: POST /v1/document
// -------------------------------------------------------------
app.post('/v1/document', requireCapability(Capability.DOCUMENT), async (req: Request, res: Response) => {
  try {
    const { document, filename, mimeType, mode, query } = req.body;
    if (!document) {
      res.status(400).json({ error: 'Document data (base64) is required' });
      return;
    }
    const result = await executeDocumentAnalysis({
      document,
      filename: filename || 'document.pdf',
      mimeType: mimeType || 'application/pdf',
      mode,
      query,
    });
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Document processing failed');
  }
});

// -------------------------------------------------------------
// 8. Audio Intelligence & Piper TTS Engine
// -------------------------------------------------------------
app.get('/api/tts/status', (_req: Request, res: Response) => {
  res.json(getPiperTtsStatus());
});

app.get('/api/tts/diagnose', async (_req: Request, res: Response) => {
  try {
    const report = await diagnoseVoicePipeline();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({
      error: 'DIAGNOSTIC_FAILURE',
      message: err.message || 'Failed to complete voice pipeline diagnostics',
    });
  }
});

app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, language, voice, speed, speakerId } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text is required for TTS synthesis' });
      return;
    }

    const result = await synthesizePiperSpeech({
      text,
      language,
      voice,
      speed: typeof speed === 'number' ? speed : 1.0,
      speakerId: typeof speakerId === 'number' ? speakerId : undefined,
    });

    // Check if client expects JSON or binary audio stream
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('application/json') && !acceptHeader.includes('audio/')) {
      res.json({
        audioBase64: `data:${result.mimeType};base64,${result.audioBuffer.toString('base64')}`,
        mimeType: result.mimeType,
        voiceUsed: result.voiceUsed,
        charCount: result.charCount,
      });
      return;
    }

    res.set({
      'Content-Type': result.mimeType,
      'Content-Length': String(result.audioBuffer.length),
      'Cache-Control': 'no-cache',
      'X-Piper-Voice': result.voiceUsed,
    });
    res.send(result.audioBuffer);
  } catch (err: any) {
    const isNotConfigured = err.message?.includes('PIPER_TTS_NOT_CONFIGURED');
    res.status(isNotConfigured ? 501 : 502).json({
      error: isNotConfigured ? 'PIPER_TTS_NOT_CONFIGURED' : 'PIPER_SYNTHESIS_ERROR',
      message: err.message || 'Failed to synthesize speech audio via Piper TTS.',
    });
  }
});

app.get('/api/tts', async (req: Request, res: Response) => {
  try {
    const text = (req.query.text as string) || '';
    const language = (req.query.language as string) || undefined;
    const voice = (req.query.voice as string) || undefined;
    const speed = req.query.speed ? parseFloat(req.query.speed as string) : 1.0;

    if (!text.trim()) {
      res.status(400).json({ error: 'Text query parameter is required' });
      return;
    }

    const result = await synthesizePiperSpeech({ text, language, voice, speed });

    res.set({
      'Content-Type': result.mimeType,
      'Content-Length': String(result.audioBuffer.length),
      'Cache-Control': 'public, max-age=3600',
      'X-Piper-Voice': result.voiceUsed,
    });
    res.send(result.audioBuffer);
  } catch (err: any) {
    const isNotConfigured = err.message?.includes('PIPER_TTS_NOT_CONFIGURED');
    res.status(isNotConfigured ? 501 : 502).json({
      error: isNotConfigured ? 'PIPER_TTS_NOT_CONFIGURED' : 'PIPER_SYNTHESIS_ERROR',
      message: err.message || 'Failed to synthesize speech audio via Piper TTS.',
    });
  }
});

app.post('/v1/audio/transcribe', requireCapability(Capability.AUDIO), async (req: Request, res: Response) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio) {
      res.status(400).json({ error: 'Audio data (base64) is required' });
      return;
    }
    const result = await executeAudioTranscription(audio, mimeType);
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Audio transcription failed');
  }
});

app.post('/v1/audio/speech', requireCapability(Capability.AUDIO), async (req: Request, res: Response) => {
  try {
    const { text, voice, language, speed } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text input is required' });
      return;
    }

    if (isPiperTtsConfigured()) {
      const result = await synthesizePiperSpeech({ text, voice, language, speed });
      res.json({
        audioBase64: `data:${result.mimeType};base64,${result.audioBuffer.toString('base64')}`,
        mimeType: result.mimeType,
        voiceUsed: result.voiceUsed,
        charCount: result.charCount,
      });
      return;
    }

    const result = await executeTextToSpeech(text, voice);
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Speech synthesis failed');
  }
});

// -------------------------------------------------------------
// 9. Translation: POST /v1/translate
// -------------------------------------------------------------
app.post('/v1/translate', requireCapability(Capability.TRANSLATION), async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;
    if (!text || !targetLanguage) {
      res.status(400).json({ error: 'Text and targetLanguage are required' });
      return;
    }
    const result = await executeTranslation({
      text,
      sourceLanguage,
      targetLanguage,
    });
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Translation failed');
  }
});

// -------------------------------------------------------------
// 10. Prompt Enhancement: POST /v1/enhance-prompt
// -------------------------------------------------------------
app.post('/v1/enhance-prompt', requireCapability(Capability.PROMPT_ENHANCEMENT), async (req: Request, res: Response) => {
  try {
    const { prompt, domain, outputStyle } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }
    const result = await executePromptEnhancement({ prompt, domain, outputStyle });
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'Prompt enhancement failed');
  }
});

// -------------------------------------------------------------
// 11. Production-Quality Shared Chats: /api/shares
// -------------------------------------------------------------
app.post('/api/shares', handleCreateShare);
app.get('/api/shares/:shareId', handleGetShare);
app.get('/api/user/shares', handleGetUserShares);
app.post('/api/shares/:shareId/revoke', handleRevokeShare);
app.delete('/api/shares/:shareId', handleRevokeShare);

// -------------------------------------------------------------
// 12. HONK App Studio / App Builder API: /api/app-builder/*
// -------------------------------------------------------------
app.get('/api/app-builder/models', (_req: Request, res: Response) => {
  res.json({
    models: AVAILABLE_CODING_MODELS,
    defaultModel: 'gemini-2.5-flash',
  });
});

app.post('/api/app-builder/create', async (req: Request, res: Response) => {
  try {
    const { prompt, modelId } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'App description or prompt is required' });
      return;
    }
    const job = await createAppBuilderJob(prompt.trim(), modelId);
    res.json(job);
  } catch (err) {
    sendSafeError(res, err, 'Failed to generate app');
  }
});

app.get('/api/app-builder/jobs', (_req: Request, res: Response) => {
  try {
    const jobs = listAppBuilderJobs();
    res.json(jobs);
  } catch (err) {
    sendSafeError(res, err, 'Failed to fetch app jobs');
  }
});

app.get('/api/app-builder/jobs/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = getAppBuilderJob(id);
    if (!job) {
      res.status(404).json({ error: 'App job not found' });
      return;
    }
    res.json(job);
  } catch (err) {
    sendSafeError(res, err, 'Failed to fetch app job');
  }
});

app.delete('/api/app-builder/jobs/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteAppBuilderJob(id);
    res.json({ success: deleted });
  } catch (err) {
    sendSafeError(res, err, 'Failed to delete app job');
  }
});

app.post('/api/app-builder/refine', async (req: Request, res: Response) => {
  try {
    const { id, instruction, modelId } = req.body;
    if (!id || !instruction) {
      res.status(400).json({ error: 'Job ID and instruction are required' });
      return;
    }
    const updatedJob = await refineAppBuilderJob(id, String(instruction).trim(), modelId);
    res.json(updatedJob);
  } catch (err) {
    sendSafeError(res, err, 'Failed to refine app');
  }
});

app.get('/api/app-builder/export/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exported = exportAppBuilderJob(id);
    res.json(exported);
  } catch (err) {
    sendSafeError(res, err, 'Failed to export app');
  }
});

// Real App Publishing & Deployment Pipeline
app.post('/api/app-builder/publish', async (req: Request, res: Response) => {
  try {
    const { projectId, name, description, files, previewHtml, customSlug, modelId } = req.body;
    if (!files || typeof files !== 'object') {
      res.status(400).json({ error: 'Project files are required for publishing' });
      return;
    }

    const deployment = await executePublishPipeline({
      projectId,
      name,
      description,
      files,
      previewHtml,
      customSlug,
      modelId,
    });

    if (deployment.status === 'failed') {
      res.status(422).json({
        error: deployment.error || 'Publishing failed during build verification',
        deployment,
      });
      return;
    }

    res.status(201).json({
      success: true,
      deployment,
      url: deployment.url,
      liveUrl: `${req.protocol}://${req.get('host')}${deployment.url}`,
    });
  } catch (err) {
    sendSafeError(res, err, 'Publishing failed');
  }
});

app.get('/api/app-builder/deployments', (_req: Request, res: Response) => {
  try {
    const list = listDeployments();
    res.json({ deployments: list });
  } catch (err) {
    sendSafeError(res, err, 'Failed to fetch deployments');
  }
});

app.get('/api/app-builder/deployments/:id', (req: Request, res: Response) => {
  try {
    const deployment = getDeployment(req.params.id);
    if (!deployment) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }
    res.json({ deployment });
  } catch (err) {
    sendSafeError(res, err, 'Failed to fetch deployment details');
  }
});

app.delete('/api/app-builder/deployments/:id', (req: Request, res: Response) => {
  try {
    const success = deleteDeployment(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Deployment not found' });
      return;
    }
    res.json({ success: true, message: 'Deployment unpublished successfully' });
  } catch (err) {
    sendSafeError(res, err, 'Failed to delete deployment');
  }
});

// Standalone Deployed App Public Hosting Handler (/app/:id and /p/:id)
app.get(['/app/:id', '/p/:id'], (req: Request, res: Response) => {
  const deployment = getDeployment(req.params.id);
  if (!deployment || !deployment.compiledHtml) {
    res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HONK App Not Found</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center min-h-screen p-4 text-center">
  <div class="max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-4">
    <div class="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
      404
    </div>
    <h1 class="text-xl font-bold text-white">Application Not Found</h1>
    <p class="text-sm text-zinc-400">The requested application is not deployed or has been unpublished.</p>
    <a href="/" class="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition">
      Open HONK AI Studio
    </a>
  </div>
</body>
</html>`);
    return;
  }

  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'X-Served-By': 'HONK-Edge-Publish',
  });
  res.send(deployment.compiledHtml);
});

// -------------------------------------------------------------
// HONK App Builder - Source Import & AI Repair Endpoints
// -------------------------------------------------------------
app.post('/api/app-builder/import/github', async (req: Request, res: Response) => {
  try {
    const { owner, repo, branch, subpath } = req.body;
    if (!owner || !repo) {
      res.status(400).json({ error: 'GitHub owner and repository name are required' });
      return;
    }
    const result = await fetchGitHubRepositoryFiles(owner, repo, branch || 'main', subpath || '');
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'GitHub repository import failed');
  }
});

app.post('/api/app-builder/import/url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Project URL is required' });
      return;
    }
    const result = await inspectPublicProjectUrl(url);
    if (result.isSourceUnavailable) {
      res.status(422).json({
        error: result.message || "Source code isn't accessible from this URL. Import the project's GitHub repository, ZIP, or exported source files instead.",
        isSourceUnavailable: true,
      });
      return;
    }
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'URL source inspection failed');
  }
});

app.post('/api/app-builder/import/builder', (req: Request, res: Response) => {
  try {
    const { builderType, projectName } = req.body;
    const files = fetchBuilderTemplate(builderType || 'react-vite', projectName || 'Builder Project');
    res.json({ files });
  } catch (err) {
    sendSafeError(res, err, 'Builder template import failed');
  }
});

app.post('/api/app-builder/repair', async (req: Request, res: Response) => {
  try {
    const { files, errors, description } = req.body;
    if (!files || typeof files !== 'object') {
      res.status(400).json({ error: 'Project files are required for repair' });
      return;
    }
    const result = await repairApplicationWithAi(files, errors || 'General syntax and runtime repair', description);
    res.json(result);
  } catch (err) {
    sendSafeError(res, err, 'AI repair failed');
  }
});

// v1 capability-protected aliases
app.post('/v1/app-builder/create', requireCapability(Capability.APP_BUILDER), async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }
    const job = await createAppBuilderJob(prompt);
    res.json(job);
  } catch (err) {
    sendSafeError(res, err, 'Failed to generate app');
  }
});

app.post('/v1/app-builder/refine', requireCapability(Capability.APP_BUILDER), async (req: Request, res: Response) => {
  try {
    const { id, instruction } = req.body;
    if (!id || !instruction) {
      res.status(400).json({ error: 'Job ID and instruction are required' });
      return;
    }
    const updatedJob = await refineAppBuilderJob(id, instruction);
    res.json(updatedJob);
  } catch (err) {
    sendSafeError(res, err, 'Failed to refine app');
  }
});

// -------------------------------------------------------------
// 12a. HONK Real Device Agent & Operating System Control API
// -------------------------------------------------------------
app.post('/api/device/action', handleExecuteDeviceActionRequest);
app.post('/api/device/request', handleDeviceAgentRequest);
app.get('/api/device/status', handleGetDeviceStatusRequest);
app.get('/api/device/ping', handleTestConnectionRequest);
app.post('/api/device/connect', handleDeviceConnectRequest);
app.post('/api/device/disconnect', handleDeviceDisconnectRequest);
app.post('/api/device/test-connection', handleTestConnectionRequest);
app.post('/api/device/stop', handleEmergencyStopRequest);
app.get('/api/device/permissions', handleGetPermissionsRequest);
app.post('/api/device/verify', handleVerifyStateRequest);

// -------------------------------------------------------------
// 12. General-Purpose AI Agent Architecture API Routes
// -------------------------------------------------------------
app.post('/api/agent/stream', async (req: Request, res: Response) => {
  const { prompt, messages, isHeavyTask, userId, projectId, confirmedActions } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'User prompt is required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const orchestrator = AgentOrchestrator.getInstance();
  await orchestrator.executeAgentStream(
    {
      userPrompt: prompt,
      messages: Array.isArray(messages) ? messages : [],
      isHeavyTask: Boolean(isHeavyTask),
      userId: userId || 'guest_user',
      projectId,
      confirmedActions: Array.isArray(confirmedActions) ? confirmedActions : [],
    },
    (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  );

  res.write('data: [DONE]\n\n');
  res.end();
});

app.get('/api/agent/tools', (_req: Request, res: Response) => {
  const tools = ToolManager.getInstance().getAvailableTools().map((t) => ({
    name: t.name,
    displayName: t.displayName,
    description: t.description,
    category: t.category,
    parameters: t.parameters,
    isConsequential: Boolean(t.isConsequential),
  }));
  res.json({ tools });
});

app.get('/api/agent/memory', (req: Request, res: Response) => {
  const userId = String(req.query.userId || 'guest_user');
  const layer = req.query.layer as any;
  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
  const memories = MemoryManager.getInstance().getMemories(userId, layer, projectId);
  const preferences = MemoryManager.getInstance().getPreferences(userId);
  res.json({ memories, preferences });
});

app.post('/api/agent/memory', (req: Request, res: Response) => {
  const { userId, entry } = req.body;
  if (!userId || !entry || !entry.key || !entry.value) {
    res.status(400).json({ error: 'userId and entry (key, value, type, layer) are required' });
    return;
  }
  try {
    const saved = MemoryManager.getInstance().setMemory(userId, entry);
    res.json({ memory: saved });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to save memory' });
  }
});

app.post('/api/agent/memory/preferences', (req: Request, res: Response) => {
  const { userId, preferences } = req.body;
  if (!userId || !preferences) {
    res.status(400).json({ error: 'userId and preferences object are required' });
    return;
  }
  const updated = MemoryManager.getInstance().updatePreferences(userId, preferences);
  res.json({ preferences: updated });
});

app.delete('/api/agent/memory/:id', (req: Request, res: Response) => {
  const userId = String(req.query.userId || req.body.userId || 'guest_user');
  const { id } = req.params;
  const deleted = MemoryManager.getInstance().deleteMemory(userId, id);
  res.json({ success: deleted });
});

app.delete('/api/agent/memory', (req: Request, res: Response) => {
  const userId = String(req.query.userId || req.body.userId || 'guest_user');
  MemoryManager.getInstance().clearAllMemories(userId);
  res.json({ success: true, message: 'All memories cleared for user' });
});

app.post('/api/agent/benchmark', async (_req: Request, res: Response) => {
  try {
    const report = await AgentBenchmark.getInstance().runBenchmarkSuite();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Benchmark execution failed' });
  }
});

// -------------------------------------------------------------
// 13. DEVELOPER-ONLY SELF-IMPROVEMENT SUBSYSTEM (STRICT RBAC)
// -------------------------------------------------------------

// Developer Authentication (Issue signed session)
app.post('/api/developer/auth/login', (req: Request, res: Response) => {
  const { email, secretKey } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const validSecret = process.env.HONK_DEVELOPER_SECRET || 'zyron_dev_2026';

  const isZyronEmail = cleanEmail === '7.zyron@gmail.com' || cleanEmail.includes('zyron');
  const isSecretMatch = secretKey && secretKey === validSecret;

  if (!isZyronEmail && !isSecretMatch) {
    res.status(403).json({
      error: 'Access Denied: Only the authorized developer account (Zyron) can access the self-improvement engine.',
      code: 'ERR_UNAUTHORIZED_DEVELOPER',
    });
    return;
  }

  const rbac = RBACManager.getInstance();
  const session = rbac.createDeveloperSession('7.zyron@gmail.com', 'Zyron');
  if (!session) {
    res.status(403).json({ error: 'Failed to create developer session' });
    return;
  }

  res.json({
    success: true,
    token: session.token,
    session,
  });
});

// Verify active developer session
app.get('/api/developer/auth/verify', requireDeveloperAuth, (req: Request, res: Response) => {
  res.json({
    authenticated: true,
    session: (req as any).developerSession,
  });
});

// Revoke developer session
app.post('/api/developer/auth/logout', requireDeveloperAuth, (req: Request, res: Response) => {
  const token = (req as any).developerSession?.token;
  if (token) {
    RBACManager.getInstance().revokeDeveloperSession(token);
  }
  res.json({ success: true, message: 'Developer session revoked' });
});

// Engineering Telemetry & System Health
app.get('/api/developer/telemetry', requireDeveloperAuth, (_req: Request, res: Response) => {
  const telemetry = SelfImprovementEngine.getInstance().getSystemTelemetry();
  res.json(telemetry);
});

// System Versions History & Rollback Controls
app.get('/api/developer/versions', requireDeveloperAuth, (_req: Request, res: Response) => {
  const versions = VersionManager.getInstance().getAllVersions();
  res.json(versions);
});

// Deploy verified version to production
app.post('/api/developer/versions/deploy', requireDeveloperAuth, (req: Request, res: Response) => {
  const { versionId } = req.body;
  if (!versionId) {
    res.status(400).json({ error: 'versionId is required' });
    return;
  }
  const result = VersionManager.getInstance().deployVersion(versionId);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json(result);
});

// Rollback production to prior verified version
app.post('/api/developer/versions/rollback', requireDeveloperAuth, (req: Request, res: Response) => {
  const { targetVersionId } = req.body;
  const result = VersionManager.getInstance().rollbackVersion(targetVersionId);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json(result);
});

// Deployment Approval Controls (AUTO-SAFE, REVIEW, MANUAL)
app.get('/api/developer/config', requireDeveloperAuth, (_req: Request, res: Response) => {
  const config = VersionManager.getInstance().getConfig();
  res.json(config);
});

app.put('/api/developer/config', requireDeveloperAuth, (req: Request, res: Response) => {
  const { approvalMode, autoDeployThreshold } = req.body;
  const updated = VersionManager.getInstance().updateConfig({
    ...(approvalMode ? { approvalMode } : {}),
    ...(autoDeployThreshold ? { autoDeployThreshold } : {}),
  });
  res.json(updated);
});

// Weakness Detection & Failure Analysis
app.get('/api/developer/weaknesses', requireDeveloperAuth, (_req: Request, res: Response) => {
  const weaknesses = SelfImprovementEngine.getInstance().getWeaknesses();
  res.json(weaknesses);
});

app.post('/api/developer/weaknesses/resolve', requireDeveloperAuth, (req: Request, res: Response) => {
  const { id } = req.body;
  if (!id) {
    res.status(400).json({ error: 'Weakness id required' });
    return;
  }
  const resolved = SelfImprovementEngine.getInstance().resolveWeakness(id);
  res.json({ success: resolved });
});

// Experiment Manager & Sandbox Execution
app.get('/api/developer/experiments', requireDeveloperAuth, (_req: Request, res: Response) => {
  const experiments = ExperimentManager.getInstance().getAllExperiments();
  res.json(experiments);
});

app.post('/api/developer/experiments/create', requireDeveloperAuth, (req: Request, res: Response) => {
  const { title, hypothesis, targetArea, candidateConfig } = req.body;
  if (!title || !hypothesis || !targetArea) {
    res.status(400).json({ error: 'Title, hypothesis, and targetArea are required' });
    return;
  }
  const exp = ExperimentManager.getInstance().createExperiment({
    title,
    hypothesis,
    targetArea,
    candidateConfig: candidateConfig || {},
  });
  res.json({ success: true, experiment: exp });
});

app.post('/api/developer/experiments/:id/run', requireDeveloperAuth, async (req: Request, res: Response) => {
  try {
    const exp = await ExperimentManager.getInstance().runExperiment(req.params.id);
    res.json({ success: true, experiment: exp });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Experiment run failed' });
  }
});

app.post('/api/developer/experiments/:id/promote', requireDeveloperAuth, (req: Request, res: Response) => {
  const { versionTag } = req.body;
  const result = ExperimentManager.getInstance().promoteToVersion(req.params.id, versionTag);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json(result);
});

// Evaluation Harness & Regression Suite Runner
app.post('/api/developer/evaluations/run', requireDeveloperAuth, async (_req: Request, res: Response) => {
  try {
    const suite = await EvaluationHarness.getInstance().runFullSuite();
    res.json(suite);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Evaluation suite failed' });
  }
});

// Practice Lab Automated Continuous Cycle
app.post('/api/developer/lab/cycle', requireDeveloperAuth, async (_req: Request, res: Response) => {
  try {
    const result = await SelfImprovementEngine.getInstance().runPracticeLabCycle();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Practice lab cycle failed' });
  }
});

// Internal Audit Logs & Security Telemetry
app.get('/api/developer/logs', requireDeveloperAuth, (req: Request, res: Response) => {
  const limit = Math.min(200, Number(req.query.limit) || 100);
  const logs = RBACManager.getInstance().getAuditLogs(limit);
  res.json(logs);
});

// Anonymous Product Feedback Queue (Strictly Sanitized, Zero User PII)
app.get('/api/developer/feedback', requireDeveloperAuth, (_req: Request, res: Response) => {
  const feedback = SelfImprovementEngine.getInstance().getAnonymousFeedback();
  res.json(feedback);
});

// Catch-all RBAC middleware for internal / admin endpoints
app.all(
  ['/admin/improvement/*', '/developer/*', '/internal/*', '/evaluation/*', '/experiments/*', '/deploy/*', '/rollback/*'],
  requireDeveloperAuth
);

// -------------------------------------------------------------
// Vite middleware for Dev / Static Files for Prod & /about SEO
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  let vite: any = null;

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // Dedicated SEO-enhanced handler for /about
  app.get('/about', async (req: Request, res: Response, next) => {
    try {
      const indexPath = !isProd
        ? path.join(process.cwd(), 'index.html')
        : path.join(process.cwd(), 'dist', 'index.html');

      if (!fs.existsSync(indexPath)) {
        return next();
      }

      let html = fs.readFileSync(indexPath, 'utf-8');

      // Inject exact /about SEO tags
      html = html
        .replace(/<title>.*?<\/title>/, '<title>About Honk AI | Official</title>')
        .replace(
          /<meta name="description" content=".*?" \/>/,
          '<meta name="description" content="Learn about Honk AI, its features, and its creator Zyron." />'
        )
        .replace(
          /<link rel="canonical" href=".*?" \/>/,
          '<link rel="canonical" href="https://honk-ai-harshil.ai.studio/about" />'
        )
        .replace(
          /<meta property="og:title" content=".*?" \/>/,
          '<meta property="og:title" content="About Honk AI | Official" />'
        )
        .replace(
          /<meta property="og:description" content=".*?" \/>/,
          '<meta property="og:description" content="Learn about Honk AI, its features, and its creator Zyron." />'
        )
        .replace(
          /<meta property="og:url" content=".*?" \/>/,
          '<meta property="og:url" content="https://honk-ai-harshil.ai.studio/about" />'
        )
        .replace(
          /<meta name="twitter:title" content=".*?" \/>/,
          '<meta name="twitter:title" content="About Honk AI | Official" />'
        )
        .replace(
          /<meta name="twitter:description" content=".*?" \/>/,
          '<meta name="twitter:description" content="Learn about Honk AI, its features, and its creator Zyron." />'
        )
        .replace(
          /<meta name="twitter:url" content=".*?" \/>/,
          '<meta name="twitter:url" content="https://honk-ai-harshil.ai.studio/about" />'
        );

      if (vite) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } catch (err) {
      next(err);
    }
  });

  // Dedicated OpenSearch and Search Engine Results Page for /search and /honk-search
  app.get(['/search', '/honk-search'], async (req: Request, res: Response, next) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const indexPath = !isProd
        ? path.join(process.cwd(), 'index.html')
        : path.join(process.cwd(), 'dist', 'index.html');

      if (!fs.existsSync(indexPath)) {
        return next();
      }

      let html = fs.readFileSync(indexPath, 'utf-8');

      const escapeHtml = (str: string) =>
        str
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

      const rawTitle = q
        ? `${q} - Honk Search | 1 HONK = The Internet Searched For You`
        : 'Honk Search | The Internet Searched For You';
      const rawDesc = q
        ? `Search results for ${q} on Honk AI. 1 HONK synthesizes verified web sources into one definitive answer.`
        : 'Honk Search searches the entire web with one HONK, finding verified sources and synthesizing definitive answers.';
      const pageUrl = q
        ? `https://honk-ai-harshil.ai.studio/search?q=${encodeURIComponent(q)}`
        : 'https://honk-ai-harshil.ai.studio/search';

      const pageTitle = escapeHtml(rawTitle);
      const pageDesc = escapeHtml(rawDesc);
      const escapedUrl = escapeHtml(pageUrl);

      html = html
        .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
        .replace(
          /<meta name="description" content=".*?" \/>/,
          `<meta name="description" content="${pageDesc}" />`
        )
        .replace(
          /<link rel="canonical" href=".*?" \/>/,
          `<link rel="canonical" href="${escapedUrl}" />`
        )
        .replace(
          /<meta property="og:title" content=".*?" \/>/,
          `<meta property="og:title" content="${pageTitle}" />`
        )
        .replace(
          /<meta property="og:description" content=".*?" \/>/,
          `<meta property="og:description" content="${pageDesc}" />`
        )
        .replace(
          /<meta property="og:url" content=".*?" \/>/,
          `<meta property="og:url" content="${escapedUrl}" />`
        )
        .replace(
          /<meta name="twitter:title" content=".*?" \/>/,
          `<meta name="twitter:title" content="${pageTitle}" />`
        )
        .replace(
          /<meta name="twitter:description" content=".*?" \/>/,
          `<meta name="twitter:description" content="${pageDesc}" />`
        )
        .replace(
          /<meta name="twitter:url" content=".*?" \/>/,
          `<meta name="twitter:url" content="${escapedUrl}" />`
        );

      if (vite) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } catch (err) {
      next(err);
    }
  });

  // Dedicated route for /share/:shareId - strictly noindex & nofollow for search engines
  app.get(['/share/:shareId', '/share*'], async (req: Request, res: Response, next) => {
    try {
      res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      const indexPath = !isProd
        ? path.join(process.cwd(), 'index.html')
        : path.join(process.cwd(), 'dist', 'index.html');

      if (!fs.existsSync(indexPath)) {
        return next();
      }

      let html = fs.readFileSync(indexPath, 'utf-8');

      // Inject noindex robots directive
      if (html.includes('<meta name="robots"')) {
        html = html.replace(
          /<meta name="robots" content=".*?" \/>/,
          '<meta name="robots" content="noindex, nofollow, noarchive" />'
        );
      } else {
        html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow, noarchive" />\n</head>');
      }

      html = html
        .replace(/<title>.*?<\/title>/, '<title>Shared Chat | Honk AI</title>')
        .replace(
          /<meta name="description" content=".*?" \/>/,
          '<meta name="description" content="Read-only shared conversation on Honk AI." />'
        );

      if (vite) {
        html = await vite.transformIndexHtml(req.originalUrl, html);
      }

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
    } catch (err) {
      next(err);
    }
  });

  if (vite) {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Honk AI Platform Server running on http://0.0.0.0:${PORT}`);
    // Pre-warm AI provider client on startup for instant zero-cold-start streaming
    try {
      ProviderManager.getInstance();
    } catch (e) {
      console.warn('[HONK] Pre-warm provider initialization deferred:', e);
    }
  });

  // Keep HTTP connections warm and prevent socket teardown
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

startServer();
