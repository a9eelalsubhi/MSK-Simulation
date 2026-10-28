# MSK Simulation — Aseel & MED45

**Live website:** https://a9eelalsubhi.github.io/MSK-Simulation/

Interactive MSK study atlas with 12 lecture datasets covering the upper limb, lower limb and vertebral column, including quizzes, reference slides and muscle-action illustrations.

GitHub Pages publishes the study interface automatically after a push to `main`. It has no server-side visitor database or owner analytics dashboard; those remain on the original Worker-hosted site.

## Run

Requires Node.js 22.13+. Run `npm ci` then `npm run dev` for the Worker project. For the static GitHub Pages artifact, run `node scripts/build-pages.mjs`; output is `.pages-dist/`.

The included hosting manifest declares local bindings only. No hosting identity, owner secret, visitor records or local sessions are included. Existing anatomical asset attribution and licenses remain in `public/models/ATTRIBUTION.txt` and the in-app credits. Supplied educational slides retain their original authorship.

Source snapshot: `8719b1a1d6ff3d931374e40d151112b0c8689259`.

---

# Upper Limb Atlas

Interactive educational anatomy viewer based on the user-supplied Upper Limb Vessels lecture (printed pages 41–51).

The app uses self-hosted Three.js r180 and CC BY-SA 4.0 Z-Anatomy meshes exported by Anatria3D. See public/models/ATTRIBUTION.txt. A 65-step visual tour replaces the question panel: anatomical callouts are anchored to mesh geometry, camera framing follows each step, and the 16 chapters cover the original 67 facts. Missing structures use explicitly marked source-page explanations. The three-part artery colors are illustrative projected subdivisions around the named muscle, not anatomically measured boundary annotations.

Build the static output with `python build.py`. Regenerate tour content with `python tour_content.py`; check annotation layout bounds with `node check-tour.mjs`. Serve `public/` for development or `dist/` for distribution. The build validates all step targets, 67 fact coverage, source images, GLB buffer bounds, DOM identifiers and module imports. Browser interaction and WebMCP runtime validation were not performed in this task.

The standard Sites scaffolder could not be used because automatic approval review rejected executing a downloaded package with broad profile read access. This app uses a dependency-free static build and locally hosted browser modules instead; no package-manager install scripts are run.

The optional document.modelContext tool is feature-detected. No account, API key, or persistence is required by the viewer itself. Hosting access is controlled by Sites.

## Unified lecture viewer
Lecture 4 is the default; `?lecture=1` selects the bones/joints lecture. The header uses document navigation, not multiple mounted renderers. Only the selected lecture data and its model systems are fetched. `pagehide` cancels animation, disposes OrbitControls, meshes/materials and renderer, and releases the WebGL context; BFCache restoration reloads the viewer.

L1 data: public/lectures/l1/tour.json, 63 steps, 16 teaching chapters and final explorer. Bone region colors are educational masks fitted to the supplied geometry, not a validated anatomical segmentation. Scapular border paths and clavicle masks were inspected against decoded production geometry. Muscle GLBs preserve source transforms; original lecture images identify fine attachment footprints. Muscle-focus steps reveal only related muscles. Carpal and joint context uses actual adjoining bones.

Reference checks (geometry and presentation, not additional study content):
- https://anatomyzone.com/upper-limb/pectoral-girdle-and-shoulder/scapula/
- https://anatomyzone.com/upper-limb/pectoral-girdle-and-shoulder/clavicle/
- https://anatomy.ttuhscep.edu/anatomytables/bones_upperlimb.html
- https://www.elsevier.com/products/complete-anatomy

Verification: build.py validates both lectures and model/source links. check-features.mjs and check-bones-features.mjs exercise controls/search/quiz logic for their respective datasets. Browser interaction testing was not performed.


## Lecture 2: shoulder and arm muscles
- Independently loaded at `?lecture=2`: 76 visual steps, 16 chapters and a full explorer.
- 26 muscle/fiber O/I/N/A profiles, 13 original annotated source pages (printed 13–25).
- Shared native L1 muscle geometry preserves anatomical transforms. Colors identify muscles, not measured attachment areas. No fabricated ligament or space geometry.
- Memory lab: hide/reveal each O/I/N/A field. Abduction stage slider links 0–18, 18–90 and >90 degree lecture stages; it does not animate or simulate joint biomechanics.
- Lecture-specific roots are retained. C3/C4 trapezius sensation is not called cranial nerves; brachioradialis is described as grouped on the source page, not classified as an anterior arm compartment muscle.
- Study data remain lecture-based. Presentation research: AnatomyZone rotator cuff tutorial https://www.youtube.com/watch?v=RaIt79pPfgE and Elsevier Complete Anatomy https://www.elsevier.com/products/complete-anatomy . No external atlas imagery was copied.
- Verification: build.py validates all mesh references and source pages; check-muscles-features.mjs exercises shared controls, search, quiz and muscle opacity scope. L1/L4 regression checks passed. Browser interaction/visual QA was not performed.

