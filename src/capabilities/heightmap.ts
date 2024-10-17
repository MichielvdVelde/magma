import type { Buffer2D } from "../worker/buffer";

/**
 * Makes a heightmap from a buffer.
 * @param buffer The buffer to make a heightmap from.
 * @returns The heightmap.
 */
export function makeHeightmap(buffer: Buffer2D<Float32Array>): ImageData {
  const { size } = buffer;
  const data = new Uint8ClampedArray(buffer.size[0] * buffer.size[1] * 4);

  for (let i = 0; i < data.length; i++) {
    const value = buffer.buffer[i] * 255;
    const index = i * 4;

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  return new ImageData(data, size[0], size[1]);
}
