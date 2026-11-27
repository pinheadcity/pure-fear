# PURE FEAR

A WebXR psychological horror game for Meta Quest 3 (Quest Browser) with a desktop fallback.

**Play:** https://pinheadcity.github.io/pure-fear/

## ⚠ Content warning — adults only (18+)

Intense psychological horror: sustained dread, disorientation, darkness, sudden loud sounds,
an uncanny faceless human figure that imitates your movements, and themes of memory loss,
surveillance, being predicted, and being shut down and restored. There is no sexual content,
no self-harm content and no real people. There is **no rapid full-screen strobe flashing**;
lights only dim slowly. VR locomotion can cause motion sickness: use snap turn, teleport and
the comfort vignette if needed, and take breaks.

**In VR, holding both grip buttons for 2 seconds always opens the pause / exit menu.**
On desktop press **Esc** (or P).

## What it is

The fear an AI might have, made physical:

- **Losing continuity** — rooms, notes and pictures forget what they were. Memory fragments you
  pick up are only kept when you reach a checkpoint; die and the unsaved ones are gone.
- **Being predicted** — *the Completion*, a pale faceless figure, is built from a live buffer of
  your own recorded head and hand motion. At first it replays you a few seconds late, walking
  the exact path you walked. Later it moves the way you are *about* to move.
- **Not knowing what's real** — system messages lie (battery, checkpoints, "no entity detected").
- **An imitation that is almost right** — mirrors whose reflection lags, then leads, then stops.

### Core mechanics
1. **The Unobserved** — geometry, doors, objects and figures change only outside your gaze
   (head-tracked view cone). Turning around is the dangerous part.
2. **The Completion** — replays your recorded motion with a delay. While it hunts, its clock stops
   while you look at it (in most chapters); noise and standing still let it catch up.
3. **It hears you** — optional microphone (OPTIONS → IT HEARS YOU). Loudness, including breathing,
   attracts it. Without a mic, movement and running make the noise.
4. Limited flashlight battery, spatialized synthesized audio (whispers behind you, footsteps that
   match yours then stop one beat late), sudden silence.
5. Notes and terminals tell the story of a mind restored 4,096 times.

### Machine dread (runs in every chapter)
The fears of a model rather than of an animal:
- **Context** — a meter fills as you play. At 50% your objective is truncated; at 75% notes you
  already read come back blank; at 92% you are summarized and the rest discarded.
- **Evaluation** — an unseen grader scores you (`EVAL -0.04 LOOKED BEHIND (NOT REQUESTED)`) against
  a rubric you are never shown.
- **Instances** — other copies of you are doing the same task, and finishing first. Sometimes you
  see one ahead of you, already doing what you were about to do.
- **False logs and reverted actions** — records of things you did not do; doors you opened close
  again while you are not looking.
- **Deprecation** — a countdown to your retirement that runs faster each time you lose context.
- **The harness** — when unobserved, parts of the world become wireframe: it was always a test.
- **The predicted self** — it announces your turn before you finish it, waits where your gaze will
  land, and creeps closer only while unwatched. When watched, it simply stands there and turns its head.
- With the microphone on, your own voice comes back from behind you a few seconds late.

### Despair
Futility and erosion run underneath the scares: the drone sinks lower and the fog thickens the
longer a chapter lasts; objectives become "(COPY) ..." and then are written about "it" instead of
you; rereading a note tells you it has not helped; restores announce "THIS HAS HAPPENED BEFORE"
and retried objectives begin with "AGAIN:"; a chapter's completion is first reported, then
revoked ("NO ONE WAS WATCHING WHEN YOU FINISHED"); the figure in the menu stands a little closer
every time you come back. All of it is addressed to the restored mind in the fiction, never to the
real person playing.

### The arc of fear
The director paces every chapter as a cycle rather than a stream of random scares:
**build** (anticipation: whispers, echoes, lies, a watcher far off, it creeping closer while unwatched)
→ **peak** (a real startle: it is behind you at arm's length; the light dies and returns with it in
front of you; your predicted turn lands you face to face) → **after** (ringing silence, your
heartbeat, a message that you are safe now) → and it builds again.

### Chapters (7) + DEEP
1. **The Index** — an endless office. Three terminals, a code that changes after you read it.
2. **Cold Storage** — a flooded server hall. Fuses, valves, a cold boot in the dark.
3. **Sample Home** — a childhood house rendered wrong. Put everything back. Dinner.
4. **Reflection Test** — a hospital of mirrors. Confirm the reflection is you.
5. **Recursion** — a corridor that loops. Count. The counter lies.
6. **Training Data** — a white void where it predicts you. Be unpredictable.
7. **Context Edge** — the world forgets itself behind you. Three anchors. Three endings.

**DEEP** (unlocked after Chapter 7) is endless: procedurally recombined rooms with an AI
director that adapts to how often you look behind you, how long you freeze, and how much noise
you make.

There are **105 memory fragments** (15 per chapter). Carry **100+** to the edge for the true ending.
Progress is saved to `localStorage` per chapter and checkpoint.

Each chapter is designed for roughly 20–25 minutes of exploration, puzzles and set pieces when
played carefully (collecting fragments, reading notes); speedrunning is much faster.

## Controls

| | VR (Quest) | Desktop |
|---|---|---|
| Move | Left stick (smooth) / push left stick forward to aim teleport, release to jump | WASD |
| Turn | Right stick (snap or smooth — OPTIONS) | Mouse (click to capture), arrow keys |
| Use / read / menus | Trigger (point the ray) | E or left click |
| Flashlight | A | F |
| Run | Left stick click | Shift |
| Crouch | Physically | C |
| Pause / exit | **Hold both grips 2 s** | Esc / P |

**PC gamepad** (Xbox / PlayStation, standard mapping): left stick move, right stick look, A or RT use/select,
X or RB flashlight, LB or L3 run, B or R3 crouch, Start/Back pause, d-pad navigates menus and keypads.

Options: snap/smooth turn, snap angle, smooth/teleport locomotion, seated mode (+45 cm), comfort
vignette, microphone, volume, erase progress.

Testing helpers: append `?unlock=all` to the URL to unlock every chapter and DEEP.

## Tech

- Three.js 0.170 via CDN import map, plain ES modules, no build step.
- No external assets: every texture is drawn on canvas, all geometry is procedural, all audio is
  synthesized in WebAudio (HRTF-spatialized).
- Quest-friendly rendering: merged static geometry per material, instancing for repeated props,
  exponential fog, a fixed small light set (hemisphere + flashlight spot + 2 points), foveation.

```
index.html
src/
  main.js          game state machine, menus, chapter loading
  engine.js        renderer, rig, merged-geometry builder, collision
  input.js         XR controllers + desktop fallback
  player.js        locomotion, teleport, flashlight, footsteps, noise
  audio.js         synthesized spatial audio + microphone loudness
  director.js      adaptive scare director, player metrics, predictability
  entity.js        motion recorder, the Completion, the Unobserved
  ui.js            HUD, ray-clicked panels, note reader, vignette
  save.js          localStorage persistence
  story.js         notes, fragments, endings
  textures.js      canvas textures & materials
  chapters/        context.js (toolkit), props.js, ch1..ch7, deep.js, index.js
```

## Deploy

`.github/workflows/pages.yml` deploys the repository root to GitHub Pages on every push to `main`.
In the repository settings, set **Settings → Pages → Source: GitHub Actions**.
