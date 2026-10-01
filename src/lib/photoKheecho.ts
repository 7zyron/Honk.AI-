import { PhotoKheechoResult } from '../types';
import { buildApiUrl } from '../config/api';

/**
 * Compresses an image file or data URI on the client before uploading to reduce latency.
 * Retains high visual resolution (max 1600px) and quality for precise OCR & diagrams.
 */
export async function compressImageForVision(
  input: File | Blob | string,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    let src = '';
    let origSize = 0;

    if (typeof input === 'string') {
      src = input;
      origSize = Math.round((input.length * 3) / 4);
    } else {
      origSize = input.size;
      src = URL.createObjectURL(input);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (typeof input !== 'string') {
        URL.revokeObjectURL(src);
      }

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        // Fallback to original
        resolve({
          dataUrl: typeof input === 'string' ? input : src,
          originalSize: origSize,
          compressedSize: origSize,
        });
        return;
      }

      // Smooth bicubic downsampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const approxCompressedSize = Math.round((compressedDataUrl.length * 3) / 4);

      resolve({
        dataUrl: compressedDataUrl,
        originalSize: origSize,
        compressedSize: approxCompressedSize,
      });
    };

    img.onerror = (err) => {
      if (typeof input !== 'string') {
        URL.revokeObjectURL(src);
      }
      reject(new Error('Failed to load image for processing: ' + err));
    };

    img.src = src;
  });
}

/**
 * Call HONK Photo Kheecho analysis endpoint
 */
