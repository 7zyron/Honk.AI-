import app from '../server';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[HONK VERCEL FUNCTION CRASH CAUGHT]:', err?.name, err?.message, err?.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err?.message || 'Server execution failed',
      });
    }
  }
}
