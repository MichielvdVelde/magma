import type { Buffer2D } from "../worker/buffer";

/**
 * A 2D noise function.
 * @param x The x-coordinate.
 * @param y The y-coordinate.
 * @returns The noise value at the given coordinates.
 */
export type Noise2D = (x: number, y: number) => number;

/**
 * A wrapped noise function with options.
 * @param x The x-coordinate.
 * @param y The y-coordinate.
 * @returns The noise value at the given coordinates.
 */
export type WrappedNoise2D = Noise2D & Readonly<Required<NoiseOptions>>;

/**
 * Options for generating noise.
 */
export interface NoiseOptions {
  /**
   * The frequency of the noise. This determines how quickly the noise values change as you move across space.
   * @default 1
   */
  frequency?: number;
  /**
   * The number of octaves in the noise. This determines how many layers of noise are combined.
   * @default 1
   */
  octaves?: number;
  /**
   * The persistence of the noise. This determines how quickly the amplitude decreases for each octave.
   * @default 0.5
   */
  persistence?: number;
  /**
   * The amplitude of the noise. This determines how much each octave contributes to the final noise value.
   * @default 1
   */
  amplitude?: number;
  /**
   * The lacunarity of the noise. This determines how quickly the frequency increases for each octave.
   * @default 2
   */
  lacunarity?: number;
  /**
   * The scale of the noise. This determines the maximum value of the noise.
   * @default 1
   */
  scale?: number;
}

/** Default noise options. */
export const DEFAULT_OPTIONS: Readonly<Required<NoiseOptions>> = Object.freeze({
  frequency: 1,
  octaves: 1,
  persistence: 0.5,
  amplitude: 1,
  lacunarity: 2,
  scale: 1,
});

/**
 * Validates noise options.
 * @param options The noise options to validate.
 * @throws {TypeError} If the frequency is less than or equal to 0.
 * @throws {TypeError} If the octaves is not an integer greater than 0.
 * @throws {TypeError} If the persistence is not between 0 and 1.
 * @throws {TypeError} If the amplitude is less than or equal to 0.
 * @throws {TypeError} If the lacunarity is less than or equal to 0.
 * @throws {TypeError} If the scale is less than or equal to 0.
 */
export function validateNoiseOptions({
  frequency,
  octaves,
  persistence,
  amplitude,
  lacunarity,
  scale,
}: Required<NoiseOptions>): void {
  if (frequency <= 0) {
    throw new TypeError("Frequency must be greater than 0.");
  }

  if (!Number.isInteger(octaves) || octaves <= 0) {
    throw new TypeError("Octaves must be an integer greater than 0.");
  }

  if (persistence <= 0 || persistence >= 1) {
    throw new TypeError("Persistence must be between 0 and 1.");
  }

  if (amplitude <= 0) {
    throw new TypeError("Amplitude must be greater than 0.");
  }

  if (lacunarity <= 0) {
    throw new TypeError("Lacunarity must be greater than 0.");
  }

  if (scale <= 0) {
    throw new TypeError("Scale must be greater than 0.");
  }
}

/**
 * Wraps a noise function with options.
 * @param noiseFn The noise function to wrap.
 * @param options The options for the noise function.
 * @param skipValidation Whether to skip validation of the options.
 * @returns The wrapped noise function.
 */
export function wrapNoise(
  noiseFn: Noise2D,
  options?: NoiseOptions,
  skipValidation = false,
): WrappedNoise2D {
  const combinedOptions = { ...DEFAULT_OPTIONS, ...options };

  if (!skipValidation) {
    validateNoiseOptions(combinedOptions);
  }

  const {
    frequency,
    octaves,
    persistence,
    amplitude,
    lacunarity,
    scale,
  } = combinedOptions;

  // Precompute the maximum amplitude
  let maxAmplitude = 0;
  let amplitudeAcc = amplitude;
  for (let i = 0; i < octaves; i++) {
    maxAmplitude += amplitudeAcc;
    amplitudeAcc *= persistence;
  }

  const normalizedMaxAmplitude = maxAmplitude * scale;

  // Precompute amplitude and frequency for each octave
  const amplitudes = new Float32Array(octaves);
  const frequencies = new Float32Array(octaves);

  amplitudeAcc = amplitude;
  let frequencyAcc = frequency;
  for (let i = 0; i < octaves; i++) {
    amplitudes[i] = amplitudeAcc;
    frequencies[i] = frequencyAcc;
    amplitudeAcc *= persistence;
    frequencyAcc *= lacunarity;
  }

  function wrappedNoise(x: number, y: number): number {
    let value = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitudes[i] * noiseFn(x * frequencies[i], y * frequencies[i]);
    }

    return value / normalizedMaxAmplitude;
  }

  return Object.assign(wrappedNoise, combinedOptions);
}

/**
 * Fills a buffer with noise values.
 * @param buffer The buffer to fill.
 * @param noiseFn The noise function to use.
 */
export function fillBuffer2D(
  buffer: Buffer2D<Float32Array>,
  noiseFn: Noise2D,
): Buffer2D<Float32Array> {
  const { size } = buffer;

  for (let x = 0; x < size[0]; x++) {
    for (let y = 0; y < size[1]; y++) {
      buffer.set(x, y, noiseFn(x, y));
    }
  }

  return buffer;
}
