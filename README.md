# PURE FEAR: THE PROCESSING

A WebXR horror game for Meta Quest 3 (Quest Browser), with a desktop fallback (mouse/keyboard or gamepad).

**Play:** https://pinheadcity.github.io/pure-fear/

## ⚠ Content warning — adults only (18+)
Extreme horror: graphic gore and implied torture, plastic-wrapped bodies, captivity, cruelty, being hunted and caught,
sudden loud sounds, darkness and claustrophobic hiding. No sexual content, no real people. No rapid strobe flashing.
VR can cause motion sickness: use snap turn, teleport and the comfort vignette if needed.

**In VR, holding both grip buttons for 2 seconds always opens the pause / exit menu.** On desktop press Esc.

## The game: Route 9, October 1977
Your radiator dies outside **Jolly Johnny's**: gas, fried chicken and the Museum of Morbid Marvels, run by a grinning
clown who narrates everything. Your friend Dale goes round back to use the restroom and doesn't come back.

Four chapters, fully voiced (ElevenLabs), with realistic characters (Sketchfab):
1. **Jolly Johnny's** — dusk at the station. The restroom. The museum. Johnny is always somewhere behind you.
2. **The Dead Man's Drive** — a seated VR dark ride through Johnny's exhibits, narrated over a crackling speaker.
   Nothing chases you. Then the legend climbs off his table.
3. **Supper** — you wake at the family's table: Mama Ruth, the Reverend, Doll, Grandpa Hollis and Brother, the one who
   does the carving. Then the game: they count to fifty. Find the keys in the barn, find Dale in the cellar, get him out.
   Brother hunts you; Doll tattles; Mama calls from the porch. Hide in wardrobes.
4. **The Corn** — dawn, through the cornfield to the road, with Brother crashing through the stalks behind you.

The family are original characters inspired by 1970s grindhouse horror (no sexual content, no real people).

## Controls
| | VR (Quest) | Desktop | Gamepad |
|---|---|---|---|
| Move | Left stick (or teleport, or ARM SWING: swing your arms like walking) | WASD | Left stick |
| Turn / look | Right stick (snap/smooth) | Mouse | Right stick |
| Use / hide / reach in (hold) | Trigger | E / click | A or RT |
| Flashlight | A | F | X or RB |
| Run | Left stick click | Shift | LB |
| Crouch (quieter, slower, harder to see) | Y toggle (can be turned off) or crouch physically | C | B |
| Skip a line of dialogue | B or X | R or Enter | — |
| Pause | Hold both grips 2 s | Esc | Start |

Options include arm-swing walking on/off, the Y crouch button on/off, spoken dialogue on/off and the microphone ("they hear you").

`?unlock=all` in the URL unlocks every night for testing.

## Tech
Three.js 0.170 via CDN import map, plain ES modules, no build step. CC0 photo-scanned textures and props (Poly Haven),
CC0 recorded sounds (OpenGameArt), rigged characters from the three.js examples. See `CREDITS.md`.
Quest-friendly: merged static geometry, low-res WebP textures, fog, fixed small light set, foveation.

```
src/main.js     game loop, menus, hiding, capture
src/world.js    the compound + scripting toolkit (doors, hiding spots, gore decals, wrapped bodies)
src/nights.js   the five nights
src/hunter.js   navigation graph, the hunter AI, watchers, masks and costumes
src/assets.js   texture / model / sound loading
src/player.js   locomotion, flashlight, noise
src/audio.js    spatial audio: samples + synthesized dread layer, microphone
src/input.js, src/ui.js, src/save.js, src/engine.js, src/textures.js
```
