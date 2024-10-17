import { Deferred } from "./Deferred";
import { waitForReady } from "./helpers";
import type { CreatePoolWorker, PoolTask } from "./types";

/**
 * A worker pool.
 */
export class WorkerPool<PoolWorker extends Worker = Worker>
  extends EventTarget {
  /** The workers in the pool. */
  #workers: PoolWorker[] = [];
  /** The available workers. */
  #available: PoolWorker[] = [];
  /** The pending requests. */
  #pending: Deferred<PoolWorker>[] = [];
  /** The base worker creation function. */
  #createWorkerBase: CreatePoolWorker<PoolWorker>;

  /** The maximum number of pending requests. */
  #maxPending = Infinity;

  /** The number of workers in the pool. */
  get size(): number {
    return this.#workers.length;
  }

  /** The number of available workers. */
  get available(): number {
    return this.#available.length;
  }

  /** The number of pending requests. */
  get pending(): number {
    return this.#pending.length;
  }

  /** The maximum number of pending requests. */
  get maxPending(): number {
    return this.#maxPending;
  }

  set maxPending(value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError("Max pending must be a non-negative integer");
    }

    this.#maxPending = value;
  }

  /**
   * Create a new worker pool.
   * @param createWorker The worker creation function.
   * @param size The number of workers in the pool.
   * @throws {RangeError} If the size is less than or equal to 0.
   */
  constructor(createWorker: CreatePoolWorker<PoolWorker>, size: number) {
    super();

    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError("Size must be a positive integer");
    }

    this.#createWorkerBase = createWorker;

    Promise.all(
      Array.from({ length: size }, () => this.#createWorker(false)),
    ).then(() => {
      this.dispatchEvent(new Event("ready"));
    }).catch((error) => {
      this.dispatchEvent(new ErrorEvent("error", { error }));
    });
  }

  /**
   * Acquire a worker from the pool.
   * @throws {Error} If there are no workers in the pool.
   * @throws {Error} If the maximum number of pending requests is reached.
   */
  async acquire(): Promise<PoolWorker> {
    if (!this.#workers.length) {
      throw new Error("No workers in pool");
    }

    const next = this.#available.shift();

    if (next) {
      return next;
    } else if (this.#pending.length >= this.#maxPending) {
      throw new Error("Max pending requests reached");
    } else {
      const deferred = new Deferred<PoolWorker>();
      this.#pending.push(deferred);
      return deferred.promise;
    }
  }

  /**
   * Release a worker back to the pool.
   * @param worker The worker to release.
   * @throws {Error} If the worker is not in the pool.
   */
  release(worker: PoolWorker): void {
    if (!this.#workers.includes(worker)) {
      throw new Error("Worker is not in pool");
    }

    const deferred = this.#pending.shift();

    if (deferred) {
      setTimeout(() => deferred.resolve(worker), 0);
    } else {
      this.#available.push(worker);
    }
  }

  /**
   * Perform a task with a worker. The worker is released when the task is complete.
   * @template Return The return type of the function.
   * @param task The task to perform.
   * @throws {AggregateError} If an error occurs while acquiring the worker.
   * @throws {AggregateError} If an error occurs during the task.
   * @throws {AggregateError} If an error occurs while releasing the worker.
   * @returns The result of the function.
   */
  async with<Return = unknown>(
    task: PoolTask<PoolWorker, Return>,
  ): Promise<Return> {
    let worker: PoolWorker | undefined;
    let result: Return | undefined;

    try {
      try {
        worker = await this.acquire();
      } catch (error) {
        throw new AggregateError([error], "Failed to acquire worker");
      }

      try {
        result = await task(worker);
      } catch (error) {
        throw new AggregateError([error], "Worker task failed");
      }
    } finally {
      if (worker) {
        try {
          this.release(worker);
        } catch (error) {
          throw new AggregateError([error], "Failed to release worker");
        }
      }
    }

    return result;
  }

  /**
   * Close the worker pool.
   */
  close(): void {
    if (!this.#workers.length) {
      return;
    }

    for (const worker of this.#workers) {
      worker.terminate();
    }

    for (const deferred of this.#pending) {
      deferred.reject(new Error("Worker pool closed"));
    }

    this.#workers = [];
    this.#available = [];
    this.#pending = [];
  }

  /**
   * Create a new worker.
   * @param busy Whether the worker is busy.
   */
  async #createWorker(busy: boolean): Promise<PoolWorker> {
    const worker = await waitForReady(this.#createWorkerBase());
    this.#workers.push(worker);

    if (!busy) {
      this.#available.push(worker);
    }

    // Make sure the worker is removed from the pool when it errors.
    worker.addEventListener("error", () => {
      this.#workers = this.#workers.filter((w) => w !== worker);
      this.#available = this.#available.filter((w) => w !== worker);
    }, { once: true });

    return worker;
  }
}

export class AggregateError extends Error {
  readonly name = "AggregateError";
  readonly errors: readonly unknown[];

  constructor(errors: readonly unknown[], message?: string) {
    super(message);
    this.errors = errors;
  }
}
