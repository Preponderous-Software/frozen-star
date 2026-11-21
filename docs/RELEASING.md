# Releasing Frozen Star

Releases are GitHub releases with bare version tags (`0.1.0`, no "v"). They are made by the fleet's
release automation: it sets the version in a pull request, checks the merged commit (saves, CI, a dry
run of the release workflow) and pushes the tag. The tag push runs the `Release` workflow
([`.github/workflows/release.yml`](../.github/workflows/release.yml)), which builds the downloads,
creates the release if it does not exist yet, and attaches the downloads to it. The arcade
(https://frozen-star.play.danielstephenson.dev) is separate and unchanged: CI deploys every push to
`main`, stamped `<version>+g<sha>` in `version.txt`.

## Versions

The version lives in three files, which must always agree (`test/version.test.js` and the workflow check):

| File | Field |
| --- | --- |
| `package.json` | `"version"`: the web build, and the `<version>` in `version.txt` |
| `desktop/package.json` | `"version"`: the desktop app |
| `src/version.js` | `export const VERSION = "x.y.z";` (exactly this form, one line): the version on the About panel and reported to the playtest probe |

## Saves

Players' progress lives in localStorage: the story save (`frozen-star.fp.v1`), training stars
(`frozen-star.progress.v1`), discoveries (`frozen-star.discoveries.v1`), settings
(`frozen-star.settings.v1`) and mute (`frozen-star.muted`). `SAVE_VERSION` in
[`src/game/save.js`](../src/game/save.js) is the format version of all of them.

- `test/fixtures/saves/v<N>-<name>.json` are real saves: what localStorage held after the game's own
  save code wrote them ([`tools/save-fixtures.mjs`](../tools/save-fixtures.mjs)), as key -> stored string.
- [`test/save-fixtures.test.js`](../test/save-fixtures.test.js) lists every fixture by file name, fails
  on an unlisted file, and loads each one through the game's read paths.
- Released fixtures never change. A change to what is stored bumps `SAVE_VERSION`, adds a migration on
  load (older saves keep loading as they did) and adds a `v<SAVE_VERSION>-<name>.json` fixture, listed
  in the test. The release automation refuses a release that edits a released fixture, lowers
  `SAVE_VERSION`, or lacks a fixture for a format.

## Cutting a release by hand

The release automation does steps 2, 4 and 5 itself; the playtest evidence (step 1) is still required.

1. **Playtest the build.** Run [playtester](https://github.com/Preponderous-Software/playtester)
   with `tools/playtest/frozen-star.json` and commit the evidence under `docs/playtests/<version>/`,
   with the exact commit in its README. The workflow refuses a release whose evidence directory is
   missing or empty. If the release turns out to have a different version than the evidence was
   filed under, rename the directory with `git mv`.

2. **Set the version.** On a branch, set the same version in three places and open a pull request:
   - `package.json` (`version`): the web build, and the `<version>` in `version.txt`;
   - `desktop/package.json` (`version`): the desktop app;
   - `src/version.js` (`export const VERSION = "x.y.z";`): the version shown on the About panel and reported to the playtest probe.

   Add the release's entry to [`CHANGELOG.md`](../CHANGELOG.md) in the same pull request. The
   workflow fails if the three versions differ, or if the tag does not match them.

3. **Write the release notes** in `docs/release-notes/<version>.md` (same pull request). Images can be embedded from the README's
   media with `https://raw.githubusercontent.com/Preponderous-Software/frozen-star/main/docs/media/...`.

4. **Create the release on the merged commit.** Pass the full SHA, not a branch name, so the tag
   lands on exactly the commit that was checked:

   ```bash
   git fetch origin
   sha=$(git rev-parse origin/main)
   gh release create 0.1.0 --repo Preponderous-Software/frozen-star --target "$sha" \
     --title "Frozen Star 0.1.0" --notes-file docs/release-notes/0.1.0.md
   ```

5. **Wait for the downloads.** After about five minutes the release has four assets:

   | Asset | Contents |
   | --- | --- |
   | `frozen-star-<version>-web.zip` | `frozen-star-<version>-web/`: the static site (`index.html`, `styles.css`, `game.css`, `src/`, `vendor/`, `version.txt`), `README-download.txt`, `LICENSE.txt` |
   | `frozen-star-<version>-win-x64.zip` | `Frozen Star/`: the Electron 45.2.0 runtime with `electron.exe` renamed to `Frozen Star.exe`, the app in `resources/app/` (`main.cjs`, `package.json`, `icon.png`, and the site in `game/`), `README.txt`, `LICENSE-frozen-star.txt` |
   | `*.sha256` | The SHA-256 of each zip, in the format `sha256sum -c` reads |

   Watch it with `gh run list --repo Preponderous-Software/frozen-star --workflow release.yml`.
   If it fails, fix the cause and run it again for the same tag; uploads replace assets of the same
   name:

   ```bash
   gh workflow run release.yml --repo Preponderous-Software/frozen-star --ref main -f tag=0.1.0
   ```

## What the workflow checks

- A pushed tag, a published release or a run with a tag: the tag is a bare version, and `package.json`, `desktop/package.json` and `src/version.js`
  all say it.
- `docs/playtests/<version>/` exists and is not empty.
- `npm test` passes.
- [`tools/build-release.sh`](../tools/build-release.sh) builds both zips. It downloads the official
  Electron win32-x64 zip and refuses it unless its SHA-256 matches the one pinned in the script.
  That pin is the same as the one in `tools/play-frozen-star.bat`, so keep the two in step when
  Electron is upgraded.
- The Windows zip has the expected layout. The Linux runner cannot run the Windows executable.
- The web zip is unzipped, served and passes `tools/smoke.cjs` (menu, ship and a lesson load with
  no errors).
- On a tag: the release is created if it does not exist ("Frozen Star <version>", notes from
  `docs/release-notes/<version>.md` when present), and the zips and `.sha256` files are uploaded with
  `--clobber`.

To check the desktop app on a Windows PC before publishing, unzip it and run its hidden self-test:

```bat
"Frozen Star\Frozen Star.exe" --smoke=%TEMP%\fs-smoke.json
type %TEMP%\fs-smoke.json
```

It should report `"ready": true` and no errors, and it also saves a screenshot next to the report.

## Building without a release

Build the same zips locally (needs curl, unzip, python3 and sha256sum; `ELECTRON_ZIP=<path>`
reuses a downloaded Electron zip):

```bash
tools/build-release.sh 0.1.0 "$(git rev-parse HEAD)" dist
```

A pull request that changes the workflow, the build script, `desktop/`, `package.json` or
`docs/playtests/` runs the workflow as a dry run and keeps the zips as workflow artifacts. Running
it by hand with no tag does the same:

```bash
gh workflow run release.yml --repo Preponderous-Software/frozen-star --ref <branch>
```
