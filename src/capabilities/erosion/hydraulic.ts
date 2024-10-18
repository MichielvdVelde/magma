import type {
  Buffer2D,
  BufferTypes,
  Point,
  WithValue,
} from "../../worker/buffer";
import { getNeighbors } from "./helpers";

/**
 * Options for hydraulic erosion.
 */
export interface HydraulicErosionOptions {
  /** The number of iterations to run. */
  iterations: number;
  /** The rate of sedimentation. */
  sedimentationRate: number;
  /** The rate of evaporation. */
  evaporationRate: number;
  /** The rate of inertia. */
  inertiaRate: number;
}

/**
 * Applies hydraulic erosion to a buffer.
 * @template Type The type of the buffer.
 * @param buffer The buffer to apply hydraulic erosion to.
 * @param options The hydraulic erosion options.
 * @param options.iterations The number of iterations to run.
 * @param options.sedimentationRate The rate of sedimentation.
 * @param options.evaporationRate The rate of evaporation.
 * @param options.inertiaRate The rate of inertia.
 */
export function applyHydraulicErosion<Type extends BufferTypes>(
  buffer: Buffer2D<Type>,
  options: HydraulicErosionOptions,
): Buffer2D<Type> {
  const {
    iterations,
    sedimentationRate,
    evaporationRate,
    inertiaRate,
  } = options;
  const sediment = new Float32Array(buffer.buffer.length);
  const water = new Float32Array(buffer.buffer.length);

  for (let i = 0; i < iterations; i++) {
    for (const { x, y, value, index } of buffer) {
      let minSlope = Infinity;
      let minNeighbor: WithValue<Point> | undefined;

      for (const neighbor of getNeighbors(buffer, { x, y })) {
        const slope = value - neighbor.value;
        if (slope < minSlope) {
          minSlope = slope;
          minNeighbor = neighbor;
        }
      }

      if (minSlope > 0 && minNeighbor) {
        const deposit = Math.min(minSlope, sedimentationRate);
        const neighborIndex = buffer.getIndex(minNeighbor.x, minNeighbor.y);

        buffer.set(x, y, value - deposit);
        buffer.set(minNeighbor.x, minNeighbor.y, minNeighbor.value + deposit);
        sediment[index] += deposit;
        sediment[neighborIndex] -= deposit;
      }

      water[buffer.getIndex(x, y)] += 1;
    }

    for (const { x, y, value } of buffer.values()) {
      const index = buffer.getIndex(x, y);
      sediment[index] *= evaporationRate;
      water[index] *= evaporationRate;

      for (const neighbor of getNeighbors(buffer, { x, y })) {
        const neighborIndex = buffer.getIndex(neighbor.x, neighbor.y, true);
        const diff = value - neighbor.value;
        const inertia = diff * inertiaRate;

        if (diff > 0) {
          const deposit = Math.min(water[index], inertia);
          water[index] -= deposit;
          water[neighborIndex] += deposit;
        }
      }

      buffer.set(x, y, value + sediment[index]);
    }
  }

  return buffer;
}
