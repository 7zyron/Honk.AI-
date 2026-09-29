/**
 * HONK Universal Attachment & Multimodal File Processor
 * Handles end-to-end receipt, MIME detection, content extraction, and Gemini inlineData preparation:
 * UPLOAD -> FILE RECEIVED -> FILE STORED/AVAILABLE -> FILE TYPE DETECTED -> FILE CONTENT EXTRACTED -> CONTENT SENT TO AI -> AI ANALYZES CONTENT -> AI ANSWERS USER
 * Supported formats:
 * - Images (PNG, JPEG, WebP, GIF, HEIC, BMP)
 * - Documents (PDF, TXT, DOCX, CSV, TSV, Markdown, JSON, XML, HTML, Code)
 * - Audio (MP3, WAV, OGG, M4A, WEBM)
 */

import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

export interface ProcessedAttachment {
  id: string;
  name: string;
  size: number;
  originalMimeType: string;
  detectedMimeType: string;
  category: 'image' | 'pdf' | 'document' | 'text' | 'audio' | 'video' | 'unknown';
  inlineData?: {
    mimeType: string;
    data: string; // clean base64 data
  };
  extractedText?: string;
  contentAvailable: boolean;
  diagnostics: {
    attachment_received: boolean;
    attachment_id: string;
    mime_type: string;
    processing_started: boolean;
    processing_completed: boolean;
    content_available: boolean;
    ai_request_created: boolean;
    ai_response_received?: boolean;
    extractedChars?: number;
    error?: string;
  };
}

/**
 * Global Attachment Store & Conversation Association Engine
 */
export class AttachmentStore {
  private static instance: AttachmentStore;
  private memoryStore: Map<string, { attachment: ProcessedAttachment; dataUrl: string; conversationId?: string; uploadedAt: number }> = new Map();
  private convoAttachments: Map<string, Set<string>> = new Map();
  private storageDir: string = '/tmp/honk_attachments';

  private constructor() {
    try {
      if (!fs.existsSync(this.storageDir)) {
        fs.mkdirSync(this.storageDir, { recursive: true });
      }
    } catch {}
  }

  public static getInstance(): AttachmentStore {
    if (!AttachmentStore.instance) {
      AttachmentStore.instance = new AttachmentStore();
    }
    return AttachmentStore.instance;
  }

