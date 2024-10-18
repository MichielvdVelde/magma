/// <reference lib="webworker" />

import { makeNoise2D } from "open-simplex-noise";
import {
  fillBuffer2D,
  type NoiseOptions,
  wrapNoise,
} from "../capabilities/noise";
import { wrapBuffer } from "./buffer";
import {
  applyThermalErosion,
  type ThermalErosionOptions,
} from "../capabilities/erosion/thermal";
import {
  applyHydraulicErosion,
  type HydraulicErosionOptions,
} from "../capabilities/erosion/hydraulic";
import { makeHeightmap } from "../capabilities/heightmap";
import type { IncomingMessage, Sizable } from "./types";
import {
  buildContext,
  createError,
  createResult,
  dispatch,
  idGen,
  makeHandler,
  makeTypeHandler,
} from "./helpers";

const { handlers, getHandler } = makeHandler();

/** The terrain handler. */
const terrainHandler = makeTypeHandler("terrain");

/** The options for buffers. */
export interface BufferOptions {
  /**Whether to use shared buffers. */
  shared?: boolean;
}

/**
 * The options for generating terrain.
 */
export interface TerrainOptions
  extends Sizable, Partial<NoiseOptions>, BufferOptions {
  /** The seed for the terrain. */
  seed: number;
}

// Add the generate terrain task to the terrain handler.
terrainHandler.add<TerrainOptions, "generate">(
  "generate",
  ({ config, transfer, progress }) => {
    const { shared = false, seed, size, ...options } = config;
    const length = size[0] * size[1] * Float32Array.BYTES_PER_ELEMENT;
    const baseBuf = shared
      ? new SharedArrayBuffer(length)
      : new ArrayBuffer(length);

    progress(`Generating terrain in ${shared ? "shared" : "dedicated"} buffer`);

    const buf = wrapBuffer(new Float32Array(baseBuf), size);

    if (!shared) {
      // Mark the buffer for transfer
      transfer(buf.buffer);
    }

    const baseNoiseFn = makeNoise2D(seed);
    const noiseFn = wrapNoise(baseNoiseFn, options);
    return fillBuffer2D(buf, noiseFn).buffer;
  },
);

/**
 * The configuration for a heightmap.
 */
export interface HeightmapConfig extends Sizable {
  /** The buffer to convert to a heightmap. */
  buffer: Float32Array;
}

// Add the make heightmap task to the terrain handler.
terrainHandler.add<HeightmapConfig, "heightmap">(
  "heightmap",
  ({ config, transfer }) => {
    const { buffer } = config;
    const buf = wrapBuffer(buffer, config.size);
    const resultBuf = makeHeightmap(buf);
    transfer(resultBuf.data); // Mark the buffer for transfer
    return resultBuf;
  },
);

// Add the terrain handler to the handlers.
handlers.set(terrainHandler.type, terrainHandler);

/** The erosion handler. */
const erosionHandler = makeTypeHandler("erosion");

/**
 * The configuration for thermal erosion.
 */
export interface ThermalErosionConfig extends Sizable, ThermalErosionOptions {
  /** The buffer to erode. */
  buffer: Float32Array;
}

// Add the thermal erosion task to the erosion handler.
erosionHandler.add<ThermalErosionConfig, "thermal">(
  "thermal",
  ({ config, transfer }) => {
    const { buffer, size, ...options } = config;
    const buf = wrapBuffer(buffer, size);
    transfer(buf.buffer); // Mark the buffer for transfer
    return applyThermalErosion(buf, options);
  },
);

/**
 * The configuration for hydraulic erosion.
 */
export interface HydraulicErosionConfig
  extends Sizable, HydraulicErosionOptions {
  /** The buffer to erode. */
  buffer: Float32Array;
}

// Add the hydraulic erosion task to the erosion handler.
erosionHandler.add<HydraulicErosionConfig, "hydraulic">(
  "hydraulic",
  ({ config, transfer }) => {
    const { buffer, size, ...options } = config;
    const buf = wrapBuffer(buffer, size);
    transfer(buf.buffer); // Mark the buffer for transfer
    return applyHydraulicErosion(buf, options);
  },
);

// Add the erosion handler to the handlers.
handlers.set(erosionHandler.type, erosionHandler);

/** Whether the worker is busy. */
let busy: false | number = false;

/** Generates unique IDs for tasks. */
const getID = idGen();

/**
 * Handles messages from the main thread.
 * @param event The message event.
 */
export function onMessage(event: MessageEvent<IncomingMessage>): void {
  /** The duration of the task. */
  let duration: number | undefined;

  try {
    if (busy) {
      throw new Error("Worker is busy");
    }

    // Set the worker as busy.
    busy = getID();

    const { type, payload } = event.data;

    // Get the handler for the message type.
    const handler = getHandler(type);

    if (!handler) {
      throw new Error(`Missing handler for type: ${type}`);
    }

    // Get the task for the message type.
    const [, subType] = type.split("/");
    const task = handler.get(subType);

    if (!task) {
      throw new Error(`Missing task for type: ${type}`);
    }

    // Dispatch the start message.
    dispatch({ type: "start" });

    /** The context for the task. */
    const context = buildContext(busy, payload, () => busy);

    /** The result of the task. */
    let result: unknown;

    try {
      // Perform the task.
      result = task(context);
    } finally {
      duration = performance.now() - context.start;
    }

    // Notify the main thread that the task is complete.
    dispatch(createResult(result, duration), context.transferables);
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    dispatch(createError(message, duration));
  } finally {
    busy = false;
  }
}

// Handle messages from the main thread.
self.addEventListener("message", onMessage);

// Notify the main thread that the worker is ready.
postMessage({ type: "ready" });
