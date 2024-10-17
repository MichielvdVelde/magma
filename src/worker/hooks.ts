import { useCallback, useRef, useState } from "react";
import type { WorkerPool } from "../pool/pool";
import type { BufferTypes } from "./buffer";
import type { ResultDetail } from "../pool/types";
import { executeTask } from "../pool/helpers";

/**
 * A task hook.
 * @template Result The result type.
 * @template Config The configuration type.
 */
export interface TaskHook<
  Result = unknown,
  Config = unknown,
  Buffers = Record<string, BufferTypes>,
> {
  /** The worker pool. */
  readonly pool: WorkerPool;
  /** Whether the task is loading. */
  readonly loading: boolean;
  /** The configuration for the task. */
  readonly config: Config;
  /** The result of the task. */
  readonly result?: ResultDetail<Result>;
  /** The error that occurred. */
  readonly error?: Error;
  /**
   * Set a configuration value.
   * @template K The type of the key.
   * @param key The key to set.
   * @param value The value to set.
   */
  set<K extends keyof Config>(key: K, value: Config[K]): void;
  /**
   * Set a buffer value.
   * @template K The type of the key.
   * @param key The key to set.
   * @param value The value to set.
   */
  setBuffer<K extends keyof Buffers>(key: K, value: Buffers[K]): void;
  /** Clear all buffers. */
  clearBuffers(): void;
  /**
   * Execute the task.
   * @returns Whether the task was started.
   */
  execute(): boolean;
}

/**
 * Create a task hook.
 * @template Result The result type.
 * @template Config The configuration type.
 * @param pool The worker pool.
 * @param type The type of the task.
 * @param initConfig The initial configuration.
 * @returns The task hook.
 */
export function useTask<
  Result = unknown,
  Config = unknown,
  Buffers = Record<string, BufferTypes>,
>(
  pool: WorkerPool,
  type: string,
  initConfig: Config,
): TaskHook<Result, Config> {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(initConfig);
  const buffersRef = useRef<Buffers>({} as Buffers);
  const resultRef = useRef<ResultDetail<Result>>();
  const errorRef = useRef<Error>();

  const set = useCallback<TaskHook["set"]>((key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const setBuffer = useCallback<TaskHook["setBuffer"]>((key, value) => {
    buffersRef.current = {
      ...buffersRef.current,
      [key]: value,
    };
  }, []);

  const clearBuffers = useCallback<TaskHook["clearBuffers"]>(() => {
    buffersRef.current = {} as Buffers;
  }, []);

  const execute = useCallback<TaskHook["execute"]>(() => {
    if (loading) {
      return false;
    }

    setLoading(true);
    resultRef.current = undefined;
    errorRef.current = undefined;

    setTimeout(() => {
      pool.with((worker) => {
        return new Promise<void>((resolve, reject) => {
          const removeListeners = () => {
            target.removeEventListener("result", onResult);
            target.removeEventListener("error", onError);
          };

          const onResult = (event: CustomEvent<ResultDetail<Result>>) => {
            removeListeners();
            resultRef.current = event.detail;
            resolve();
          };

          const onError = ({ error }: ErrorEvent) => {
            removeListeners();
            errorRef.current = error;
            reject(error);
          };

          // Combine the configuration (which can be stored in a state)
          // with the buffers (which are stored in a ref, as array buffers
          // cannot be stored in state).
          const taskConfig = {
            ...config,
            ...buffersRef.current,
          };

          const target = executeTask<Result>(worker, type, taskConfig);
          target.addEventListener("result", onResult);
          target.addEventListener("error", onError);
        });
      }).catch((error) => {
        errorRef.current = error instanceof Error
          ? error
          : new Error("Unknown error");
      }).finally(() => {
        setLoading(false);
      });
    }, 0);

    return true;
  }, [loading, config, pool]);

  return {
    pool,
    loading,
    config,
    get result() {
      return resultRef.current;
    },
    get error() {
      return errorRef.current;
    },
    set,
    setBuffer,
    clearBuffers,
    execute,
  };
}
