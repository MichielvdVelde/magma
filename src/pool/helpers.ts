import type { Action, ErrorPayload } from "../worker/types";
import { ExecutionTarget, ResultDetail } from "./types";

/**
 * Wait for the worker to become ready.
 * @param worker The worker to wait for.
 * @param timeout An optional timeout in milliseconds.
 */
export async function waitForReady<W extends Worker = Worker>(
  worker: W,
  timeout?: number,
): Promise<W> {
  return new Promise<W>((resolve, reject) => {
    let timeoutRef: ReturnType<typeof setTimeout> | undefined;

    const removeListeners = () => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }

      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.data.type === "ready") {
        removeListeners();
        resolve(worker);
      }
    };

    const onError = (event: ErrorEvent) => {
      removeListeners();
      reject(event.error);
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);

    if (timeout && timeout > 0) {
      timeoutRef = setTimeout(() => {
        removeListeners();
        reject(new Error("Worker timed out"));
      }, timeout);
    }
  });
}

/**
 * Execute a task with a worker.
 * @template Result The type of the result.
 * @template Progress The type of the progress.
 * @template Type The type of the task.
 * @template Payload The type of the payload.
 * @param worker The worker to use.
 * @param type The type of the task.
 * @param payload The payload for the task.
 */
export function executeTask<
  Result = unknown,
  Progress = unknown,
  Type extends string = string,
  Payload = unknown,
>(
  worker: Worker,
  type: Type,
  payload: Payload,
): ExecutionTarget<Result, Progress> {
  const target = new EventTarget();

  let finished = false;
  let result: ResultDetail<Result> | undefined;
  let error: Error | undefined;

  const removeListeners = () => {
    worker.removeEventListener("message", onMessage);
    worker.removeEventListener("error", onError);
  };

  const onMessage = (event: MessageEvent<Action<unknown>>) => {
    const { type, payload } = event.data;

    switch (type) {
      case "start":
        target.dispatchEvent(new Event("start"));
        break;
      case "progress":
        target.dispatchEvent(new CustomEvent("progress", { detail: payload }));
        break;
      case "result":
        removeListeners();
        finished = true;
        result = payload as ResultDetail<Result>;
        target.dispatchEvent(new CustomEvent("result", { detail: payload }));
        break;
      default:
        removeListeners();
        finished = true;
        error = event.data.type === "error"
          ? new Error((event.data.payload as ErrorPayload).message)
          : new Error("Invalid message received");
        target.dispatchEvent(new ErrorEvent("error", { error }));
    }
  };

  const onError = (event: ErrorEvent) => {
    removeListeners();
    target.dispatchEvent(new ErrorEvent("error", { error: event.error }));
  };

  worker.addEventListener("message", onMessage);
  worker.addEventListener("error", onError);

  setTimeout(() => {
    // Send the message to the worker.
    worker.postMessage({ type, payload });
  }, 0);

  return Object.assign(target, {
    get finished() {
      return finished;
    },
    get error() {
      return error;
    },
    get result() {
      return result;
    },
  }) as ExecutionTarget<Result, Progress>;
}
