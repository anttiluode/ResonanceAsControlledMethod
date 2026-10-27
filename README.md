# Resonance as a Controlled Method

**From a beautiful focus to an interrogation of persistent matter.**

Live static laboratory: **https://anttiluode.github.io/ResonanceAsControlledMethod/**

This is a small experimental instrument building on [Kavitaatio](https://github.com/anttiluode/Kavitaatio), [WallMemoryLaw](https://github.com/anttiluode/WallMemoryLaw), the broader wave-cavity and neural-ping explorations, and the October 2026 wave-analysis discussion. It is *not* a demonstration of learning neurons, a new theorem, or a solver for OpenAI's local-smoothing result.

## Independent validation update: source-tuned fixed-width control wins (27 October 2026)

**[Open the independent cross-geometry validation](https://anttiluode.github.io/ResonanceAsControlledMethod/validation.html)** · [Frozen-before-testing protocol](CROSS_GEOMETRY_PROTOCOL.md) · [Unaltered primary results and limitations](INDEPENDENT_VALIDATION_FINDINGS.md) · [Machine-readable receipt](cross-geometry-results.json).

This follow-up fixes an important weakness in the directional comparison below. A single-frequency fixed-width beam with q=k is mathematically **identical** to the parabolic beam at that frequency; wins over the arbitrary original fixed q=0.9 cannot establish an inherent frequency-scaling advantage.

We froze two frequencies (0.65, 1.30), two equal-energy real incident pings, one signed receiver, 37 exact low-order wall calibration records, all 219 higher-weight wall words for held-out scoring, 100 receiver samples each and a shared detector noise rule. On the **original ellipse only**, five fixed-width q values were scored and q=0.45 was selected as the best candidate (510/657 correct vs 367/657 for the old arbitrary q=0.9). That q was locked *before evaluating two unfamiliar cavities*: a stadium and a 25° rotated ellipse.

| Unseen geometry | Parabolic (657 noisy trials) | Tuned fixed width |
|---|---:|---:|
| Stadium | 336/657 = **51.1%** | **465/657 = 70.8%** |
| Rotated ellipse | 228/657 = **34.7%** | **277/657 = 42.2%** |

**The generalization claim failed in both new shapes.** The fixed-angle control wins when tuned fairly on the original geometry. This does not contradict the OpenAI free-Euclidean local-smoothing theorem, which is not a theorem about bounded damped inverse memory decoding.

The q=0.45 choice is at the edge of the finite candidate grid; it is a coarse source-tuned baseline, not a proof of globally optimal source design. These are numerical experiments on two selected unseen geometries, not hardware tests or universal conclusions. We retain the earlier positive exploratory observations below as history but do not treat them as independently confirmed advantages.

---

## New: the physical directional interrogation challenge (October 27, 2026)

**[Open the parabolic-vs-fixed wave laboratory](https://anttiluode.github.io/ResonanceAsControlledMethod/directional.html)** · [Detailed numerical receipt, limitations and reproduction](DIRECTIONAL_FINDINGS.md).

This is the direct engineering test connecting the October 25 OpenAI wave paper to eight-bit wall memory: instead of filtering a computed field after receiving it, **physically launch** coherent wave packets with the paper's frequency-dependent angular multiplier. Compare conventional fixed-angular-width packets at identical initial energy, packet frequencies, bearings, one-point receiver, listening window, observation budget and low-order calibration cost.

**First decisive controls:** both arms decode all 219 unseen wall words at ordinary 4% noise using 37 calibration states and six pings. **No advantage there.** In exploratory stress conditions, the result depends on frequency: with one physical straight-ahead low-frequency ping and 200% detector noise, parabolic scores **500/657 (76.1%)** against fixed-angle **455/657 (69.3%)**; with a high-frequency ping the sign flips, **113/657 (17.2%)** vs **135/657 (20.5%)**. These are repeated noise draws over 219 wall words in one synthetic cavity, not independently validated discovery claims. The formal wave theorem does not extend automatically to this reflecting and damped medium.

The browser lets you vary stress noise and physical pings. A 3,072-simulation reference benchmark with reproducible source physics is available in GitHub Actions and \`directional-receipt.cjs\`.

---

## New: eight-bit causal calibration laboratory (October 27, 2026)

**[Open the 8-bit experiment](https://anttiluode.github.io/ResonanceAsControlledMethod/geometry.html).** The [original four-bit live interrogation page](https://anttiluode.github.io/ResonanceAsControlledMethod/) remains intact.

This follow-up directly tests the difficult next question from Kavitaatio and WallMemoryLaw: *can we select which material interactions to calibrate using geometry and an observation deadline, instead of measuring all \(2^K\) wall settings?*

The new \`geometry-core.js\` implements **eight permanent wall bits / 256 possible records**, with the original 96×96 discretized wave physics. Its 256 × 3 complete forward runs are generated **only as an expensive independent scoring oracle**, not a set of available calibration examples. A candidate forward model receives a \`Map\` containing **only selected measured wall settings** and performs exact Boolean Möbius inversion on those; uncalibrated coefficients are zero. Every other word is predicted by the zeta transform.

Two matched-budget calibrators:
1. **Causal geometry-first:** choose a downward-closed set of interactions prioritized by estimated earliest shortest source → all changed patches → receiver tours.
2. **Degree-first control:** choose the same number of downward-closed, causally eligible subsets ordered by interaction degree, breaking ties by earliest estimated tour.

Both include the unwritten wall and all eight single-wall settings. A 40-step *heuristic* arrival margin and six sampled points per wall patch decide causal eligibility. Neither selection policy uses measured held-out waveforms to choose coefficients. Decoding uses one or three real excitation sites, one fixed receiver, exactly 100 samples per source and equal noise. The two models are scored on the **common set of words calibrated by neither strategy**, avoiding test-set mismatch.

### Initial test receipt

From CI \`node geometry-tests.cjs\`, seed 27, requested budget **65 states per source**, three source positions, Gaussian detector noise 4% of the single-wall reference, one noisy repetition per unseen memory:

| Window | Actual calibration budget | Common holdout | Geometry noiseless exact | Degree-first noiseless exact | Geometry noisy accuracy | Degree-first noisy accuracy |
|---|---:|---:|---:|---:|---:|---:|
| Early 145–244 | 60 | 196 | 196/196 | 196/196 | 100% | 100% |
| Middle 245–344 | 65 | 184 | 131/184 | 148/184 | 71.2% | 80.4% |
| Late 345–444 | 65 | 184 | 2/184 | 1/184 | 1.1% | 0.5% |

**Interpretation:** the geometrically chosen low-interaction model worked at the early deadline. At the middle deadline, geometry-first **lost** to the degree-first control. At the latest deadline, **both collapsed** because higher-order material scattering entered the observation window. The same physical memory became harder to predict from a truncated calibration as the listening history grew. Longer listening does not automatically improve predictive reconstruction.

These are exploratory tests in one numerical model, **not a general theorem, statistically established superiority, or a physical device**. The early perfect score does not demonstrate a novel algorithm; it is consistent with finite-speed scattering suppressing higher-order interactions during short observation. At the extreme late-window floor, comparing exact percentages is uninformative. This test also holds the total number of acquired traces fixed by strategy, but does not charge the additional physical waiting time for late measurements.

### Reproduce

    node --check geometry-core.js
    node --check geometry-worker.js
    node --check geometry-ui.js
    node geometry-tests.cjs

The Node test verifies identity with the original cavity on overlapping wall words, causal tour monotonicity, downward-closed calibration sets, exact Möbius/zeta algebra, exact fit to calibrated cases, no use of held-out data in fitting, and independent decoding of 256-state simulated truth.

**Next unresolved design challenge:** geometry can predict interaction *arrival*, but the magnitudes of interactions and their importance for distinguishing candidate memories depend on the actual wave physics. Find a physically measurable, calibration-cheap predictor of **which interactions have discriminative value** without consulting withheld wall records. Then test it on larger K and unfamiliar geometries.

---

## The question

An exciting echo is not evidence of a memory. A **stored memory** in this experiment is a persistent change of the wall; a **read** is the pressure trace measured after we ping the cavity. We test whether deliberate selection of **where and when to listen** helps identify the record through a fixed, minimal physical port.

The interactive site contains a deterministic 96×96 wave solver, the same reference ellipse and parameters as Kavitaatio:

| Parameter | Setting |
|---|---|
| Ellipse semi-axes | 36 × 27 cells, center 47.5 |
| Wave speed / time step | 0.65 / 0.5 |
| Damping | 0.006 |
| Unwritten wall | discrete Neumann (missing faces have zero flux) |
| Written wall | Robin spring κ = 0.28 per exposed face |
| Material bits | four writable patches at 8-sector indices 0, 2, 4, 6 |
| Source positions | (48,24), (56,24), (40,24) as row/column |
| One fixed receiver | (48,71) |
| Simulation | 350 updates; full-wave field is a visualization only |
| Measured windows | early: steps 145–244; late: 245–344, 100 signed samples each |

We pre-calibrate **all 16 wall words** from **three physical sources**. Six actions = three source positions × two disjoint 100-sample windows; each action uses one physical excitation, one fixed receiving cell, and a selected observation deadline/window. The six actions have equal trace/sample budgets, but **not equal elapsed listening time**. Later observations cost a longer wait, and the demonstration deliberately discards samples outside the selected window. The listener never gets the full wave field as data. An unobserved waveform from the simulation is used solely as a candidate template.

This experiment intentionally **does not** claim efficient calibration: preparing its full dictionary requires 16 × 3 = 48 forward simulations. It does not predict wall combinations absent from calibration.

## Use it

1. Wait for the 48 physical forward simulations to finish in the Web Worker. No server or package install is needed.
2. Toggle the wall bits and **Send ping**. The page shows the actual simulated field, signed receiver trace and its posterior over 16 wall words.
3. Click **New blind record**. The true wall and complete wave field are concealed; all the inference algorithm receives is the one-cell sampled echo.
4. Select a source and an equal-length listening window, or click **Choose informative ping**, which selects an action based on the current candidate probabilities and their expected pairwise separation.
5. Observe posterior updates; click **Reveal** after any number of pings to check your guess.
6. Run the **equal-shot comparison** under several noise fractions and shot budgets. Every strategy gets the same hidden test records and paired Gaussian noise streams in the deterministic benchmark.

The benchmark has four methods:
- **Adaptive:** current posterior-weighted squared separation of all predicted 100-sample traces; this is a heuristic, not optimal Bayesian experimental design.
- **Fixed:** always excite the focal source and listen late.
- **Cycle:** cycle through the three source positions, always listening late.
- **Uniform random:** randomly choose one of six source/window actions.

Every observation is independent Gaussian noise per sample (standard deviation = adjustable fraction of median single-wall late-echo RMS of the focal-source reference). Full candidate templates are fixed before the trial; noisy measurements are new. All methods use the same test words and matching noise sequences (matched by trial, shot and sample). The random action-choice stream is separate. Exact-word and average-bit accuracy are reported with seed 20261027.

**Reading the result correctly:** adaptive should not be proclaimed better when strategies tie, when confidence is saturated at near-zero noise, or when a small advantage is within noise. The proper result is conditional on this geometry, four fixed wall cells, selected time windows, noise, pings and 16-word prior. Expand trials/seeds before claiming a robust advantage.

## First numerical receipt (reproducible, not a general claim)

GitHub Actions \`tests.cjs\`, seed 20261027, **128 paired trials**, two pings per trial, detector noise at **160%** of the single-wall reference RMS:

| Selection policy | Exactly decoded words |
|---|---:|
| Adaptive posterior separation | 100/128 = **78.1%** |
| Cycle across three late sources | 93/128 = **72.7%** |
| Fixed focal source, late | 75/128 = **58.6%** |
| Uniformly random action | 88/128 = **68.8%** |

Exact two-sided paired-discordance tests, adaptive vs cycle **p = 0.349**; vs fixed **p = 0.00035**; vs random **p = 0.081**. These are exploratory tests of *this noise setting and these repeated trial words*, not pre-registered multiplicity-adjusted evidence for a generally superior interrogation policy. In particular **adaptive did not convincingly beat cycling or random choice**. At 40% noise, with 32 trials and two pings, adaptive, cycle and random all reached 32/32, demonstrating a low-noise performance ceiling.

The page lets you repeat this with different noise and shot budgets, see failure cases, and update posteriors manually. The comparison equalizes receiver sample count and number of pings, but **does not charge additional elapsed time** for a late window. That is a separate resource still needing control.

## Mathematics

For fixed wall word \(w\), the discretized wave update at an interior site is

\[
u_{t+1}=\frac{2u_t-(1-\gamma\Delta t/2)u_{t-1}+(c\Delta t)^2[L_Nu_t-\kappa_w(x)u_t]}{1+\gamma\Delta t/2},
\]

where \(L_N\) is the discrete Neumann spatial graph Laplacian. A wall word changes \(\kappa_w\) in fixed boundary cells. For each fixed word the evolution is linear in the displacement. But the waveform is **not additive in the wall bits** because propagation visits changed patches repeatedly.

The receiver model for action \(a\) and unknown word \(w\) is

\[
z = y_{w,a}+\eta,\qquad \eta\sim \mathcal N(0,\sigma^2 I_{100}).
\]

Bayesian updating uses Gaussian likelihoods and a uniform 16-word prior. The adaptive action is chosen to maximize

\[
S(a)=\frac{1}{2\cdot 100\,\sigma^2}\sum_{i<j}p_i p_j\|y_{i,a}-y_{j,a}\|_2^2.
\]

This is an interpretable **posterior-weighted separation heuristic**. It is not necessarily the action that maximizes exact expected information gain, minimizes error, or balances write cost.

## Reproduction / tests

No third-party runtime dependencies. Node 22 for development checks:

    node --check core.js
    node --check worker.js
    node --check app.js
    node tests.cjs

GitHub Actions runs the checks automatically. The existing \`static.yml\` publishes the repository as GitHub Pages. The implementation isolates numerical physics in \`core.js\`, batch simulation in \`worker.js\`, and presentation in \`app.js\`.

## What is established, unknown, and killed

**Established inside this model:** persistent externally imposed Robin parameters; finite-speed wave excitation and single-cell waveform readout; deterministic numerical reproduction of the same wall's response; measurable non-additivity of combined wall changes; an exactly calibrated finite codebook; a fair simulation of competing probe policies.

**Still unknown:** whether adaptive interrogation offers a robust improvement over the best fixed policy at useful budgets; whether geometry-selected *sparse* calibration improves substantially over all low-order configurations; whether one can physically **learn/write** stable wall memory from exposure without an external write controller; and whether moving beyond the 16-word closed dictionary is feasible.

**Claims we explicitly reject:** that an unusually strong focus alone proves stored memory; that virtual full-field Fourier filters count as measurements from one receiver; that OpenAI's free-Euclidean local-smoothing theorem proves the bounded-cavity result; or that an existing active-sensing method becomes new mathematics when applied to an ellipse.

## Provenance

- [Kavitaatio](https://github.com/anttiluode/Kavitaatio): the original 96×96 wave solver and eight-wall studies, including failed additive multi-bit decoding.
- [WallMemoryLaw](https://github.com/anttiluode/WallMemoryLaw): temporal causal-tour interaction hypothesis and the K=16 pre-registration.
- [Kavitaatio K16 investigation](https://github.com/anttiluode/Kavitaatio/pull/4): shows that a fixed low-order interaction cutoff can fail as wall patches become smaller.
- [OpenAI, Local smoothing for the Euclidean wave equation (25 Oct 2026)](https://github.com/openai/math/tree/main/preprints/Local-smoothing-for-the-Euclidean-wave-equation-October-25-2026): an external inspiration for direction-sensitive coherent interrogation, *not* a source of the cavity's claims.
- Prior art includes wave billiards, inverse boundary problems, scattering tomography, phase-sensitive detection and active experimental design.

Released as a reproducible scientific question, not an announcement of a scientific breakthrough.
