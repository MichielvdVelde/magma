import { type FC } from "react";
import { WorkerPool } from "./pool/pool";
import { useTask } from "./worker/hooks";
import { createWorker } from "./worker/helpers";

/**
 * A task example component.
 */
export const TaskExample: FC<{ pool: WorkerPool }> = ({ pool }) => {
  const task = useTask<Float32Array>(pool, "terrain/generate", {
    size: [100, 100],
  });

  return (
    <div>
      <button
        disabled={task.loading}
        onClick={() => task.execute()}
      >
        Execute
      </button>
      {task.loading
        ? <p>Loading...</p>
        : task.error
        ? <p>Error: {task.error.message}</p>
        : task.result
        ? <p>Result: {(task.result.result as any).length}</p>
        : null}
    </div>
  );
};

/** The worker pool. */
const pool = new WorkerPool(createWorker, navigator.hardwareConcurrency ?? 1);

/**
 * The application component.
 */
const App: FC = () => {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <h2>Task Example</h2>
      <TaskExample pool={pool} />
    </div>
  );
};

export default App;
