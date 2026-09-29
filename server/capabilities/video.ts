import { VideoJob } from '../types';

// In-memory video jobs store
const videoJobs = new Map<string, VideoJob>();

/**
 * Creates a new asynchronous video job. Returns immediately with queued status.
 */
export function createVideoJob(prompt: string, options: { aspectRatio?: string; durationSeconds?: number } = {}): VideoJob {
  const id = `vid_${Math.random().toString(36).substring(2, 11)}`;
  const job: VideoJob = {
    id,
    prompt,
    status: 'queued',
    progress: 5,
    aspectRatio: options.aspectRatio || '16:9',
    durationSeconds: options.durationSeconds || 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  videoJobs.set(id, job);

  // Trigger non-blocking asynchronous processing
  startBackgroundVideoProcessing(id);

  return job;
}

export function getVideoJob(id: string): VideoJob | null {
  return videoJobs.get(id) || null;
}

export function cancelVideoJob(id: string): boolean {
  const job = videoJobs.get(id);
  if (!job) return false;
  if (job.status === 'completed' || job.status === 'failed') return false;

  job.status = 'cancelled';
  job.updatedAt = Date.now();
  return true;
}

/**
 * Asynchronous job runner that updates progress and simulates/completes video generation
 * without blocking incoming HTTP calls.
 */
function startBackgroundVideoProcessing(jobId: string) {
  setTimeout(() => {
    const job = videoJobs.get(jobId);
    if (!job || job.status === 'cancelled') return;

    job.status = 'processing';
    job.progress = 25;
    job.updatedAt = Date.now();

    setTimeout(() => {
      const job2 = videoJobs.get(jobId);
      if (!job2 || job2.status === 'cancelled') return;

      job2.progress = 65;
      job2.updatedAt = Date.now();

      setTimeout(() => {
        const job3 = videoJobs.get(jobId);
        if (!job3 || job3.status === 'cancelled') return;

        job3.status = 'completed';
        job3.progress = 100;
        // High quality placeholder video preview asset
        job3.videoUrl = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
        job3.updatedAt = Date.now();
      }, 4000);
    }, 4000);
  }, 1000);
}
