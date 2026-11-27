# PURE FEAR: THE PROCESSING

A WebXR horror game for Meta Quest 3 (Quest Browser), with a desktop fallback (mouse/keyboard or gamepad).

**Play:** https://pinheadcity.github.io/pure-fear/

## ⚠ Content warning — adults only (18+)
Extreme horror: graphic gore and implied torture, plastic-wrapped bodies, captivity, cruelty, being hunted and caught,
sudden loud sounds, darkness and claustrophobic hiding. No sexual content, no real people. No rapid strobe flashing.
VR can cause motion sickness: use snap turn, teleport and the comfort vignette if needed.

**In VR, holding both grip buttons for 2 seconds always opens the pause / exit menu.** On desktop press Esc.

## The game
You wake up strapped into a barber chair in a farmhouse. A masked family "processes" people here. The bodies hanging in the
barn are tagged with numbers, and they all have your shape: you are copy **4,096**. Every time you are caught, you are
processed, and the next copy wakes up in the chair. It finds **your footprints** and **your body** where you died.

Five nights:
1. **The Chair** — struggle free (yank your real hands in VR), don't move when he leans in, get out of the house.
2. **The Kill Floor** — the barn. Reach inside the newest body for the key. Cut the chain on the gate. Something is waiting.
3. **Dinner** — they set a place for you. Keep your eyes on him. Then Grandmother's room: she's blind, and hears everything.
4. **The Basement** — Twelve is still alive in a cage. Pry it open. He comes down the stairs.
5. **The Road** — get her through the gate. She coughs. Everyone is awake.

### How the fear works
- **He hunts for real.** Sight with line of sight and a vision cone, hearing (your footsteps, doors, the microphone),
  your flashlight beam, chases, searching. He opens the hiding place he saw you enter, and checks the ones you used before
  (that memory is saved between sessions).
- **Hiding** in wardrobes and lockers: you watch through the slats while he walks past.
- **They hear you.** With the microphone on (OPTIONS), your real breathing and voice carry. Crouching (for real, in VR) is quieter.
- **Physical VR**: struggling against straps with your arms, holding the trigger while you reach into a body bag, holding still
  while he breathes in your face, forced to keep looking at him at dinner.
- Being caught is a capture sequence, not a fade: he is in your face, and then you are processed.

## Controls
| | VR (Quest) | Desktop | Gamepad |
|---|---|---|---|
| Move | Left stick (or teleport) | WASD | Left stick |
| Turn / look | Right stick (snap/smooth) | Mouse | Right stick |
| Use / hide / reach in (hold) | Trigger | E / click | A or RT |
| Flashlight | A | F | X or RB |
| Run | Left stick click | Shift | LB |
| Crouch (quieter) | Crouch physically | C | B |
| Pause | Hold both grips 2 s | Esc | Start |

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
