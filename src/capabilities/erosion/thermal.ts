import type {
  Buffer2D,
  BufferTypes,
  Point,
  WithValue,
} from "../../worker/buffer";
import { getNeighbors } from "./helpers";

/**
 * Options for thermal erosion.
 */
export interface ThermalErosionOptions {
  /** The number of iterations to run. */
  iterations: number;
  /** The rate of sedimentation. */
  sedimentationRate: number;
  /** The rate of evaporation. */
  evaporationRate: number;
}

/**
 * Applies thermal erosion to a buffer.
 * @template Type The type of the buffer.
 * @param buffer The buffer to apply thermal erosion to.
 * @param options The thermal erosion options.
 * @param options.iterations The number of iterations to run.
 * @param options.sedimentationRate The rate of sedimentation.
 * @param options.evaporationRate The rate of evaporation.
 */
export function applyThermalErosion<Type extends BufferTypes>(
  buffer: Buffer2D<Type>,
  options: ThermalErosionOptions,
): Buffer2D<Type> {
  const { iterations, sedimentationRate, evaporationRate } = options;
  const sediment = new Float32Array(buffer.buffer.length);

  for (let i = 0; i < iterations; i++) {
    for (const { x, y, value, index } of buffer.values()) {
      let minSlope = Infinity;
      let minNeighbor: WithValue<Point> | undefined;

      for (const neighbor of getNeighbors(buffer, { x, y })) {
        const slope = value - neighbor.value;
        if (slope < minSlope) {
          minSlope = slope;
          minNeighbor = neighbor;
        }
      }

      if (minSlope < 0 && minNeighbor) {
        const deposit = Math.min(-minSlope, sedimentationRate);
        const neighborIndex = buffer.getIndex(minNeighbor.x, minNeighbor.y);

        buffer.set(x, y, value + deposit);
        buffer.set(minNeighbor.x, minNeighbor.y, minNeighbor.value - deposit);
        sediment[index] += deposit;
        sediment[neighborIndex] -= deposit;
      }
    }

    for (const { x, y } of buffer.values()) {
      const index = buffer.getIndex(x, y);
      sediment[index] *= evaporationRate;
      buffer.set(x, y, buffer.get(x, y, true) + sediment[index]);
    }
  }

  return buffer;
}
