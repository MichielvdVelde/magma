/** The size of the buffer. */
export type Size = [width: number, height: number];

/** A 2D point. */
export interface Point {
  /** The x-coordinate. */
  x: number;
  /** The y-coordinate. */
  y: number;
}

/**
 * Add a value to a type.
 * @template T The type to add the value to.
 */
export type WithValue<T> = T & { value: number };

/**
 * Add an index and value to a type.
 * @template T The type to add the index and value to.
 */
export type WithIndexAndValue<T> = T & { index: number; value: number };

/** A buffer of a specific type. */
export type BufferTypes =
  | Float32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8ClampedArray;

/**
 * A 2D buffer of a specific type. This is a wrapper around a typed array that provides a 2D interface to the data.
 * @template Type The type of the buffer.
 */
export interface Buffer2D<Type extends BufferTypes> {
  /** The size of the buffer. */
  readonly size: Size;
  /** The underlying buffer. */
  readonly buffer: Type;
  /**
   * Checks if the given coordinates are within the bounds of the buffer.
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   */
  isInBounds(x: number, y: number): boolean;
  /**
   * Gets the index of the given coordinates in the buffer.
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   * @param noCheck Whether to skip bounds checking.
   * @throws {RangeError} If the coordinates are out of bounds.
   */
  getIndex(x: number, y: number, noCheck?: boolean): number;
  /**
   * Gets the value at the given coordinates in the buffer.
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   * @param noCheck Whether to skip bounds checking.
   * @throws {RangeError} If the coordinates are out of bounds.
   */
  get(x: number, y: number, noCheck?: boolean): number;
  /**
   * Sets the value at the given coordinates in the buffer.
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   * @param value The value to set.
   * @param noCheck Whether to skip bounds checking.
   * @throws {RangeError} If the coordinates are out of bounds.
   */
  set(x: number, y: number, value: number, noCheck?: boolean): void;
  /**
   * Returns an iterator over the values in the buffer.
   */
  values(): IterableIterator<WithIndexAndValue<Point>>;
  [Symbol.iterator](): IterableIterator<WithIndexAndValue<Point>>;
}

/**
 * Wraps a typed array buffer with a 2D interface.
 * @param buffer The buffer to wrap.
 * @param size The size of the buffer.
 */
export function wrapBuffer<Type extends BufferTypes>(
  buffer: Type,
  size: Size,
): Buffer2D<Type> {
  const length = size[0] * size[1];

  if (buffer.length !== length) {
    throw new RangeError(
      `Buffer length (${buffer.length}) does not match size (${length})`,
    );
  }

  return {
    size,
    buffer,
    isInBounds(x: number, y: number): boolean {
      return x >= 0 && x < size[0] && y >= 0 && y < size[1];
    },
    getIndex(x: number, y: number, noCheck = false): number {
      if (!noCheck && !this.isInBounds(x, y)) {
        throw new RangeError(`Index out of bounds: (${x}, ${y})`);
      }

      return x + y * size[0];
    },
    get(x: number, y: number, noCheck = false): number {
      return buffer[this.getIndex(x, y, noCheck)];
    },
    set(x: number, y: number, value: number, noCheck = false): void {
      buffer[this.getIndex(x, y, noCheck)] = value;
    },
    *values(): IterableIterator<WithIndexAndValue<Point>> {
      for (let x = 0; x < size[0]; x++) {
        for (let y = 0; y < size[1]; y++) {
          const index = this.getIndex(x, y, true);
          yield { x, y, value: buffer[index], index };
        }
      }
    },
    *[Symbol.iterator](): IterableIterator<WithIndexAndValue<Point>> {
      yield* this.values();
    },
  };
}
