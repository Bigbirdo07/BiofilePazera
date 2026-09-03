# Web Bundle Analysis

Measured with `npm run build`.

| Output | Before NGL split | After NGL split |
| --- | ---: | ---: |
| Main JavaScript | 1,673.81 kB | 366.84 kB |
| Main JavaScript gzip | 473.36 kB | 103.07 kB |
| NGL chunk | bundled | 1,312.85 kB |
| NGL chunk gzip | bundled | 371.46 kB |

The NGL chunk is loaded on demand by Protein Studio after a structure with coordinates is available. The production build still reports a chunk-size warning for the NGL chunk because molecular rendering is substantial; the initial application bundle is substantially smaller as a result.
