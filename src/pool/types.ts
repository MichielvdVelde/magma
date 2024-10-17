/**
 * A worker pool task.
 * @template W The worker type.
 * @template Return The return type of the function.
 * @param worker The worker to use.
 */
export type PoolTask<W extends Worker = Worker, Return = unknown> = (
  worker: W,
) => Return;

/**
 * A result detail.
 * @template Result The result type.
 */
export interface ResultDetail<Result = unknown> {
  /** The result. */
  result: Result;
  /** The duration in milliseconds. */
  duration: number;
}

/**
 * A progress detail.
 * @template Progress The progress type.
 */
export interface ProgressDetail<Progress = unknown> {
  /** The progress. */
  progress: Progress;
  /** The duration in milliseconds. */
  duration: number;
}

/**
 * An execution target. This is used to listen for events from a worker.
 */
export interface ExecutionTarget<Result = unknown, Progress = unknown> {
  /** Add an event listener for the start event. */
  addEventListener(
    type: "start",
    listener: () => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  /** Add an event listener for the progress event. */
  addEventListener(
    type: "progress",
    listener: (event: CustomEvent<ProgressDetail<Progress>>) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  /** Add an event listener for the result event. */
  addEventListener(
    type: "result",
    listener: (event: CustomEvent<ResultDetail<Result>>) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  /** Add an event listener for the error event. */
  addEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  /** Remove an event listener for the start event. */
  removeEventListener(
    type: "start",
    listener: () => void,
  ): void;
  /** Remove an event listener for the progress event. */
  removeEventListener(
    type: "progress",
    listener: (event: CustomEvent<Progress>) => void,
  ): void;
  /** Remove an event listener for the result event. */
  removeEventListener(
    type: "result",
    listener: (event: CustomEvent<ResultDetail<Result>>) => void,
  ): void;
  /** Remove an event listener for the error event. */
  removeEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
  ): void;
}

/**
 * An execution handler.
 * @template Result The result type.
 * @template Progress The progress type.
 */
export interface ExecutionHandler<Result = unknown, Progress = unknown>
  extends ExecutionTarget<Result, Progress> {
  /** Whether the task has finished. */
  readonly finished: boolean;
  /** The error that occurred. */
  readonly error?: Error;
  /** The result of the task. */
  readonly result?: ResultDetail<Result>;
}

/**
 * A pool worker creation function.
 * @template PoolWorker The worker type.
 */
export type CreatePoolWorker<PoolWorker extends Worker = Worker> = () =>
  PoolWorker;
