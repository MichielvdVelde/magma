import type { BufferTypes } from "./buffer";
import type { ProgressDetail, ResultDetail } from "../pool/pool";
import type {
  Context,
  ErrorAction,
  Sizable,
  Task,
  TransferableBuffer,
  TypeHandler,
} from "./types";

/**
 * Create a new worker instance.
 */
export function createWorker(): Worker {
  return new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
}

/**
 * A function that generates unique IDs.
 */
export type GetID = () => number;

/**
 * Generates unique IDs.
 * @returns A function that generates unique IDs.
 */
export function idGen(): GetID {
  let id = 0;
  return () => {
    if (id === Number.MAX_SAFE_INTEGER) {
      id = 0;
    }

    return id++;
  };
}

/**
 * A handler for tasks.
 */
export interface Handler {
  /** The handlers. */
  readonly handlers: Map<string, TypeHandler>;
  /**
   * Get a handler for a type.
   * @param type The type of the handler.
   * @returns The handler for the type.
   */
  getHandler(type: string): TypeHandler | undefined;
}

/**
 * Creates a handler for tasks.
 * @returns The handler for tasks.
 */
export function makeHandler(): Handler {
  const handlers = new Map<string, TypeHandler>();

  return {
    handlers,
    getHandler(type: string): TypeHandler | undefined {
      return handlers.get(type.split("/")[0]);
    },
  };
}

/**
 * Creates a type handler.
 * @template Type The type of the handler.
 * @param type The type of the handler.
 */
export function makeTypeHandler<Type extends string = string>(
  type: Type,
): TypeHandler<Type> {
  const tasks = new Map<string, Task>();

  return {
    type: type as Type,
    is(type: string): boolean {
      return type.startsWith(`${type}/`);
    },
    add<P extends Sizable, T extends string>(
      type: T,
      task: Task<any, P>,
    ) {
      tasks.set(type, task as Task);
    },
    has(type: string): boolean {
      return tasks.has(type);
    },
    get<P extends Sizable, T extends string>(
      type: T,
    ): Task<unknown, P> | undefined {
      return tasks.get(type);
    },
  };
}

/**
 * Builds a context for a task.
 * @template Config The type of the configuration.
 * @template Progress The type of the progress.
 * @param id The ID of the task.
 * @param config The configuration for the task.
 * @param busy A function that returns the busy task ID.
 */
export function buildContext<Config, Progress = unknown>(
  id: number,
  config: Config,
  busy: () => false | number,
): Context<Config, Progress> {
  const transferables = new Set<TransferableBuffer>();
  const start = performance.now();

  return {
    id,
    config,
    get start() {
      return start;
    },
    get transferables() {
      return [...transferables];
    },
    progress<Detail>(detail: Detail): void {
      if (busy() !== id) {
        throw new Error("Task is not active");
      }

      const duration = start ? performance.now() - start : 0;
      const payload: ProgressDetail<Detail> = { progress: detail, duration };
      dispatch({ type: "progress", payload });
    },
    transfer(...buffers: TransferableBuffer[]): void {
      for (const buffer of buffers) {
        transferables.add(buffer);
      }
    },
  };
}

/**
 * Dispatches an error message to the main thread.
 * @param message The error message.
 * @param duration The duration of the error message.
 */
export function dispatchError(message: string, duration?: number): void {
  dispatch(createError(message, duration));
}

/**
 * Dispatches a result message to the main thread.
 * @template Result The type of the result.
 * @param result The result to dispatch.
 * @param duration The duration of the task.
 * @param transferables The buffers to transfer with the message.
 */
export function dispatchResult<Result = unknown>(
  result: Result,
  duration: number,
  transferables?: TransferableBuffer[],
): void {
  dispatch(createResult(result, duration), transferables);
}

/**
 * Dispatches a message to the main thread.
 * @param action The action to dispatch.
 * @param transfer The buffers to transfer with the message.
 */
export function dispatch<T>(action: T, transfer?: TransferableBuffer[]): void {
  postMessage(
    action,
    transfer?.length
      ? { transfer: transfer.map((t) => (t as BufferTypes).buffer ?? t) }
      : undefined,
  );
}

/**
 * Creates an error action.
 * @param message The error message.
 * @param duration The duration of the task, if applicable.
 */
export function createError(message: string, duration?: number): ErrorAction {
  return { type: "error", payload: { message, duration } };
}

/**
 * Creates a result detail.
 * @template Result The type of the result.
 * @param result The result.
 * @param duration The duration of the task.
 */
export function createResult<Result>(
  result: Result,
  duration: number,
): ResultDetail<Result> {
  return { result, duration };
}
