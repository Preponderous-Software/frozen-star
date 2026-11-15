# docs/media

The pictures in the main README. Most are rendered by `tools/media.cjs` (Playwright and ImageMagick; see "Regenerating the pictures" in the main README). The files in `darkroom/` are rendered by [darkroom](https://github.com/Preponderous-Software/darkroom) from `tools/darkroom/media.json`.

## darkroom

```sh
python3 -m http.server 8640 --bind 127.0.0.1 &
darkroom check tools/darkroom/media.json
NODE_PATH=/path/to/node_modules darkroom shoot tools/darkroom/media.json --only dream descent
darkroom shoot tools/darkroom/media.json --var base=http://127.0.0.1:8000/   # another port
```

| Shot | Output | In the README |
|---|---|---|
| `dream` | `darkroom/dream.mp4`, `.webm`: the prologue's fall, as video | the dream GIF links to it |
| `descent` | `darkroom/descent.mp4`, `.webm`: the descent, as video (shot with `?lowgpu`, so the sky is coarser than in the GIF) | the descent GIF links to it |
| `room`, `rooms` | `darkroom/rooms.jpg`: a captioned grid of the quarters, the lab and the bridge, with the HUD hidden (the per-room stills are not committed) | the grid, at the top of the Gallery |
| `helm-deep` | `darkroom/helm-deep.jpg`: the helm at 1.3 rₛ | not used (`panels/helm-deep.png` stays) |
| `title`, `orpheus-feed` | ports of the `media.cjs` GIFs | not used: the existing title GIF is better, and the `orpheus-feed` port was not run to the end in this pilot (it waits for 50 feed frames, and the machine was too loaded) |

GitHub shows no player for a video that is committed to the repo. A bare relative path, a `blob` URL, a `raw` URL and a `<video>` tag were all tried through GitHub's markdown renderer, and none of them played; only uploaded attachments play inline. So the README's GIFs act as posters that link to the MP4s.

The posters, the descent GIF, the title GIF and the helm still that darkroom also writes are not committed, because the existing pictures are better.

Takes, state and contact sheets for review stay in `tools/darkroom/.darkroom/`, which git ignores. To review a take frame by frame, run `darkroom sheet tools/darkroom/media.json descent`.

### How the manifest drives the game

- **Seeding storage.** darkroom cannot run an init script, but the game reads its settings (`quality: high`) and an optional save from `localStorage` at load. So every shot opens a same-origin stub page (`tools/darkroom/`, a directory listing), and the first `setup` step writes `localStorage` and then calls `location.replace()` to load the game. The real target is in the URL hash (`#go=ship&cp=rescue-done&ts=2`), so the setup can be shared in `defaults` and each shot only changes its `url`.
- **Waiting on game state.** `__dr.until(() => …)` is a `js` step that polls inside the page. darkroom 0.2.0's `waitFor` returns at once ([darkroom#4](https://github.com/Preponderous-Software/darkroom/issues/4)).
- **Freezing time for a frame.** `__dr.freeze()` pauses game time (`__fs.paused`) and holds back the game's own `requestAnimationFrame` callbacks, so a screenshot neither skips game time nor waits for another SwiftShader frame. `__dr.thaw()` lets them go. Without the hold, every screenshot on a loaded machine hit Playwright's 30 s timeout ([darkroom#5](https://github.com/Preponderous-Software/darkroom/issues/5)).

## Pilot report: darkroom on Frozen Star

This was darkroom 0.2.0, on a 20-core WSL machine with a load average between 35 and 90 (several other SwiftShader renders were running at the same time).

**What worked**

- **The shot list maps well onto `tools/media.cjs`.** A job is a shot. `setup`/`steps` with `repeat`, `i`/`u` and `capture` express the GIF loops directly: log-stepped altitude for the descent, log-stepped radius for the dream. `crop` replaces the feed job's `clip`.
- **Video and review.** MP4, WebM and a poster come from the same take with no extra code, and the defaults keep them small: the dream is 153 KB as MP4 and 113 KB as WebM, against 1.4 MB for the GIF. `darkroom sheet` on a take is a quick way to check a clip before publishing it.
- **`each` and `grid`** turn four room stills into one captioned composite in two manifest entries.
- **Retries, skipping and partial failure.** A failed shot does not stop the others, and a finished shot is skipped on the next run, which matters when one clip takes ten minutes.
- **`darkroom check`** caught manifest mistakes at the exact path.

**What was awkward**

- **No init script.** Seeding `localStorage` before load needs the stub page and the reload described above. A stub without an extension (`LICENSE`) fails with "Download is starting".
- **No per-shot vars, and `js` is not templated.** Per-shot data has to go in the URL hash or in `vars.value` with `each`.
- **No way to end a clip on a condition or hold its last frame.** The Orpheus feed sets a `window.__done` flag and runs out its loop. The descent and dream hold by capturing the last frame again 12 to 20 times.
- **Long one-line JS in JSON.** The game's helpers (`place`, `skip`, `open`, the dream's camera) become long one-line strings in `defaults.setup`. A `setupFile` or an init script file would read much better.
- **Repeated `--only` flags** keep only the last value. Write `--only a b c`.
- **One bad value of an `each` shot means reshooting all of them.** With the HUD hidden by `css`, the corridor's ship canvas came out blank twice, in the `each` run and again in a single-value retake; only the sky in its windows was drawn. The same pose with the HUD visible rendered correctly. This looks like a compositing quirk of the game's two stacked WebGL canvases under SwiftShader, not a darkroom bug. Grid `tiles` with `{shot, frame}` made it easy to leave the corridor out.

**Gaps filed upstream**

- [#4](https://github.com/Preponderous-Software/darkroom/issues/4): `waitFor` steps return immediately (an async predicate passed to `waitForFunction`).
- [#5](https://github.com/Preponderous-Software/darkroom/issues/5): `page.screenshot` uses Playwright's 30 s default timeout, with no way to raise it.
- [#6](https://github.com/Preponderous-Software/darkroom/issues/6): an init script and context options (storage, a frozen clock, `reducedMotion`).
- [#7](https://github.com/Preponderous-Software/darkroom/issues/7): holding a clip's last frame, and ending a `repeat` early on a condition.
- [#8](https://github.com/Preponderous-Software/darkroom/issues/8): a repeated `--only` keeps only the last value.
- [#9](https://github.com/Preponderous-Software/darkroom/issues/9): `gallery` writes a video-only clip's poster without a link to the video, so the README links here were written by hand.

**Verdict.** darkroom can take over the game's clips once #4 and #5 are fixed, and #6 would remove the workarounds. Until then, `tools/media.cjs` stays the main renderer, and darkroom adds what it cannot make: MP4/WebM clips and the room grid.
