Muscle action & function — upper and lower limbs
===================================

The existing atlas now has a dedicated action browser in Lectures 2, 3, 7, 8, 9 and
10. The compact panel contains a lecture-specific region filter, English/Arabic/alias muscle search,
a muscle chooser, joint-action chooser, Play/Pause and the selected 3D muscle
with skeletal context. Whole muscle / Joint close-up / Front / Back / Side
controls and a synchronized Movement phase scrubber were restored at the
user's request. Closing resumes the exact current tour step.
Existing manual layer/opacity preferences remain authoritative.

Data contract
-------------

`public/lectures/lower-limb/muscle-actions.json` is the shared catalog (52
functional muscle/head/part records). Lecture-local `muscles` bind those records
only to the meshes present in that lecture: L7 has 20 records/21 muscle meshes;
L9 and L10 each have 52 records/54 muscle meshes. L8 has the same 52 records,
54 muscle meshes and the original EDL four-toe tendon as an associated mesh.
Bursa, fascia, retinacula,
tracts and ligaments are excluded from contractile muscle records.

Each entry contains `muscle_id`, bilingual names, `mesh_names`, the original
Lecture 8 action and slide reference, and `action_section`. `action_details` is
an equivalent compatibility alias for the requested terminology. Both objects
must match; runtime and build validation reject discrepancies. L8 legacy
`muscleProfiles` also expose the standardized fields without changing OINA.

Lecture 8 EDL clarification (2026-10-05)
--------------------------------------

`l8_edl.py` copies the exact existing atlas tendon from the L1 muscular asset
into the L8 muscular asset. Draco bytes, accessors and source world transform
are unchanged. The two mesh components stay associated in tour, explorer and
action selection. A second tour callout explains the four slips to toes 2–5;
the close-up camera shows the foot dorsum. Playback distinguishes red belly
and gold tendon. The common ankle stem and leg belly stay fixed for toe-only
extension; separate distal slips follow their own digits, with a short joint
blend bounded by each slip's actual source extent. Ankle actions move the
distal tendon with the foot. The original shape/normals restore exactly on exit.

This association and preferred camera apply only to L8. Other lecture data and
action behavior retain their previous bindings. Cache-versioned model loading
prevents an old L8 model without this tendon remaining in a visitor's cache.
The source asset remains static anatomy; movement remains illustrative.
The action tests verify four digit attachments, fixed ankle stem, source
compressed topology, lecture isolation and exact pose restoration.

Each action carries a joint ID, joint/movement names in both languages, its
description, plane, direct/indirect status, and digit/position constraints when
relevant. Primary and assisting actions are separate. Synergist/antagonist
examples are explicitly inferred from shared joint actions and overlapping toe
targets, rather than presented as universal pairings. These examples remain in the data schema, but are omitted from the compact
playback UI to avoid distracting from the movement.

Source verification
-------------------

References accessed 3 October 2026:

- UAMS College of Medicine: lower limb muscle table.
- Loyola Stritch School of Medicine: lower extremity muscle table.
- McGraw Hill, The Big Picture: Gross Anatomy, Chapters 35 and 36.
- Elsevier Complete Anatomy: EDB, EHB and quadratus plantae articles.

Full source links are embedded by reference ID. Source/accuracy information
is available in the atlas Sources & model accuracy dialog rather than filling
the action panel. Original lecture wording is preserved in the tour and data. The
published Complete Anatomy articles themselves cite Gray's Anatomy; this
implementation does not claim direct access to the Gray/Moore/Netter books.
Arabic names are interface translations of the English structures.

Notable distinctions: rectus femoris versus vasti; long versus short biceps
head; gastrocnemius versus soleus; different actions/innervation of adductor
magnus parts; hallux MTP versus its single IP joint; FDB versus FDL; EDB toes
2–4 versus separately modeled EHB; lumbrical MTP flexion/IP extension;
inversion/eversion at hindfoot joints versus dorsiflexion/plantarflexion at the
talocrural joint. Quadratus plantae assists via the FDL tendon, not a directly
crossed toe joint. Popliteus identifies free-tibia versus fixed-foot unlocking.

Real 3D playback
----------------

The corrected action panel contains the existing WebGL canvas. Select a muscle
and press Play. The real bone meshes articulate and the selected muscle vertex
buffers deform while keeping fixed-segment attachments in place and following
the moving distal attachment. Play/Pause, direct orbit/zoom, the five camera buttons and the Movement phase
scrubber remain available; changing the action resets its pose. Scrubbing
pauses playback; pausing retains the current phase. Empty searches pause,
disable the controls and hide the previous muscle until results return. No
extra action, nerve or relationship cards appear.

