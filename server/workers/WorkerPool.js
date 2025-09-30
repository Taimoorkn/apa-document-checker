// server/workers/WorkerPool.js - Worker Thread Pool Manager for concurrent document processing
const { Worker } = require('worker_threads');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * WorkerPool manages a pool of worker threads for concurrent document processing
 * Ensures multiple users can process documents simultaneously without blocking
 */
class WorkerPool extends EventEmitter {
  constructor(poolSize = 4, workerScript) {
    super();

    this.poolSize = poolSize;
    this.workerScript = workerScript;
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers = new Map(); // worker -> jobId
    this.jobQueue = [];
    this.activeJobs = new Map(); // jobId -> { resolve, reject, timeout, jobData }
    this.isShuttingDown = false;

    // Statistics
    this.stats = {
      totalJobsProcessed: 0,
      totalJobsFailed: 0,
      currentQueueSize: 0,
      peakQueueSize: 0
    };

    // Initialize worker pool
    this._initializeWorkers();

    console.log(`✅ WorkerPool initialized with ${poolSize} workers`);
  }

  /**
   * Initialize all worker threads
   */
  _initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      this._createWorker(i);
    }
  }

  /**
   * Create a single worker thread
   */
  _createWorker(workerId) {
    const worker = new Worker(this.workerScript);
    worker.workerId = workerId;
    worker.isAvailable = true;
    worker.currentJobId = null;

    // Handle messages from worker
    worker.on('message', (message) => {
      this._handleWorkerMessage(worker, message);
    });

    // Handle worker errors
    worker.on('error', (error) => {
      this._handleWorkerError(worker, error);
    });

    // Handle worker exit
    worker.on('exit', (code) => {
      this._handleWorkerExit(worker, code);
    });

    this.workers.push(worker);
    this.availableWorkers.push(worker);

    console.log(`Worker ${workerId} created and ready`);
  }

  /**
   * Execute a job on an available worker
   * Returns a promise that resolves with the job result
   */
  executeJob(jobData, timeout = 60000) {
    if (this.isShuttingDown) {
      return Promise.reject(new Error('WorkerPool is shutting down'));
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    jobData.jobId = jobId;

    console.log(`📥 Job ${jobId} received (type: ${jobData.type})`);

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this._handleJobTimeout(jobId);
      }, timeout);

      // Store job metadata
      this.activeJobs.set(jobId, {
        resolve,
        reject,
        timeout: timeoutId,
        jobData,
        startTime: Date.now()
      });

      // Try to assign to an available worker
      const worker = this._getAvailableWorker();
      if (worker) {
        this._assignJobToWorker(worker, jobData);
      } else {
        // No available worker, add to queue
        this.jobQueue.push(jobData);
        this.stats.currentQueueSize = this.jobQueue.length;
        this.stats.peakQueueSize = Math.max(this.stats.peakQueueSize, this.stats.currentQueueSize);
        console.log(`⏳ Job ${jobId} queued (queue size: ${this.jobQueue.length})`);
      }
    });
  }

  /**
   * Get an available worker from the pool
   */
  _getAvailableWorker() {
    return this.availableWorkers.shift() || null;
  }

  /**
   * Assign a job to a specific worker
   */
  _assignJobToWorker(worker, jobData) {
    worker.isAvailable = false;
    worker.currentJobId = jobData.jobId;
    this.busyWorkers.set(worker, jobData.jobId);

    console.log(`🔄 Assigning job ${jobData.jobId} to worker ${worker.workerId}`);

    // Send job to worker
    worker.postMessage(jobData);
  }

  /**
   * Handle message received from worker
   */
  _handleWorkerMessage(worker, message) {
    const { jobId, success, result, error, processingTime } = message;

    console.log(`📤 Worker ${worker.workerId} completed job ${jobId} (success: ${success}, time: ${processingTime}ms)`);

    // Get job metadata
    const job = this.activeJobs.get(jobId);
    if (!job) {
      console.warn(`⚠️ Received result for unknown job ${jobId}`);
      return;
    }

    // Clear timeout
    clearTimeout(job.timeout);

    // Update statistics
    if (success) {
      this.stats.totalJobsProcessed++;
      job.resolve(result);
    } else {
      this.stats.totalJobsFailed++;
      job.reject(new Error(error || 'Worker processing failed'));
    }

    // Clean up
    this.activeJobs.delete(jobId);
    this._freeWorker(worker);

    // Process next job in queue if any
    this._processQueue();
  }

  /**
   * Handle worker error
   */
  _handleWorkerError(worker, error) {
    console.error(`❌ Worker ${worker.workerId} error:`, error);

    const jobId = worker.currentJobId;
    if (jobId) {
      const job = this.activeJobs.get(jobId);
      if (job) {
        clearTimeout(job.timeout);
        job.reject(new Error(`Worker error: ${error.message}`));
        this.activeJobs.delete(jobId);
        this.stats.totalJobsFailed++;
      }
    }

    // Worker might still be functional, try to free it
    this._freeWorker(worker);
  }

  /**
   * Handle worker exit
   */
  _handleWorkerExit(worker, code) {
    console.warn(`⚠️ Worker ${worker.workerId} exited with code ${code}`);

    // Handle any active job on this worker
    const jobId = worker.currentJobId;
    if (jobId) {
      const job = this.activeJobs.get(jobId);
      if (job) {
        clearTimeout(job.timeout);

        // If not shutting down, re-queue the job
        if (!this.isShuttingDown) {
          console.log(`♻️ Re-queueing job ${jobId} after worker exit`);
          this.jobQueue.unshift(job.jobData);
          this.stats.currentQueueSize = this.jobQueue.length;
        } else {
          job.reject(new Error('Worker exited during shutdown'));
        }

        this.activeJobs.delete(jobId);
      }
    }

    // Remove worker from pools
    this.busyWorkers.delete(worker);
    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
    }

    // If not shutting down, create a replacement worker
    if (!this.isShuttingDown) {
      console.log(`🔄 Creating replacement worker for worker ${worker.workerId}`);
      this._createWorker(worker.workerId);
      this._processQueue();
    }
  }

  /**
   * Handle job timeout
   */
  _handleJobTimeout(jobId) {
    console.error(`⏱️ Job ${jobId} timed out`);

    const job = this.activeJobs.get(jobId);
    if (!job) {
      return;
    }

    job.reject(new Error('Job processing timeout'));
    this.activeJobs.delete(jobId);
    this.stats.totalJobsFailed++;

    // Find and terminate the worker handling this job
    for (const [worker, currentJobId] of this.busyWorkers.entries()) {
      if (currentJobId === jobId) {
        console.warn(`⚠️ Terminating worker ${worker.workerId} due to timeout`);
        worker.terminate();
        break;
      }
    }
  }

  /**
   * Free a worker and make it available for new jobs
   */
  _freeWorker(worker) {
    worker.isAvailable = true;
    worker.currentJobId = null;
    this.busyWorkers.delete(worker);

    // Only add back to available pool if worker is still in the workers array
    if (this.workers.includes(worker) && !this.availableWorkers.includes(worker)) {
      this.availableWorkers.push(worker);
      console.log(`✅ Worker ${worker.workerId} freed (available: ${this.availableWorkers.length})`);
    }
  }

  /**
   * Process the next job in the queue
   */
  _processQueue() {
    if (this.jobQueue.length === 0) {
      return;
    }

    const worker = this._getAvailableWorker();
    if (!worker) {
      return;
    }

    const jobData = this.jobQueue.shift();
    this.stats.currentQueueSize = this.jobQueue.length;

    console.log(`📤 Processing queued job ${jobData.jobId} (remaining: ${this.jobQueue.length})`);
    this._assignJobToWorker(worker, jobData);

    // Process more if possible
    if (this.jobQueue.length > 0 && this.availableWorkers.length > 0) {
      this._processQueue();
    }
  }

  /**
   * Get current pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.poolSize,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      activeJobs: this.activeJobs.size,
      currentQueueSize: this.jobQueue.length
    };
  }

  /**
   * Gracefully shutdown the worker pool
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    console.log('🛑 Shutting down WorkerPool...');
    this.isShuttingDown = true;

    // Reject all queued jobs
    while (this.jobQueue.length > 0) {
      const jobData = this.jobQueue.shift();
      const job = this.activeJobs.get(jobData.jobId);
      if (job) {
        clearTimeout(job.timeout);
        job.reject(new Error('WorkerPool shutdown'));
        this.activeJobs.delete(jobData.jobId);
      }
    }

    // Wait for active jobs to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const shutdownPromise = new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.activeJobs.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, shutdownTimeout);
    });

    await shutdownPromise;

    // Terminate all workers
    const terminatePromises = this.workers.map(worker => {
      return worker.terminate();
    });

    await Promise.allSettled(terminatePromises);

    console.log('✅ WorkerPool shutdown complete');
  }
}

module.exports = WorkerPool;
