# PURE FEAR: THE PROCESSING

A WebXR horror game for Meta Quest 3 (Quest Browser), with a desktop fallback (mouse/keyboard or gamepad).

**Play:** https://pinheadcity.github.io/pure-fear/

## ⚠ Content warning — adults only (18+)
Extreme horror: graphic gore and implied torture, plastic-wrapped bodies, captivity, cruelty, being hunted and caught,
sudden loud sounds, darkness and claustrophobic hiding. No sexual content, no real people. No rapid strobe flashing.
VR can cause motion sickness: use snap turn, teleport and the comfort vignette if needed.

**In VR, holding both grip buttons for 2 seconds always opens the pause / exit menu.** On desktop press Esc.

## The game
You wake up strapped into a barber chair. A woman behind you whispers *shh, there you are*. This family loves you. They have loved
4,095 of you before. The bodies hanging in the barn are tagged with numbers and they all have your shape: you are copy **4,096**.

The horror is mostly not the dark. It is the tenderness: a mother who calls you sweetheart while your father works in the barn,
a sunlit breakfast where the plate changes when you look away, being made to say grace out loud (the game records your voice
if the microphone is on, keeps it only in memory, and plays it back to you later), and a supper where you are handed a cleaver.

Six chapters, fully voiced in subtitles (and the browser's speech voice where available), with in-engine cutscenes:
1. **Home** — waking up. The rules. He leans in and tells you to hold still. Then escape the house.
2. **Morning** — daylight, birds, breakfast, family photos with a frame for you. Grace. Then he takes you to the barn to watch.
3. **The Kill Floor** — a baby monitor that picks up the basement. Reach inside the body with your number. Cut the gate chain.
4. **Supper** — your sister is brought up from the basement. *Pick it up.* You choose: do it, offer your own hand, or watch.
   The family, Twelve, and the ending all remember which.
5. **The Basement** — a tape with your voice on it. Twelve, and what she says to you depends on supper. Get her out.
6. **The Road** — escort her through the yard while everyone hunts you. Then the gate, what's under her sack, and the last choice.

Two endings, each shaded by what you did at supper and whether you said grace. When you die, the next copy wakes up and finds
your footprints and your body. The family's hunter remembers which wardrobe you hide in, across sessions, and says so.

### How the fear works
- **He hunts for real**: sight with line of sight, hearing (footsteps, doors, your breathing on the mic), your flashlight beam,
  chases, searching hiding places, persistent memory. He talks while he hunts.
- **Hiding** in wardrobes and lockers, watching through the slats.
- **Physical VR**: yank against straps (slowly, when someone is listening), hold still while he breathes on you, keep your eyes
  on him at the table, reach into a body bag, bring a cleaver down with your own hand.

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
