# Atlas audit and refactoring — 2026-10-03

The shared viewer was corrected across all 12 deployed lecture datasets. The existing lecture content, source figures, MED45UQU/Aseel identity, guided tours, discovery labs, search and quizzes remain the basis of the application.

Baseline inspected: `27578ca19630ab9d0057a353da27b2a51355f4ba`. Old line numbers below refer to that baseline, not the refactored files. Corrected file locations refer to the source accompanying this report.

## Findings and fixes by source location

| Baseline location | Observable problem or failure path | Correction |
| --- | --- | --- |
| `public/app.js:173` | Teardown was registered only after every model finished loading. Navigation or an initialization failure before this point could leave in-flight decoding, observers and renderer resources alive. | `public/app.js:32` registers a lifetime before the first await. `public/lecture-runtime.js:68` aborts loading and runs idempotent cleanup. Both navigation and initialization failure release the scene, controls, annotations, feature listeners, caches and WebGL context. |
| `public/app.js:170` | The loader overwrote imported materials without disposing their textures/materials and did not validate duplicate names. Shared geometry could receive teaching colors intended for a different mesh. | `public/mesh-resources.js:27` validates the complete tree before mutation, preserves transforms and vertex positions, then gives each mesh owned geometry/materials once. Imported resources are disposed with deduplication. Duplicate scene names fail explicitly. |
| `public/app.js:170` | Loading could complete after a scene was abandoned. | `public/mesh-resources.js:57` cancels fetch, checks the lifetime after download, and disposes a decode that returns after cancellation. The decoded scene is owned by the main scene before material preparation. |
| `public/enhancements.js:7` | Muscles received a second material clone after the universal loader already replaced their materials. The replaced materials were abandoned. | Removed the second clone. Slider/pulse updates mutate only the material owned by that mesh. |
| `public/app.js:168` | The viewport ResizeObserver was created without a retained handle or disconnect path. | `public/app.js:172` owns and disconnects the observer; resize, orientation, fullscreen and pointer listeners share the abortable lifetime. |
| `public/app.js:194` | Query values were passed directly into navigation; loading/state rules were scattered between lecture flags and asset paths. | `public/lecture-runtime.js:1` whitelists lecture IDs and centralizes asset selection. Unknown IDs resolve to L4. `public/app.js:214` explicitly disposes the old scene before document navigation. Only the selected lecture creates a renderer. |
| `public/app.js:167` | A fixed maximum orbit distance applied to every lecture, regardless of limb/spine scale. | `public/app.js:185` derives zoom limits from the current lecture's combined bounds, with an optional dataset camera override. Camera presets use the current lesson and synchronize camera position and OrbitControls target. |
| `public/app.js:118–145`; `public/enhancements.js:14–19` | A search/quiz camera tween could remain active when a later tour step started its own camera transition. | `public/app.js:selectStep` cancels the enhancement animation first. Reduced-motion changes and button zoom mark the renderer dirty through the controls change event. |
| `public/app.js:48–66` | Mean positions across a vessel slice could fall into the empty space between branches. Bounds were based on sampled points. | `public/app.js:55–71` uses exact object bounds and selects a real surface vertex nearest the slice's mean. Fine named subregions still use the existing lecture-specific anchor definitions. |
| `public/app.js:72–95` | Anchors were stored only as world coordinates; special lecture layouts replaced positions with fixed card coordinates. Projection/leader lines mixed coordinate spaces and could leave an off-screen card visible. | `public/app.js:87` stores mesh-local anchors. `public/annotation-layout.js:12` projects through the current mesh/camera transforms and converts client coordinates into overlay CSS coordinates. `public/annotation-manager.js:24` updates dots and SVG endpoints together and rejects anchors behind the camera or outside the frustum. |
| `public/app.js:87–94`; lecture-specific card CSS | No shared obstacle-aware collision handling. Labels could cover each other, a source figure, camera buttons or the lesson rail. | `public/annotation-layout.js:36` packs rectangles with a 12px gap, reserving controls, source figures, the anatomical focus and pointer targets. On constrained screens, callouts page individually. Long cards scroll; extremely constrained layouts create reading space instead of overlapping. |
| `public/app.js:161`; fixed overlay positions | Canvas resizing alone did not account for asynchronously loaded source images, layout shifts, CSS scaling or orientation. | `public/annotation-manager.js:7–34` observes the overlay's obstacles and cards, handles orientation/fullscreen/scroll/visualViewport events, and sets an SVG viewBox in the same CSS coordinate system. Removed cards are unobserved. |
| Shared overlay styles | Floating text boxes intercepted orbit input; mixed-direction terms could wrap or clip unpredictably. | `public/audit-layout.css:1` establishes explicit stacking layers and `pointer-events: none` for passive overlays. Number buttons and scrollable cards remain interactive. Cards use `dir=auto`, `unicode-bidi: plaintext`, logical text alignment and wrapping. |
| `public/app.js:109`; `public/enhancements.js:25–31` | The general muscle opacity pass hid muscle relationships used to explain L4 artery parts/course. | L4 now explicitly declares the five relevant muscle-focus scenes: Scalenus anterior, Teres major, Pectoralis minor and Brachioradialis. These muscles default to 28% ghosting; manual opacity remains independent from the other layers. |
| `public/app.js:113–115` | The final lower/spine scope pass could undo an explicit layer-on choice. Context parents could also be hidden despite an annotation targeting them. | `public/layer-controls.js:7` applies lecture eligibility and owns independent enabled/opacity overrides. Final visibility filtering respects manual choices and includes step context. Explicit off/0% remains authoritative. Spine assets no longer reveal unrelated packed foot bones. |
| L4 annotation contexts; L9 `knee-overview` | Some fine-branch annotations referenced existing parent meshes omitted from their scene context. | Added the existing parent targets to L4 context and Femoral/Anterior tibial parents to L9 knee context. Synchronized L4's canonical `tour-source.json`; a parity check prevents regeneration from losing these corrections. No new medical facts were introduced. All annotations now pass the context/reference checks. |
| `public/app.js:177` | Quiz raycasting could hit translucent background bones before the answer target, especially in spine lectures. | `public/app.js:193` raycasts only the current question's selectable targets in quiz mode. Bones remain contextual unless they are themselves answers. |
| `public/enhancements.js:51–59` | Repeated functional questions with the same target used `.find(target)` to retrieve text, displaying the first question's explanation instead of the scheduled one. | `public/enhancements.js:50–58` retains the full question source object and uses its prompt/explanation. Added a regression with two prompts sharing one target. |
| `public/app.js:178` | The GPU redrew a static scene continuously while the student was reading. | `public/app.js:197` draws only on camera/material changes, damping or an active tween/pulse. Annotation endpoints remain responsive. |
| `public/index.html:15` | An existing localhost browser cache could display the old white-background logo despite the current PNG being transparent. | Versioned both branding image URLs so the supplied transparent assets refresh correctly. Verified visually after reload. |

