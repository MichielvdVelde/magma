import type {
  Buffer2D,
  BufferTypes,
  Point,
  WithValue,
} from "../../worker/buffer";

/** The immediate neighbors of a cell. */
const neighbors = [
  [-1, 0], // The left neighbor.
  [1, 0], // The right neighbor.
  [0, -1], // The top neighbor.
  [0, 1], // The bottom neighbor.
] as const;

/**
 * Iterate over the immediate neighbors of a cell.
 *
 * Also see {@link getNeighborsInRange} to get neighbors within a certain range.
 *
 * @param buffer The buffer to get the neighbors from.
 * @param point The point of the cell.
 */
export function* getNeighbors<Type extends BufferTypes>(
  buffer: Buffer2D<Type>,
  point: Point,
): IterableIterator<WithValue<Point>> {
  for (const [dx, dy] of neighbors) {
    const nx = point.x + dx;
    const ny = point.y + dy;

    if (buffer.isInBounds(nx, ny)) {
      yield { x: nx, y: ny, value: buffer.get(nx, ny, true) };
    }
  }
}

/**
 * Iterate over the neighbors of a cell within a certain range.
 *
 * Also see {@link getNeighbors} to get the immediate neighbors.
 *
 * @param buffer The buffer to get the neighbors from.
 * @param point The point of the cell.
 * @param range The range of the neighbors (default is 1).
 */
export function* getNeighborsInRange<Type extends BufferTypes>(
  buffer: Buffer2D<Type>,
  point: Point,
  range = 1,
): IterableIterator<WithValue<Point>> {
  const { x, y } = point;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;
      const ny = y + dy;

      if (buffer.isInBounds(nx, ny)) {
        yield { x: nx, y: ny, value: buffer.get(nx, ny, true) };
      }
    }
  }
}
