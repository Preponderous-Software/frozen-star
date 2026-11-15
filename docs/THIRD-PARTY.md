# Third-party material

Frozen Star's own code and writing are under the MIT license (see `LICENSE`). The game also ships or uses
the following.

| What | Where | Licence |
| --- | --- | --- |
| three.js r170 | `vendor/three/` | MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE |
| Ines's voice: Kokoro-82M, voice `af_sky` | `assets/voice/ines/*.ogg`, made by `tools/voice/generate.py` | Apache-2.0 |
| Bricolage Grotesque, IBM Plex Sans and IBM Plex Mono (loaded from Google Fonts) | `index.html` | SIL Open Font License 1.1 |

## Ines's voice

Ines Okafor's spoken lines were synthesised with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)
(open weights, by hexgrad; inference code https://github.com/hexgrad/kokoro), using its voice `af_sky`.
Kokoro-82M and its voices are released under the Apache License, Version 2.0:
https://www.apache.org/licenses/LICENSE-2.0. The clips in `assets/voice/ines/` are output of the model;
they were trimmed, loudness-normalised and encoded as Ogg Vorbis by `tools/voice/generate.py`, and are
distributed with the game under the same terms as the rest of it.

To regenerate them (for example after new lines are written), see the header of `tools/voice/generate.py`.
