# Frozen cross-geometry directional benchmark protocol — 27 October 2026

This protocol is written **before** running the new geometry comparisons. It responds to the exploratory low/high-frequency findings in `DIRECTIONAL_FINDINGS.md`.

## Critical baseline correction

At one frequency k, the parabolic source (e^{-5k(1-cos Δθ)}) is exactly the same waveform as a fixed-width angular source (e^{-5q(1-cos Δθ)}) with q=k. Therefore one-frequency superiority versus q=0.9 alone was NOT evidence of fundamental superiority; it tested that one arbitrary control. The primary experiment must involve both k=0.65 and 1.30 with **one shared q** for the fixed-width source.

## Locked protocol

- **Tuning geometry:** original ellipse, semi-axes 36 × 27 grid cells, original fixed source and receiver. Tuning must use **only data on that ellipse**.
- **Unseen validation geometry A:** horizontal stadium (capsule), width 72, height 54, straight central half-length 9 cells, two semicircular caps radius 27. Relative to center (47.5,47.5), `(|x|<=9 && |y|<=27) || ((|x|-9)^2+y^2<=27^2)`. Equivalent to a standard stadium.
- **Unseen validation geometry B:** ellipse of semi-axes 36 × 27 rotated by +25 degrees about center, without moving the source/receiver.
- Wall bits 0–7 are the same eight angular wall sectors relative to the unrotated coordinate axes; boundary face Robin stiffness is unchanged (0.28), missing faces otherwise have Neumann zero flux.
- Frozen emitter: first original focus (row 48, col 24), receiver at second (row 48, col 71); spatial Gaussian width 4.5 cells, 48 physical propagation directions; 350/345-step solver with original `C=.65, DT=.5, damping=.006`; focus on samples 245–344 (100 samples).
- **Two physical pings per record:** k=0.65 and k=1.30 rad/cell, both bearing 0°; equal discrete initial kinetic-plus-spatial-gradient energy = 1 for every packet, under each geometry. Same source hardware *abstraction* and same one-cell detector.
- **Parabolic arm** (never tuned): angular weights `exp[-5*k*(1-cos(theta))]`.
- **Fixed-width candidate family** (hyperparameter search on original ellipse only): q ∈ {0.45, 0.65, 0.90, 1.30, 1.80}. A single q must be used for **both** frequencies and every other geometric condition.
- Select q **only** by exact 8-bit noisy recognition accuracy on the original-ellipse validation wall codes; source-geometry tuning is an acknowledged adaptive reuse of those records, not an independent confirmation. If tied choose the numerically smallest q. Lock q before running stadium and rotated ellipse.
- Memory decoder: exact binary Möbius coefficients from **only** the empty configuration + all single-bit + all two-bit calibration states = 37 words per packet. All other 219 eight-bit wall words are held out during fitting. The complete 256-word oracle exists **only** for scoring. Same 37 calibration states, decoder, and 219 test words for all arms, all geometries.
- Noise level: `sigma = 2.0 * referenceRMS`, where referenceRMS is computed **only** from source-ellipse empty/single-wall reference traces, pooled over both k values and the two baseline source families (parabolic and q=0.9); frozen across all validation geometries and methods. Three paired seeded noise replicates per wall code, seed 20261027; Gaussian white detector noise matched by code, repetition, ping and sample between policies.
- Primary endpoint: proportion of 219 × 3 held-out noisy trials exactly decoding all 8 bits, **jointly using two frequencies**.
- Secondary descriptive endpoints: per-word paired win/loss counts, noiseless accuracy and relative forward-model prediction error. Report failures, ties, and differences across stadium and rotated ellipse separately. Cross-geometry superiority requires parabolic to beat *tuned fixed-width* on BOTH unseen geometries; otherwise reject that particular generalization claim.
- Single-frequency identity control: q=k must have exactly matching launch source and receiver traces in each geometry; one-frequency conclusions alone cannot demonstrate superiority.
- No retuning after seeing stadium/rotated outputs. Fixed candidate widths are not optimized independently by frequency and are not allowed to vary with geometry, but a more flexible per-frequency fixed-angle control can match the parabolic family by construction: therefore **no unconditional optimality claim** is possible.
- Numerical geometry mask, wall-sector assignment, launch-energy, source-in-domain, memory-fitting and paired-repeat tests are required before calling the result complete.

The original OpenAI result concerns free Euclidean waves. These reflecting, damped cavity simulations are inspired engineering probes and do not inherit a local-smoothing theorem.

Rerun: `node cross-geometry-benchmark.cjs` (longer GitHub Actions workflow). Once results exist they must be appended as a locked test receipt without changing this protocol.
