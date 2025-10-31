const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');
const orchestrator = require('../orchestrator');
const logger = require('../utils/logger');

const connectionString = process.env.REDIS_URL;

let queue = null;
let queueEvents = null;
let worker = null;

function isQueueEnabled() {
  return !!connectionString;
}

function getConnection() {
  return new IORedis(connectionString, { maxRetriesPerRequest: null });
}

async function initQueue() {
  if (!isQueueEnabled()) return { queue: null };
  try {
    const connection = getConnection();
    queue = new Queue('issue-prescription', { connection });
    queueEvents = new QueueEvents('issue-prescription', { connection });

    worker = new Worker(
      'issue-prescription',
      async (job) => {
        const { formData, geo } = job.data;
        const result = await orchestrator.issuePrescription({ formData, geo });
        return result;
      },
      { connection, concurrency: 2 }
    );

    worker.on('failed', (job, err) => {
      logger.error('queue:issue-prescription failed', { id: job.id, err: err.message });
    });

    logger.info('BullMQ issue-prescription queue initialized');
    return { queue, queueEvents, worker };
  } catch (e) {
    logger.warn('BullMQ init failed, falling back to in-process orchestrator', { error: e.message });
    queue = null;
    return { queue: null };
  }
}

async function enqueueIssue(formData, geo) {
  if (!queue) return null;
  const job = await queue.add('issue', { formData, geo }, { attempts: 3, backoff: { type: 'exponential', delay: 500 } });
  return job;
}

async function waitForJob(job) {
  if (!job || !queueEvents) return null;
  return job.waitUntilFinished(queueEvents);
}

module.exports = { initQueue, enqueueIssue, waitForJob, isQueueEnabled };
