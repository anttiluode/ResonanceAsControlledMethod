# Resonance as a Controlled Method

**From a beautiful focus to an interrogation of persistent matter.**

Live static laboratory: **https://anttiluode.github.io/ResonanceAsControlledMethod/**

This is a small experimental instrument building on [Kavitaatio](https://github.com/anttiluode/Kavitaatio), [WallMemoryLaw](https://github.com/anttiluode/WallMemoryLaw), the broader wave-cavity and neural-ping explorations, and the October 2026 wave-analysis discussion. It is *not* a demonstration of learning neurons, a new theorem, or a solver for OpenAI's local-smoothing result.

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

We pre-calibrate **all 16 wall words** from **three physical sources**. Six actions = three source positions × two disjoint 100-sample windows; each action uses one physical excitation, one fixed receiving cell, and a selected observation deadline/window. The listener never gets the full wave field as data. An unobserved waveform from the simulation is used solely as a candidate template.

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
