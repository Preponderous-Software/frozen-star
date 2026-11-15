#!/usr/bin/env bash
# Builds the two release downloads of Frozen Star into <out-dir>:
#
#   frozen-star-<version>-web.zip       the static site: unzip, serve, play
#   frozen-star-<version>-win-x64.zip   the Windows desktop app: unzip, double-click "Frozen Star.exe"
#
# plus a .sha256 file for each. The release workflow (.github/workflows/release.yml) runs this;
# it also runs by hand on Linux with curl, unzip, python3 and sha256sum:
#
#   tools/build-release.sh 0.1.0 "$(git rev-parse HEAD)" dist
#
# The Windows app is the official Electron runtime, checksum-pinned exactly as in
# tools/play-frozen-star.bat, with electron.exe renamed and the game in resources/app,
# laid out as the .bat lays it out. Set ELECTRON_ZIP to a local copy to skip the download.
set -euo pipefail

version=${1:?usage: build-release.sh <version> <commit-sha> <out-dir>}
sha=${2:?usage: build-release.sh <version> <commit-sha> <out-dir>}
out=${3:?usage: build-release.sh <version> <commit-sha> <out-dir>}

# Keep these two in step with tools/play-frozen-star.bat.
EV=45.2.0
ESHA=8b3475a4c1e56ac70f4802b4fc05db758c8821c766f26445acdb90e3c4e68e71

root=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$out"
out=$(cd "$out" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# The game files, as CI assembles the arcade site, with the same version.txt (0.1.0+g<sha>).
copy_game() {
  mkdir -p "$1"
  cp -r "$root/index.html" "$root/styles.css" "$root/game.css" "$root/src" "$root/vendor" "$1/"
  echo "${version}+g${sha::7}" > "$1/version.txt"
}

# (a) the web download
web="frozen-star-${version}-web"
copy_game "$work/$web"
cp "$root/LICENSE" "$work/$web/LICENSE.txt"
sed "s/@VERSION@/${version}/g" "$root/docs/README-download.txt" > "$work/$web/README-download.txt"
rm -f "$out/$web.zip"
(cd "$work" && python3 -m zipfile -c "$out/$web.zip" "$web")

# (b) the Windows desktop app
ezip=${ELECTRON_ZIP:-}
if [ -z "$ezip" ]; then
  ezip="$work/electron-v${EV}-win32-x64.zip"
  curl -fsSL -o "$ezip" "https://github.com/electron/electron/releases/download/v${EV}/electron-v${EV}-win32-x64.zip"
fi
got=$(sha256sum "$ezip" | cut -d' ' -f1)
if [ "$got" != "$ESHA" ]; then
  echo "Electron ${EV} win32-x64 zip has SHA-256 $got, expected $ESHA; not using it." >&2
  exit 1
fi
win="Frozen Star"
mkdir -p "$work/win/$win"
unzip -q "$ezip" -d "$work/win/$win"
mv "$work/win/$win/electron.exe" "$work/win/$win/Frozen Star.exe"
app="$work/win/$win/resources/app"
mkdir -p "$app"
cp "$root/desktop/main.cjs" "$root/desktop/package.json" "$root/desktop/icon.png" "$app/"
copy_game "$app/game"
cp "$root/LICENSE" "$work/win/$win/LICENSE-frozen-star.txt"
sed "s/@VERSION@/${version}/g" "$root/docs/README-download.txt" > "$work/win/$win/README.txt"
winzip="frozen-star-${version}-win-x64.zip"
rm -f "$out/$winzip"
(cd "$work/win" && python3 -m zipfile -c "$out/$winzip" "$win")

# checksums, in the format `sha256sum -c` reads
for f in "$web.zip" "$winzip"; do
  (cd "$out" && sha256sum "$f" > "$f.sha256")
done
ls -l "$out"