export async function analyzePhoto(params: {
  image: string;
  question?: string;
  language?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<PhotoKheechoResult> {
  const res = await fetch(buildApiUrl('/api/photo-kheecho/analyze'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: params.image,
      question: params.question,
      language: params.language || 'auto',
      history: params.history || [],
    }),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to analyze photo';
    try {
      const data = await res.json();
      if (data.error || data.message) {
        errorMsg = data.error || data.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

/**
 * Follow-up question on the SAME image context without re-uploading
 */
export async function followUpPhoto(params: {
  image: string;
  question: string;
  language?: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ reply: string; suggestedQuestions: string[] }> {
  const res = await fetch(buildApiUrl('/api/photo-kheecho/follow-up'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: params.image,
      question: params.question,
      language: params.language || 'auto',
      history: params.history,
    }),
  });

  if (!res.ok) {
    let errorMsg = 'Failed to answer follow-up';
    try {
      const data = await res.json();
      if (data.error || data.message) {
        errorMsg = data.error || data.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

/**
 * Preset sample visual items for instant test-drive
 */
export interface PhotoSamplePreset {
  id: string;
  title: string;
  subtitle: string;
  categoryHint: string;
  icon: string;
  imageUrl: string;
}

export const PHOTO_SAMPLE_PRESETS: PhotoSamplePreset[] = [
  {
    id: 'math-calc',
    title: 'Calculus & Physics Problem',
    subtitle: 'Find definite integral ∫(3x² + 2x) dx from 0 to 4',
    categoryHint: 'Homework & Math',
    icon: '📐',
    // SVG data uri rendered cleanly
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="%2318181b"><rect width="800" height="500" rx="16" fill="%2318181b"/><rect x="40" y="40" width="720" height="420" rx="12" fill="%2327272a" stroke="%233f3f46" stroke-width="2"/><text x="80" y="100" fill="%23a1a1aa" font-family="sans-serif" font-size="18" font-weight="bold">QUESTION 4 (CALCULUS &amp; KINEMATICS)</text><text x="80" y="150" fill="%23f4f4f5" font-family="serif" font-size="28" font-weight="bold">Evaluate the definite integral:</text><text x="120" y="230" fill="%2338bdf8" font-family="serif" font-size="42" font-weight="bold">∫₀⁴ (3x² + 2x - 5) dx</text><text x="80" y="300" fill="%23d4d4d8" font-family="sans-serif" font-size="20">1) Compute the antiderivative F(x).</text><text x="80" y="340" fill="%23d4d4d8" font-family="sans-serif" font-size="20">2) Apply the Fundamental Theorem of Calculus: F(4) - F(0).</text><text x="80" y="380" fill="%23d4d4d8" font-family="sans-serif" font-size="20">3) State the total displacement in meters if this represents velocity.</text><rect x="80" y="410" width="180" height="30" rx="6" fill="%230284c7"/><text x="170" y="430" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">EXAM PROBLEM #4</text></svg>',
  },
  {
    id: 'code-error',
    title: 'TypeScript / React Bug',
    subtitle: 'TypeError: Cannot read properties of undefined (reading "map")',
    categoryHint: 'Software Bug & Screenshot',
    icon: '🐞',
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="%230f172a"><rect width="800" height="500" rx="16" fill="%230f172a"/><rect x="40" y="40" width="720" height="420" rx="12" fill="%231e293b" stroke="%23ef4444" stroke-width="2"/><circle cx="70" cy="70" r="6" fill="%23ef4444"/><circle cx="90" cy="70" r="6" fill="%23f59e0b"/><circle cx="110" cy="70" r="6" fill="%2310b981"/><text x="140" y="75" fill="%2394a3b8" font-family="monospace" font-size="14">terminal — zsh — 80x24</text><text x="70" y="130" fill="%23f87171" font-family="monospace" font-size="20" font-weight="bold">Uncaught TypeError: Cannot read properties of undefined (reading &apos;map&apos;)</text><text x="70" y="170" fill="%23cbd5e1" font-family="monospace" font-size="15">    at ProductList (src/components/ProductList.tsx:42:26)</text><text x="70" y="200" fill="%23cbd5e1" font-family="monospace" font-size="15">    at renderWithHooks (node_modules/react-dom/cjs/react-dom.development.js:15486)</text><text x="70" y="250" fill="%2338bdf8" font-family="monospace" font-size="16">// In src/components/ProductList.tsx line 42:</text><text x="70" y="280" fill="%23f1f5f9" font-family="monospace" font-size="16">&lt;div className="grid"&gt;</text><text x="90" y="310" fill="%23ef4444" font-family="monospace" font-size="16" font-weight="bold">  {data.products.map(item =&gt; &lt;ProductCard key={item.id} {...item} /&gt;)}</text><text x="70" y="340" fill="%23f1f5f9" font-family="monospace" font-size="16">&lt;/div&gt;</text><text x="70" y="390" fill="%23fbbf24" font-family="monospace" font-size="14">Note: Initial state of products is undefined before API fetch resolves.</text></svg>',
  },
  {
    id: 'receipt-expense',
    title: 'Cafe & Restaurant Receipt',
    subtitle: 'Extract items, GST/VAT, and split total amount',
    categoryHint: 'Receipt & Expense OCR',
    icon: '🧾',
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="%231c1917"><rect width="800" height="500" rx="16" fill="%231c1917"/><rect x="220" y="30" width="360" height="440" rx="8" fill="%23fdfbf7" stroke="%23d6d3d1" stroke-width="1.5"/><text x="400" y="70" fill="%23292524" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">HONK BISTRO &amp; CAFE</text><text x="400" y="95" fill="%2357534e" font-family="monospace" font-size="12" text-anchor="middle">128 MG Road, Bengaluru - 560001</text><text x="400" y="115" fill="%2378716c" font-family="monospace" font-size="11" text-anchor="middle">Date: 21-Sep-2026 | Tax Invoice #84920</text><line x1="240" y1="130" x2="560" y2="130" stroke="%23d6d3d1" stroke-dasharray="4 4"/><text x="250" y="160" fill="%231c1917" font-family="monospace" font-size="13">2x Flat White Coffee</text><text x="550" y="160" fill="%231c1917" font-family="monospace" font-size="13" text-anchor="end">₹ 440.00</text><text x="250" y="190" fill="%231c1917" font-family="monospace" font-size="13">1x Avocado Sourdough Toast</text><text x="550" y="190" fill="%231c1917" font-family="monospace" font-size="13" text-anchor="end">₹ 380.00</text><text x="250" y="220" fill="%231c1917" font-family="monospace" font-size="13">1x Blueberry Cheesecake Slice</text><text x="550" y="220" fill="%231c1917" font-family="monospace" font-size="13" text-anchor="end">₹ 260.00</text><line x1="240" y1="245" x2="560" y2="245" stroke="%23d6d3d1"/><text x="250" y="270" fill="%2357534e" font-family="monospace" font-size="12">Subtotal:</text><text x="550" y="270" fill="%2357534e" font-family="monospace" font-size="12" text-anchor="end">₹ 1,080.00</text><text x="250" y="295" fill="%2357534e" font-family="monospace" font-size="12">CGST (2.5%):</text><text x="550" y="295" fill="%2357534e" font-family="monospace" font-size="12" text-anchor="end">₹ 27.00</text><text x="250" y="320" fill="%2357534e" font-family="monospace" font-size="12">SGST (2.5%):</text><text x="550" y="320" fill="%2357534e" font-family="monospace" font-size="12" text-anchor="end">₹ 27.00</text><line x1="240" y1="340" x2="560" y2="340" stroke="%231c1917" stroke-width="2"/><text x="250" y="370" fill="%231c1917" font-family="monospace" font-size="16" font-weight="bold">TOTAL AMOUNT:</text><text x="550" y="370" fill="%231c1917" font-family="monospace" font-size="17" font-weight="bold" text-anchor="end">₹ 1,134.00</text><text x="400" y="420" fill="%23059669" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">PAID VIA UPI — THANK YOU!</text></svg>',
  },
  {
    id: 'chart-quarterly',
    title: 'Quarterly Revenue & Margin Chart',
    subtitle: 'Analyze Q1-Q4 trends, revenue growth and margin compression',
    categoryHint: 'Charts & Tables',
    icon: '📊',
    imageUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" fill="%2309090b"><rect width="800" height="500" rx="16" fill="%2309090b"/><rect x="40" y="40" width="720" height="420" rx="12" fill="%2318181b" stroke="%2327272a" stroke-width="2"/><text x="80" y="90" fill="%23fafafa" font-family="sans-serif" font-size="22" font-weight="bold">HONK SaaS ARR Growth (FY2025-26)</text><text x="80" y="115" fill="%23a1a1aa" font-family="sans-serif" font-size="14">Revenue (Bar in $M) vs Operating Margin (Line in %)</text><line x1="120" y1="380" x2="680" y2="380" stroke="%233f3f46" stroke-width="2"/><line x1="120" y1="160" x2="120" y2="380" stroke="%233f3f46" stroke-width="2"/><rect x="160" y="280" width="70" height="100" fill="%233b82f6" rx="4"/><text x="195" y="270" fill="%2393c5fd" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="bold">$12.4M</text><text x="195" y="405" fill="%23d4d4d8" font-family="sans-serif" font-size="14" text-anchor="middle">Q1</text><rect x="290" y="240" width="70" height="140" fill="%233b82f6" rx="4"/><text x="325" y="230" fill="%2393c5fd" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="bold">$16.8M</text><text x="325" y="405" fill="%23d4d4d8" font-family="sans-serif" font-size="14" text-anchor="middle">Q2</text><rect x="420" y="200" width="70" height="180" fill="%233b82f6" rx="4"/><text x="455" y="190" fill="%2393c5fd" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="bold">$22.1M</text><text x="455" y="405" fill="%23d4d4d8" font-family="sans-serif" font-size="14" text-anchor="middle">Q3</text><rect x="550" y="140" width="70" height="240" fill="%2310b981" rx="4"/><text x="585" y="130" fill="%236ee7b7" font-family="sans-serif" font-size="13" text-anchor="middle" font-weight="bold">$29.5M</text><text x="585" y="405" fill="%23d4d4d8" font-family="sans-serif" font-size="14" text-anchor="middle">Q4</text></svg>',
  },
];
