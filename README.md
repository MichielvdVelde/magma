# Magma

In-progress procedural terrain generator using a Web Worker pool.

Currently, the worker and pool skeleton is done, and four example tasks are
implemented:

- Terrain generation; uses Open Simplex Noise to generate an array buffer of
  values.
- Heightmap generation; uses the terrain data to generate a heightmap.
- Thermal erosion; a very basic and naive thermal erosion algorithm.
- Hydraulic erosion; a very basic and naive hydraulic erosion algorithm.

## License

MIT.
