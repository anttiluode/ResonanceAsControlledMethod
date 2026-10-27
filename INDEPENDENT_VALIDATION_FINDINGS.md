# Independent cross-geometry validation — fixed-source protocol, negative result

Date: 27 October 2026

**Outcome: the original generalization hypothesis failed.** When the conventional fixed-angle source was tuned on the **original ellipse alone** and that tuning was frozen before evaluating novel boundaries, the tuned fixed-width arm beat the parabolic frequency-dependent arm on **both** unseen cavity shapes.

This is not a negative result about OpenAI's 2026 local-smoothing theorem. It is a negative result about one physical wave-source design inspired by a directional multiplier in that manuscript.

[Interactive report](https://anttiluode.github.io/ResonanceAsControlledMethod/validation.html) · [Protocol locked before running](CROSS_GEOMETRY_PROTOCOL.md) · [Numerical output JSON](cross-geometry-results.json) · [Reproduction code](cross-geometry-benchmark.cjs) · [GitHub Actions run](https://github.com/anttiluode/ResonanceAsControlledMethod/actions/runs/40486229919)

## 1. The necessary control that our earlier demonstration lacked

The parabolic emitter used angular weights

\[
H_{p}(k,\theta)=\exp[-5 k(1-\cos\theta)].
\]

The original conventional fixed-angle source was

\[
H_{f}(q,\theta)=\exp[-5 q(1-\cos\theta)]
\]

with **arbitrary** \(q=0.9\).

At **any single frequency** \(k\), choosing fixed \(q=k\) yields **identical angular weights, real packet initialization and one-cell receiver traces**. Therefore a win at a single frequency over \(q=0.9\) is not evidence that parabolic frequency scaling offers any intrinsic advantage.

The locked benchmark uses **two physical pings at distinct frequencies** \(k=0.65\) and \(1.30\) rad/cell (both straight-ahead), with a single fixed q that must serve both. The parabolic source changes its angular width between pings. No post-hoc FFT of the receiver is used.

## 2. What was fixed before any new-geometry evaluation

- Original physical dynamics: 96 × 96 finite-difference wave field, c=0.65, dt=0.5, damping=0.006, eight persistent Robin wall sectors, stiffness 0.28 per missing neighbor face and Neumann zero-flux elsewhere.
- Incident packet: 48 coherent plane-wave directions, 4.5-cell Gaussian envelope, angular \(\rho=5\), launcher at original first focus (row 48, column 24); signed point receiver at second focus (row 48, column 71).
- **Both packets normalized to initial discrete kinetic-plus-spatial-gradient energy E=1**. The extra spring energy at launch is small but nonzero: max across all written sectors of about 0.0000128 for stadium and 0.000528 for the rotated ellipse, compared with E=1.
- Both receiver traces: exactly 100 signed samples, simulation steps 245–344; one real physical emitter and one receiver.
- Model training: 37 exact, noise-free calibration material settings (empty, eight singles, 28 pairs). All other 219 eight-bit wall patterns withheld from fit.
- Noise: absolute Gaussian standard deviation \(\sigma=0.015866461573009864\), derived only from empty and single-wall **source ellipse** calibrations. Same sigma on new geometries and across arms.
- Each of 219 held-out words scored with 3 paired Gaussian detector samples (657 correlated test trials), seed 20261027.
- The same Boolean Möbius degree-2 reconstruction and exhaustive nearest-template decoder is used in both arms. The full 256-state forward model is a diagnostic scoring oracle, **never provided to the restricted fit**.
- Two entirely new geometries, selected in the committed protocol: (A) horizontal stadium with 9-cell straight half-length and 27-cell circular end caps; (B) ellipse with the original semiaxes rotated +25° without relocating source/receiver.

## 3. Source-only baseline tuning

The fixed-width candidate values were **{0.45, 0.65, 0.90, 1.30, 1.80}**. Before evaluating either new geometry, each candidate was trained and evaluated **only on original-ellipse responses**. Selection used exact noisy eight-bit recognition accuracy on the original ellipse's 219 higher-order wall records, 3 noise draws each; tie break by smaller q.

| Fixed q (shared across both frequencies) | Original ellipse correct out of 657 |
|---|---:|
| **0.45 — selected** | **510 / 657 (77.6%)** |
| 0.65 | 442 / 657 (67.3%) |
| 0.90 (previous arbitrary control) | 367 / 657 (55.9%) |
| 1.30 | 290 / 657 (44.1%) |
| 1.80 | 239 / 657 (36.4%) |

**Caveat:** the winner is at the minimum of the candidate grid. This is a **coarse discrete hyperparameter search, not mathematical optimization** over all real widths. The source ellipse tuning scores are adaptive tuning data, not independent validation. The chosen q was frozen before running the stadium/rotated benchmarks. A wider family of fixed baselines could in principle improve conventional results further.

## 4. Locked unseen-shape results

Primary endpoint: noisy exact eight-bit word recognition, 37 material calibrations, 2 equal-energy physical pings, 219 independently held-out wall words × 3 noise replicates.

| Unseen shape | Parabolic | Tuned fixed width q=0.45 | Advantage |
|---|---:|---:|---|
| Horizontal stadium | 336/657 **51.1%** | 465/657 **70.8%** | **Fixed +19.6 percentage points** |
| Rotated ellipse +25° | 228/657 **34.7%** | 277/657 **42.2%** | **Fixed +7.5 percentage points** |

Paired outcomes (same word, noise draw, and time sample): stadium had **8** cases correct only under parabolic and **137** correct only under tuned fixed; rotated ellipse had **9** parabolic-only and **58** fixed-only cases. These are substantial directional differences **within the specific numerical experiment**, but do not imply performance on independent physical hardware, broader geometry families, or independently sampled wall landscapes.

Noiseless degree-2 model recognition also differed:

| Unseen shape | Parabolic noiseless | Tuned fixed noiseless |
|---|---:|---:|
| Stadium | 179 / 219 | 187 / 219 |
| Rotated ellipse | 89 / 219 | 99 / 219 |

Median *relative waveform prediction error* shows a useful caution: on the stadium, parabolic had **smaller** median model error (0.0237 vs fixed 0.0306) while still decoding **less accurately**. Lower waveform reconstruction error is not the same thing as more reliable discrimination between wall words.

The source and receiver remained inside both new shapes; all 8 wall sectors had boundary faces. The rotated new shape altered the geometry and moved the cavity's natural foci relative to the fixed hardware. This was deliberate: source/receiver placements were frozen as part of transfer validation.

The actual numerical receipt is committed as \`cross-geometry-results.json\`. The corresponding independent GitHub Actions regression and benchmark run completed successfully.

## 5. Interpretation

**Result:** the parabolic source did not outperform a fairly tuned single-width fixed-angle source on either of two unfamiliar cavities. The narrow **cross-geometry superiority hypothesis fails**.

The earlier positive results compared parabolic scaling with one arbitrarily set width 0.9 at particular frequency/noise settings. They should no longer be described as a robust parabolic advantage. The coherent angular construction remains physically meaningful and can alter the information available at a point detector, but **the useful choice of incident wave depends on cavity shape and on the actual inverse decoder's error structure**.

This is not an experimental refutation of local smoothing; that mathematical theorem concerns freely propagating Euclidean waves, not noisy physical memory discrimination by repeatedly reflected waves in a bounded cavity.

**Remaining useful directions:** independent geometry families, true physical source synthesis, calibrated noisy training, measurement energy accounting that includes the wall spring energy, more sophisticated matched source baselines, and a separate mechanism for experience-dependent persistent wall writing. No changes to this frozen test are needed to keep the negative result valid.