## Projection and collision mathematics

An anchor is retained in the target mesh's local space. Each update computes:

```text
world = mesh.matrixWorld × localAnchor
NDC   = camera.projectionMatrix × camera.matrixWorldInverse × world
clientX = canvas.left + (NDC.x + 1) × canvas.width / 2
clientY = canvas.top  + (1 - NDC.y) × canvas.height / 2
overlayX = (clientX - overlay.left) × overlay.clientWidth  / overlay.width
overlayY = (clientY - overlay.top)  × overlay.clientHeight / overlay.height
```

Three.js `Vector3.project(camera)` performs the homogeneous divide. The camera-space near-plane test rejects points behind the camera before projection. Frustum limits reject clipped anchors. Device pixel ratio affects render resolution, never label position. A CSS-scaled canvas/overlay is handled by the final client-to-local ratios.

For each card, the layout engine considers peripheral candidate rectangles and rejects candidates intersecting another card, a control/source obstacle, a target dot or the central focus region. The leader begins at the nearest card edge and ends at the same coordinate as the numbered target. A changed camera projection updates endpoints every frame; quantized target positions trigger repacking without remeasuring text on every animation frame.

## Verification results

All 19 `check-*.mjs` suites and the static build passed. New audit checks exercise routing, lifetime cancellation, imported/shared resource ownership, invalid late mesh validation, transformed local anchors, CSS scaling, frustum rejection, safe rectangle packing, exact SVG endpoints, late source-image resizing and observer disposal. Existing interaction/lab/geometry regressions remain passing.

| Lecture | Teaching scenes |
| --- | ---: |
| 1 — Upper limb bones/joints | 63 |
| 2 — Shoulder/arm muscles | 76 |
| 3 — Forearm/hand muscles | 103 |
| 4 — Upper limb vessels | 65 |
| 5 — Upper limb nerves | 68 |
| 7 — Lower limb bones/joints | 70 |
| 8 — Lower limb muscles | 93 |
| 9 — Lower limb vessels | 51 |
| 10 — Lower limb nerves | 65 |
| 12 — Vertebral column/joints | 76 |
| 13 — Vertebral muscles | 36 |
| 14 — Spinal cord/nerves | 55 |
| **Total** | **821** |

The all-lecture audit validated 1,573 annotations, 80 configured functional questions and 28 unique GLB assets against the actual mesh names and hierarchy. Source/reference images exist for each configured scene. Duplicate names, invalid transforms, missing targets, invalid color/opacity references and broken configured source paths fail the build/checks.

Browser verification loaded/switched all 12 lectures successfully: one canvas, no duplicate DOM IDs, the correct first scene and visible default bone context. No console errors were reported in the final browser run. Interaction samples covered camera presets/reset/zoom, independent muscle opacity, quiz choice feedback/next/exit restoration, and callout paging.

Responsive samples used measured CSS viewports of 390×843, 487×1055, 1025×1475 and 1600×900. Dense L4 artery-part labels, L7 acetabulum labels and L12/L14 vertebra labels had no measured card/control collisions or horizontal overflow in these samples. The observed leader-to-dot endpoint discrepancy was below 0.22 CSS pixels, attributable to DOM/SVG rounding. Desktop screenshot: `../output/atlas-audit-desktop.jpg`.

## Scope and remaining limits

These checks verify code behavior, resource cleanup, dataset consistency and selected rendered views; they are not a clinical certification. Every configured scene was checked as data, but not every one of the 821 scenes was separately reviewed visually from every possible angle. Source vertex positions were preserved; finite/aligned transforms do not independently prove every anatomical attachment or boundary.

Fine landmarks, arterial divisions and colored bone subregions already modeled as educational approximations remain approximate. When a detail has no dedicated mesh, its annotation frames the explicitly configured related structure and the original lecture diagram provides the fine detail. Off-screen/behind-camera annotations deliberately hide until their anchor becomes visible. Extremely constrained views use paging/scrolling rather than guaranteeing that all labels are simultaneously visible.

The final source modules are `lecture-runtime.js`, `mesh-resources.js`, `annotation-layout.js`, `annotation-manager.js`, `layer-controls.js`, `enhancements.js` and `audit-layout.css`, integrated by `app.js` and `index.html`. New lecture work must pass the universal data/mesh checks and preserve these lifecycle and coordinate-space contracts.
