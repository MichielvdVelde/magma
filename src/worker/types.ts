import { ResultDetail } from "../pool/types";
import type { BufferTypes, Size } from "./buffer";

/**
 * A message sent to the worker.
 */
export interface Action<P = never, T extends string = string> {
  /** The type of the message. */
  type: T;
  /** The payload of the message. */
  payload: P;
}

/**
 * An object with a size.
 */
export interface Sizable {
  /** The size of the object. */
  size: Size;
}

/**
 * A task. This is a function that performs an operation.
 * @template Config The type of the options.
 * @template Return The type of the return value.
 * @param context The context for the task.
 */
export type Task<
  Return = unknown,
  Config extends Sizable = Sizable,
> = (
  context: Context<Config>,
) => Return;

/**
 * A type handler.
 * @template Type The type of the handler.
 */
export interface TypeHandler<Type extends string = string> {
  /** The type of the handler. */
  readonly type: Type;
  /**
   * Checks if the handler is of the given type.
   * @param type The type to check.
   */
  is(type: string): boolean;
  /**
   * Adds a task to the handler.
   * @param type The type of the task.
   * @param task The task to add.
   */
  add<P extends Sizable, T extends string>(
    type: T,
    task: Task<any, P>,
  ): void;
  /**
   * Checks if the handler has a task of the given type.
   * @param type The type of the task.
   */
  has(type: string): boolean;
  /**
   * Gets a task from the handler.
   * @param type The type of the task.
   */
  get<P extends Sizable, T extends string>(
    type: T,
  ): Task<unknown, P> | undefined;
}

/**
 * The payload of a message.
 * @template Type The type of the buffer.
 * @template Options The type of the options.
 */
export type Payload<Config = {}> = {
  /** The size of the buffer. */
  size: Size;
} & Config;

/**
 * A transferable buffer type. This is a buffer that can be transferred between threads.
 */
export type TransferableBuffer = BufferTypes | ArrayBuffer | SharedArrayBuffer;

/**
 * A context for a task.
 * @template Config The type of the configuration.
 */
export interface Context<Config = unknown, Progress = unknown> {
  /** The ID of the task. */
  readonly id: number;
  /** The configuration for the task. */
  readonly config: Config;
  /** The buffers to transfer to the main thread. */
  readonly transferables: TransferableBuffer[];
  /** The start time of the task. */
  readonly start: number;
  /**
   * Reports progress to the main thread.
   * @param payload The progress payload.
   */
  progress<P extends Progress>(payload: P): void;
  /**
   * Marks the buffers for transfer to the main thread.
   * @param buffers The buffers to transfer.
   */
  transfer(...buffers: TransferableBuffer[]): void;
}

/**
 * An error payload.
 */
export interface ErrorPayload {
  /** The error message. */
  message: string;
  /** The duration of the task, if applicable. */
  duration?: number;
}

/**
 * A message received by the worker.
 * @template Type The type of the buffer.
 * @template Options The type of the options.
 */
export type IncomingMessage<Config = unknown> = Action<Payload<Config>>;

/**
 * An error action.
 */
export type ErrorAction = Action<ErrorPayload, "error">;

/**
 * A progress action.
 * @template Payload The type of the progress payload.
 */
export type ProgressAction<Progress = unknown> = Action<Progress, "progress">;

/**
 * A result action.
 * @template Result The type of the result.
 */
export type ResultAction<Result = unknown> = Action<
  ResultDetail<Result>,
  "result"
>;
