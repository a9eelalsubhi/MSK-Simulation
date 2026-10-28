# Lecture 9: lower limb vessels

Teaching source: the supplied `L9 - lower limp vessels.pdf`, Dr Ibrahim Amr, 12 PDF pages / printed pages 44–55. All 12 pages remain available through the lecture-diagram control. No additional clinical facts are introduced from the design research.

## Coverage

| PDF / printed page | Covered material | Tour scenes |
|---|---|---|
| 1 / 44 | Femoral origin, mid-inguinal landmarks, course, coverings and changing vein/nerve relations | 1–7 |
| 2 / 45 | Femoral termination; superficial inguinal, deep external pudendal, profunda/circumflex/perforating and descending genicular branches | 8–13 |
| 3 / 46 | Femoral branch reference figure | 12 |
| 4 / 47 | Trochanteric and cruciate contributors, head supply and lesser-trochanter level | 14–15 |
| 5 / 48 | Popliteal depth, crossing relations, division, muscular/cutaneous branches and five genicular branches | 16–20 |
| 6 / 49 | Anterior tibial origin, membrane crossing, nerve and retinaculum relations, continuation and branches | 21–25 |
| 7 / 50 | Dorsalis pedis course, branches, arcuate/metatarsal distribution and continuation into sole | 26–29 |
| 8 / 51 | Posterior tibial course, termination, fibular and other branches | 30–33 |
| 9 / 52 | Plantar arteries, deep arch and ten contributors to knee anastomosis | 34–36 |
| 10 / 53 | Great/small saphenous origin, malleolar relations, course, nerve companions, tributaries, communications and termination | 37–44 |
| 11 / 54 | Sympathetic pathway and named peripheral routes; lymphatic vessel routes; popliteal nodes | 45–48 |
| 12 / 55 | Superficial inguinal vertical/horizontal groups and drainage; deep inguinal/femoral canal and external iliac drainage | 49–51 |

14 topics + full lecture explorer; 51 scenes; 33 actual vessel quiz targets; four guided routes; seven linked learning maps. Scene callouts are limited to three at a time. Existing lecture switch, search, camera presets, quiz, touch lock and five independent layer controls are retained.

## Visual methods and limits

- Original Anatria / Z-Anatomy / BodyParts3D mesh positions and transforms are preserved. Selected cardiovascular model contains 60 named meshes. Bones remain visible as regional 42% context unless the user changes the layer settings.
- Artery and vein routes use distinct colors, with gold nerve relations. Route playback advances through real scenes; it is not a hemodynamic simulation.
- Femoral relation diagrams are explicitly schematic, indexed to the triangle base, apex and adductor canal. They are not measured tissue sections.
- Hip-network comparison, knee `2 + 2 + 1 + 5`, paired saphenous routes, sympathetic chain and lymph drainage are lecture-derived diagrams linked to the relevant 3D scenes.
- Fine branches without independent geometry use `context` callouts and original lecture figures. They are excluded from identification quizzes. No invented vessel meshes replace descending genicular, recurrent, arcuate, circumflex fibular, small inguinal or lymphatic structures.
- Deep plantar geometry represents the penetrating continuation of dorsalis pedis. Grouped metatarsal/perforating meshes are named as groups; they are not falsely split into individual branches.
- External design reading: https://www.nature.com/articles/s41598-023-35046-2 and https://link.springer.com/article/10.1007/s00423-024-03463-0 . These motivate consistent colors and linked schematics, without establishing that any single display method is universally best.

## Validation

- `build.py`: all source pages, scene IDs, pin/focus targets, meshes, route destinations, branch directory links and quiz targets resolve; all existing lecture contracts remain valid.
- `check-vessel-lab.mjs`: seven map views, relation level switching, model jumps, four route cards, route navigation/restart, external chapter cancellation, quiz guard and cleanup.
- Shared feature, lower-limb feature and independent layer-control suites.
- Local browser review includes femoral relations, saphenous route navigation, plantar scene, mobile control spacing and quiz interaction. Only the active lecture's model assets load.

Publication also includes the previously committed Lecture 8 continuation: 93 scenes, 52 profiles, all 25 source pages (printed 19–43).