The GLBs themselves are static. `muscle-motion-rig.js` creates a runtime
AnimationClip / AnimationMixer driver, estimated anatomical joint pivots and
attachment weights. Metadata honestly names this `procedural_joint_motion`;
it does not claim embedded clips, a Complete Anatomy rig, patient-specific
ranges, Hill-type force modeling or validated biomechanics. Broad/shared
muscles retain the source mesh, not invented head boundaries. Knee extension
starts flexed; axial knee rotation uses a flexed-knee posture. Toe actions only
move their specified phalanges. Patellar glide uses a limited illustrative
coupling rather than rotating it rigidly with the tibia. Segment-weighted knee skinning
keeps the quadriceps belly on the fixed femur while routing its distal tendon
through the illustrative patellar transform to the moving tibia. Calf muscles
follow the tibial segment during knee movement; ankle/hindfoot demonstrations
keep the proximal leg belly fixed and blend the distal tendon with the foot.
These corrections improve attachment behavior without claiming physiological
patellofemoral contact, tendon wrapping, fiber recruitment or volume validation.

Engineering references: Three.js official animation-system documentation;
Stanford OpenSim Gait2392/Lower-Limb Model 2010 documentation on joint types,
pivots and coordinate conventions. The atlas uses +Z anterior/+Y superior/-X
right, which differs from OpenSim. Conservative demonstration excursions are
not presented as clinical goniometric normal ranges.

`muscle-motion-viewer.js` portals the one existing canvas into the modal; no
extra WebGL context, GLB download, model clone or independent frame loop.
Closing, navigating or entering quiz disposes the mixer and restores original
bone matrices, muscle positions/normals, culling flags, camera, tour and labels.
Page hiding pauses playback. Source geometry/bounds caches remain valid after
restoration. The panel temporarily shows its selected muscle and skeleton;
manual Body layers preferences return when it closes. The compact modal fits the viewport without internal text scrolling on both
desktop and mobile. Camera framing includes the moving tibia and foot for knee
actions so the complete lever remains visible.

Validation
----------

`node check-muscle-actions.mjs`: 52 records / 183 bindings, source images,
physiological exclusions, joint/digit specificity and real procedural clip
contracts. Missing meshes and invented clip names fail validation.

`node check-muscle-motion.mjs`: decodes the actual bundled Draco skeletal and
muscular meshes, exercises 40 actions for L7 and 115 each for L8, L9 and L10, verifies
actual vertex deformation and bone motion, direction signs, untouched digits,
AnimationMixer playback/pause, neutral tendon-weight invariance, fixed quadriceps-belly and rigid calf-segment
attachment regressions, and exact source-position/matrix restoration after each action. All other atlas checks
and source/build asset validation also remain applicable.

Generator: `python build-muscle-actions.py` rebuilds the catalog while preserving
all original lecture fields. Review reference and rig capability before adding
new muscles/actions.

Upper-limb extension — 4 October 2026
------------------------------------

`build-upper-muscle-actions.py` binds every existing L2 profile (26 muscles,
heads or fiber parts; 43 actions) and L3 profile (30 muscles/groups; 55 actions).
The separate `lectures/upper-limb/muscle-actions.json` catalog loads only in
L2/L3. All OINA, lecture scenes and quiz fields remain unchanged. Action
references use each profile's current `referencePages` mapping to the supplied
replacement slides, not the superseded slide images. University verification:
https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/

`upper-muscle-motion.js` supplies shoulder, shoulder-girdle, elbow, radioulnar,
wrist, thumb CMC/MCP/IP, finger MCP/PIP/DIP and combined writing-position plans.
Pronation keeps the ulna fixed and carries the radius/hand about the radial-head
to distal-ulna axis. Supination by biceps uses a flexed elbow. Finger joints
compose proximal-to-distal world transforms. FDS never drives DIP; EPB never
drives thumb IP. Lumbricals combine MCP flexion with IP extension. APL radial
abduction differs from APB palmar abduction. Finger spread/adduction references
the third digit; opposing muscles use an appropriate starting posture.

Bone-distance attachment weights are sampled once, in the source world pose,
then segment transforms are applied to reusable vertex/normal buffers. Long
digital flexor/extensor bellies stay near their fixed forearm while the distal
tendons move; elbow and wrist use fixed/moving segment weights. Sources contain
static anatomy rather than validated rigs: pivots, scapulothoracic glide,
thumb opposition and tendon deformation remain educational approximations.
They do not enforce physiologic tendon wrapping, cartilage contact, force or
fiber-volume conservation. Grouped muscles reflect available source meshes;
unmodeled individual fibers are not invented.

Upper action playback uses the same portal, camera controls and single mixer
as lower-limb playback. Closing the native dialog restores the scene
synchronously, even when a browser rendering opportunity is delayed. The
native close-event handler ignores stale events after rapid reopening.

`check-muscle-actions.mjs` now additionally checks all 56 upper profiles and
98 actions, current source references, specific digits and exclusions.
`check-muscle-motion.mjs` decodes actual upper assets, exercises every new
action, checks fixed humerus/ulna/forearm/palm and isolated thumb IP movement,
then verifies exact original vertices, normals and matrices on restoration.