  public save(id: string, item: { attachment: ProcessedAttachment; dataUrl: string; conversationId?: string }): void {
    this.memoryStore.set(id, { ...item, uploadedAt: Date.now() });
    if (item.conversationId) {
      if (!this.convoAttachments.has(item.conversationId)) {
        this.convoAttachments.set(item.conversationId, new Set());
      }
      this.convoAttachments.get(item.conversationId)!.add(id);
    }

    // Persist metadata to disk (excluding heavy base64 to preserve disk)
    try {
      const metaPath = path.join(this.storageDir, `${id}.meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify({
        id,
        name: item.attachment.name,
        size: item.attachment.size,
        mimeType: item.attachment.detectedMimeType,
        category: item.attachment.category,
        diagnostics: item.attachment.diagnostics,
        conversationId: item.conversationId,
        uploadedAt: Date.now(),
      }));
    } catch {}
  }

  public get(id: string) {
    return this.memoryStore.get(id);
  }

  public getForConversation(conversationId: string): ProcessedAttachment[] {
    const ids = this.convoAttachments.get(conversationId);
    if (!ids) return [];
    const results: ProcessedAttachment[] = [];
    for (const id of ids) {
      const item = this.memoryStore.get(id);
      if (item) results.push(item.attachment);
    }
    return results;
  }

  public recordAiResponse(id: string): void {
    const item = this.memoryStore.get(id);
    if (item) {
      item.attachment.diagnostics.ai_response_received = true;
      console.log('[HONK ATTACHMENT DIAGNOSTIC]', {
        attachment_id: id,
        attachment_received: item.attachment.diagnostics.attachment_received,
        mime_type: item.attachment.diagnostics.mime_type,
        processing_completed: item.attachment.diagnostics.processing_completed,
        content_available: item.attachment.diagnostics.content_available,
        ai_request_created: item.attachment.diagnostics.ai_request_created,
        ai_response_received: true,
      });
    }
  }
}

/**
 * Detects accurate MIME type from filename extension, dataUrl prefix, and magic bytes
 */
export function detectMimeType(filename: string, dataUrlOrBase64: string, fallbackMime?: string): string {
  // 1. Data URL prefix check
  if (dataUrlOrBase64.startsWith('data:')) {
    const match = dataUrlOrBase64.match(/^data:([^;]+);base64,/);
    if (match && match[1] && match[1] !== 'application/octet-stream') {
      return match[1].toLowerCase().trim();
    }
  }

  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';

  // 2. Extension check
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    case 'txt':
    case 'log':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'tsv':
      return 'text/tab-separated-values';
    case 'json':
      return 'application/json';
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc':
      return 'application/msword';
    case 'html':
    case 'htm':
      return 'text/html';
    case 'xml':
      return 'application/xml';
    case 'js':
      return 'application/javascript';
    case 'ts':
      return 'text/typescript';
    case 'py':
      return 'text/x-python';
    case 'mp3':
      return 'audio/mp3';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/m4a';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
  }

  // 3. Magic bytes inspection on base64
  const rawBase64 = dataUrlOrBase64.replace(/^data:[^;]+;base64,/, '').slice(0, 32);
  try {
    const buffer = Buffer.from(rawBase64, 'base64');
    if (buffer.length >= 4) {
      // PDF: %PDF
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return 'application/pdf';
      }
      // PNG: 89 50 4E 47
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return 'image/png';
      }
      // JPEG: FF D8 FF
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
      }
      // GIF: GIF8
      if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return 'image/gif';
      }
      // ZIP / DOCX: PK\x03\x04
      if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
        if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        return 'application/zip';
      }
    }
  } catch {
    // Ignore buffer inspection error
  }

  return (fallbackMime || 'application/octet-stream').toLowerCase();
}

/**
 * Extracts raw text from DOCX archive using JSZip
 */
async function extractDocxText(base64Data: string): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(base64Data, { base64: true });
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) return '';

    // Match all text nodes <w:t>...</w:t> and paragraphs <w:p>
    const paragraphs = docXml.split(/<\/w:p>/);
    const resultLines: string[] = [];

    for (const p of paragraphs) {
      const textMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        const line = textMatches
          .map((m) => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
          .join('');
        if (line.trim()) {
          resultLines.push(line);
        }
      }
    }

    return resultLines.join('\n');
  } catch (err) {
    console.warn('[HONK ATTACHMENT] Failed to extract DOCX text:', err);
    return '';
  }
}

/**
 * Extracts readable ASCII text streams from PDF buffer as supplemental context
 */
function extractBasicPdfText(base64Data: string): string {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const raw = buffer.toString('latin1');
    const textChunks: string[] = [];

    // Extract text in parentheses (text) Tj or [(text)] TJ
    const tjMatches = raw.match(/\(([^)]+)\)\s*Tj/g);
    if (tjMatches && tjMatches.length > 0) {
      for (const m of tjMatches) {
        const clean = m.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
        if (clean.length > 1) {
          textChunks.push(clean);
        }
      }
    }

    return textChunks.slice(0, 500).join(' ');
  } catch {
    return '';
  }
}

/**
 * Main attachment processor
 */
export async function processAttachment(att: {
  id?: string;
  name: string;
  size?: number;
  type?: string;
  dataUrl?: string;
  conversationId?: string;
}): Promise<ProcessedAttachment> {
  const store = AttachmentStore.getInstance();
  const attachmentId = att.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const filename = att.name || 'uploaded_file';
  let rawDataUrl = att.dataUrl || '';

  // If dataUrl not present in payload, check if stored from previous turn
  if (!rawDataUrl && att.id) {
    const cached = store.get(att.id);
    if (cached?.dataUrl) {
      rawDataUrl = cached.dataUrl;
    }
  }

  const size = att.size || (rawDataUrl ? Math.round((rawDataUrl.length * 3) / 4) : 0);

  // Diagnostics tracking
  const diagnostics: ProcessedAttachment['diagnostics'] = {
    attachment_received: true,
    attachment_id: attachmentId,
    mime_type: 'unknown',
    processing_started: true,
    processing_completed: false,
    content_available: false,
    ai_request_created: false,
  };

  if (!rawDataUrl) {
    diagnostics.error = `Attachment '${filename}' has no data payload.`;
    console.error(`[HONK ATTACHMENT ERROR] ${diagnostics.error}`);
    return {
      id: attachmentId,
      name: filename,
      size: 0,
      originalMimeType: att.type || 'unknown',
      detectedMimeType: 'unknown',
      category: 'unknown',
      contentAvailable: false,
      diagnostics,
    };
  }

  // Extract pure base64
  let base64Data = rawDataUrl;
  if (rawDataUrl.startsWith('data:')) {
    const commaIndex = rawDataUrl.indexOf(',');
    if (commaIndex !== -1) {
      base64Data = rawDataUrl.substring(commaIndex + 1);
    }
  }

  // Detect accurate MIME type
  const detectedMime = detectMimeType(filename, rawDataUrl, att.type);
  diagnostics.mime_type = detectedMime;

  let category: ProcessedAttachment['category'] = 'unknown';
  let inlineData: ProcessedAttachment['inlineData'] = undefined;
  let extractedText: string | undefined = undefined;

  try {
    if (detectedMime.startsWith('image/')) {
      category = 'image';
      inlineData = {
        mimeType: detectedMime,
        data: base64Data,
      };
      diagnostics.content_available = true;
    } else if (detectedMime === 'application/pdf') {
      category = 'pdf';
      // Gemini 3.8 Flash natively reads PDF inlineData
      inlineData = {
        mimeType: 'application/pdf',
        data: base64Data,
      };
      // Supplemental text extraction for dual visual + text comprehension
      const textSample = extractBasicPdfText(base64Data);
      if (textSample) {
        extractedText = textSample;
        diagnostics.extractedChars = textSample.length;
      }
      diagnostics.content_available = true;
    } else if (detectedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      category = 'document';
      const docxText = await extractDocxText(base64Data);
      if (docxText) {
        extractedText = docxText;
        diagnostics.extractedChars = docxText.length;
        diagnostics.content_available = true;
      } else {
        // Fallback: decode raw text
        const rawText = Buffer.from(base64Data, 'base64').toString('utf-8').replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ');
        extractedText = rawText.trim();
        diagnostics.extractedChars = extractedText.length;
        diagnostics.content_available = Boolean(extractedText);
      }
    } else if (detectedMime.startsWith('audio/')) {
      category = 'audio';
      inlineData = {
        mimeType: detectedMime,
        data: base64Data,
      };
      diagnostics.content_available = true;
    } else if (detectedMime.startsWith('video/')) {
      category = 'video';
      inlineData = {
        mimeType: detectedMime,
        data: base64Data,
      };
      diagnostics.content_available = true;
    } else {
      // Text / CSV / TSV / JSON / Markdown / Code / Unknown
      category = 'text';
      try {
        const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
        extractedText = decoded;
        diagnostics.extractedChars = decoded.length;
        diagnostics.content_available = true;
      } catch (e: any) {
        diagnostics.error = `Failed to decode text file '${filename}': ${e.message}`;
        diagnostics.content_available = false;
      }
    }

    diagnostics.processing_completed = true;

    // Log diagnostic without exposing sensitive content or keys
    console.log('[HONK ATTACHMENT DIAGNOSTIC]', {
      attachment_received: diagnostics.attachment_received,
      attachment_id: diagnostics.attachment_id,
      filename,
      mime_type: diagnostics.mime_type,
      category,
      processing_completed: diagnostics.processing_completed,
      content_available: diagnostics.content_available,
      extracted_chars: diagnostics.extractedChars || 0,
      has_inline_data: Boolean(inlineData),
    });

    const result: ProcessedAttachment = {
      id: attachmentId,
      name: filename,
      size,
      originalMimeType: att.type || 'unknown',
      detectedMimeType: detectedMime,
      category,
      inlineData,
      extractedText,
      contentAvailable: diagnostics.content_available,
      diagnostics,
    };

    store.save(attachmentId, {
      attachment: result,
      dataUrl: rawDataUrl,
      conversationId: att.conversationId,
    });

    return result;
  } catch (err: any) {
    diagnostics.error = `Error processing attachment '${filename}': ${err.message}`;
    diagnostics.processing_completed = false;
    diagnostics.content_available = false;
    console.error('[HONK ATTACHMENT ERROR]', diagnostics.error);

    return {
      id: attachmentId,
      name: filename,
      size,
      originalMimeType: att.type || 'unknown',
      detectedMimeType: detectedMime,
      category: 'unknown',
      contentAvailable: false,
      diagnostics,
    };
  }
}