## Lecture 3: forearm and hand
- Same site, `?lecture=3`: 103 steps across 18 topics plus complete explorer. Includes 30 muscle/group profiles and all 15 annotated pages (printed 26–40).
- New discovery lab: five layer-reveal views with optional faint overlying contours; 23 source-derived action teams; muscle/layer/nerve color modes; insertion matching challenges.
- Insertion comparisons link bone and muscle colors: FDS/FDP, APL/EPB/EPL, ECRL/ECRB. Whole bones show destinations, not measured attachment footprints.
- Original Z-Anatomy/BodyParts3D transforms preserved in lecture-specific muscular.glb; added hand groups, forearm muscles and wrist retinacula. Native mesh colors are teaching overlays. Palmaris brevis has no independent mesh and uses the original lecture figure explicitly.
- Mixed supply (FDP and lumbricals) uses a distinct category rather than fictitious territorial subdivision. Four palmar interossei, FPB and supinator/ECRB nerve summaries follow the lecture; no outside roots/clinical additions introduced.
- Presentation research: https://anatomyzone.com/upper-limb/forearm/muscles-of-the-forearm/ and AnatomyZone posterior tutorial https://www.youtube.com/watch?v=7F4dHDwwvhQ . Original lecture graphics retained; no external atlas artwork copied.
- Build validates all lecture pages and actual GLB names. check-forearm-features.mjs tests camera/search/quiz and layer ghosting; check-forearm-lab.mjs tests color links, layer and action navigation, insertion challenge and cleanup. L1, L2 and L4 regressions passed. No browser UI interaction test was performed.

## Independent body-layer controls
All four lectures provide visible Arteries, Veins, Bones, Muscles and Nerves switches, each with a 0–100% opacity range. Removed the shared context slider. Untouched layers retain tour defaults; explicit layer and opacity overrides persist through chapter/explorer navigation, and are respected for selected meshes. An enabled layer displays its loaded meshes (subject to isolate). Zero opacity hides the layer without changing the switch preference; changing opacity does not enable an off switch. Quiz keeps its controlled scene and restores user overrides on exit. L1 now loads cardiovascular and nervous assets too so all five controls are usable. check-layer-controls.mjs covers each layer, independent percentages, off/zero/100%, navigation, isolation, and quiz bypass.

## Lecture 5: upper limb nerves
- Same atlas at `?lecture=5`: 68 steps, 15 chapters plus explorer, 6 nerve profiles, 11 injury comparisons, all 13 original pages (printed 52–64).
- Nerve discovery lab links origin/course/motor/sensory views. Accessible modal tools: plexus topology circuit, simplified right-hand palmar/dorsal sensory map, and two-column injury-level comparisons.
- Dedicated 55-node nerve asset preserves original Z-Anatomy/BodyParts3D transforms. Muscles reused from lecture 3. Lateral/medial cords have no independent mesh: source divisions or named nerves frame the region and labels explicitly identify the limitation.
- Source anatomical boundaries and postures remain available as original lecture diagrams. The hand schematic is not a measured skin/dermatome model. Circuit highlights parent-cord connectivity, not exclusive fiber/root proportions. No deformation or physiological simulation is claimed.
- Ulnar C7 contribution and simplified source injury tables remain identified as lecture statements. Main radial injury table is a broad summary; do not infer all deficits at every shaft lesion. Source also lists ECRL under main radial branches; deep-branch summary points students to that distinction.
- Presentation research: AnatomyZone brachial plexus tutorial https://anatomyzone.com/upper-limb/nerves/brachial-plexus/ . No external figures copied.
- Automated checks: all GLB/step/source references; nerve identity/case quiz and shared camera/search controls; plexus graph, sensory surface switch, injury comparison/navigation/disposal; five-layer controls and forearm regression. No browser interaction QA performed. No local preview server restarted (user asked to stop it).
