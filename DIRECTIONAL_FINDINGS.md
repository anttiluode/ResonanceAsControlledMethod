# Directional interrogation: physical parabolic vs fixed-angle launches

Research spike, 27 October 2026. This is an **engineering experiment inspired by** OpenAI's October 25 wave local-smoothing manuscript, not an application of its theorem to a reflecting cavity and not a discovery claim.

**[Run the live lab](https://anttiluode.github.io/ResonanceAsControlledMethod/directional.html)** · [Reproducible benchmark](directional-receipt.cjs) · [Source physics](directional-core.js) · [Guardrails/tests](directional-tests.cjs)

## The question

Does a physically launched wave packet with the angular scale of the new OpenAI manuscript reveal changes in eight persistent wall springs more reliably than a conventional fixed-angular-width packet at the **same** source energy, receiver, injected frequency, number of pings, acquisition window, and calibration budget?

The free Euclidean positive half-wave argument uses an angular directional multiplier

    H(k, delta) = exp[-rho * k * (1 - cos(delta))].

Our **parabolic** source gives 48 plane-wave directions those weights. Our **fixed-angle** control uses the same family but replaces \`k\` with reference \`k0 = 0.9\`. They match identically at \`k = k0\` (unit test). At the two actual frequencies, \`k = 0.65\` and \`k = 1.30\` rad/cell, the angular widths differ. Three bearings: −60°, 0°, +60°. Spatial Gaussian packet envelope width = 4.5 cells, \`rho = 5\`. A coherent sum of real traveling packet components is initialized with a displacement and a time derivative approximating forward propagation.

**Crucial non-transfer:** this is a **finite real incident field** shaped with the same angular formula, not literal complex-time continuation, an exact positive half-wave or a curvature/elliptic estimate transferred to bounded, damped Neumann/Robin wave dynamics.

## Physics and controls

- Exactly the eight persistent Robin wall-bit locations and the 96×96 ellipse used in Kavitaatio/ResonanceAsControlledMethod.
- One physical emitter at the first focus, one signed point receiver at the other focus. **No digital filtering of receiver traces; no access to the full simulated field for memory decoding.**
- Two equal 100-sample listening windows: 145–244 and 245–344. Both arms have the same respective deadline, not a different observation-time cost.
- Every angular packet is normalized so the **initial discrete kinetic-plus-gradient energy equals 1**. The extra wall-dependent Robin potential at injection is bounded by **1.88418×10⁻⁵** even if all eight patches are written; it is not exactly zero.
- Both designs use **48 angular components** per launched packet and the same Gaussian spatial localization. A physical transducer capable of synthesizing such fields is assumed, not engineered or costed.
- Same Gaussian noise standard deviation σ across arms, derived solely from empty/single-written-wall calibration records (median single-wall echo RMS over the packet bank).
- Same selected pings and **same calibration wall states** for both arms: the 37 subsets with zero/one/two written patches, or 93 subsets with at most three. These are fully measured in the simulator without calibration noise. All higher-weight words (219 or 163) are **unseen during fitting**.
- A *restricted binary Möbius model* is trained on a Map containing exactly and only those low-order responses. The full independent 256-state response table is computed **only as a scoring oracle**. All model comparisons decode via the same exhaustive nearest predicted word rule. This separation is tested and enforced in code.
- In paired noisy comparisons the hidden wall word, repetition index and random standard-normal samples match between arms; the actual physical waveforms differ.

## Numerical receipts (GitHub Actions)

The optional \`Reproduce full eight-bit directional benchmark\` workflow executes \`node directional-receipt.cjs\`. The physical truth oracle involves **256 × 6 × 2 = 3,072** finite-difference source-to-receiver simulations.

### Original 4%-noise test — no decoding advantage

| Setup | Parabolic | Fixed-angle |
|---|---:|---:|
| 37 calibrations × 6 packets, middle window; 219 unseen words | **219/219** | **219/219** |
| 93 calibrations × 6 packets, middle window; 163 unseen | **163/163** | **163/163** |
| 37 calibrations × 6 packets, early window; 219 unseen | **219/219** | **219/219** |

**The original experiment is saturated.** Full-oracle median nearest-distinct-word RMS / σ in the middle window was 34.15 for parabolic and 30.13 for fixed (37-calibration holdout). This is a *diagnostic* calculated from all 256 true codewords; it is **not** an efficient learned decoder or proof of better accuracy.

### Exploratory noise stress after observing the ceiling

37 noiseless calibration states, middle window, **219 unseen words × 3 detector-noise draws = 657 noisy trials** per design; all six packets unless otherwise stated:

| Detector noise as % of calibration single-wall RMS | Parabolic correct | Fixed correct |
|---|---:|---:|
| 50% | 657/657 (100%) | 657/657 (100%) |
| 200% | 656/657 (99.8%) | 654/657 (99.5%) |
| 500% | 648/657 (98.6%) | 638/657 (97.1%) |
| 1,000% | **575/657 (87.5%)** | 553/657 (84.2%) |

At **200% noise, with fewer probes**:

| Real physical pings / record | Parabolic correct | Fixed correct |
|---|---:|---:|
| One, low k=0.65, straight 0° | **500/657 (76.1%)** | 455/657 (69.3%) |
| One, high k=1.30, straight 0° | 113/657 (17.2%) | **135/657 (20.5%)** |
| Two, one low and one high at 0° | **482/657 (73.4%)** | 463/657 (70.5%) |

**The most informative finding is the sign reversal with frequency:** the parabolic packet wins the low-frequency one-ping control, and the conventional fixed-angle packet wins the high-frequency one-ping control. The six-ping advantage at extreme noise is smaller.

Importantly, these are **post-hoc exploratory stress conditions**, not pre-registered independent confirmation; the three repeated noise draws for a given wall word share the same underlying source/target and are not 657 independent geometries. No inferential p-value or universal ranking is claimed. Also, success percentages on the single-high-frequency channel remain low for **both** arms.

## What has and has not been established

**Measured within this fixed numerical model:**
- The angular shaping formula changes actual physical source fields and actual signed one-cell receiver signals; this is not a virtual full-field readout.
- The source is normalized to the same reference kinetic-plus-gradient wave energy and uses identical frequency/bearing/ping/sample costs; wall-dependent injection energy is tiny but nonzero and reported.
- Restricted low-order calibration can reconstruct unseen combinations, with strong dependence on noise, frequency and shot count.
- No original low-noise accuracy gain; exploratory wins under some high-noise conditions and a loss under another.

**Not established:** a theorem about memory from local smoothing, experimental neural plasticity, generalized memory capacity, truly physical emitter hardware, calibration with noisy measured responses, performance on other shapes/wall layouts, a significant result after multiplicity correction, or a practical learning device.

**Next decisive gate:** freeze one or more conditions from this exploratory sweep, then test a new held-out *cavity geometry*, altered wall compliance, source position and grid resolution against matched fixed-angle/standard Gaussian-beam baselines. Do not choose the winning condition again after seeing those results.

## Run

    node directional-tests.cjs
    node directional-receipt.cjs

For interactive visual comparison, open \`directional.html\` using any static HTTP server or the GitHub Pages link. The full truth table is computed in a Web Worker rather than sent to the web page; only validation statistics and an explicitly requested inspected waveform cross the boundary. A browser view of the whole wave is a diagnostic only.

OpenAI, *Local smoothing for the Euclidean wave equation* (October 25, 2026): https://github.com/openai/math/blob/main/preprints/Local-smoothing-for-the-Euclidean-wave-equation-October-25-2026/paper.pdf.
