#!/usr/bin/env python3
"""Voice Ines with Kokoro-82M, voice af_sky.

Scans the game source for every line Ines speaks, synthesises the lines that have no clip yet, and writes
assets/voice/ines/<key>.ogg plus assets/voice/ines/manifest.json. The game plays a clip when the line it
is about to show matches one in the manifest; any other line keeps working exactly as before.

Re-runnable and incremental: a clip is only re-made when its spoken text or its voice settings change, and
clips whose lines have left the source are deleted.

    /root/.venvs/kokoro/bin/python tools/voice/generate.py            # generate what is missing
    /root/.venvs/kokoro/bin/python tools/voice/generate.py --list     # only list the lines found
    /root/.venvs/kokoro/bin/python tools/voice/generate.py --force    # re-make every clip

Setup (once): uv venv --python 3.11 /root/.venvs/kokoro, then install torch (CPU), kokoro, soundfile,
pyloudnorm and the spaCy model en_core_web_sm into it. Kokoro-82M is Apache-2.0
(https://github.com/hexgrad/kokoro, https://huggingface.co/hexgrad/Kokoro-82M).

Where the source finds a line:
  - say('INES', <string>) or g.say('INES', <string>), and every ['INES', <string>] pair (reactions, chats);
  - every string in an array constant named INES_* (the rescue's radio lines, which carry no speaker tag).
Template literals with computed numbers are handled by TEMPLATES below; one that is not listed there is
reported and skipped, so it falls back to the procedural voice.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'voice' / 'ines'
VOICE = 'af_sky'
SR = 24000
TARGET_LUFS = -18.0
PEAK_CEIL = 10 ** (-1.5 / 20)  # -1.5 dBFS
GEN_VERSION = 1  # bump to re-make every clip after a change to the processing below

# ---------- computed lines ----------
# A template either has its expressions evaluated once (they are constants of the game, so the line can be
# spoken exactly), or gets a number-free spoken form, matched at runtime by a pattern built from the
# template. The subtitle always shows the real line.
TEMPLATES = [
    {  # deep is the deepest altitude the player held at, 1.03..1.33 rₛ: 31 values for one line. The
       # number is on screen in the subtitle; the voice says it without.
        'match': 'deep.toFixed(2)',
        'spoken': 'When it passes the depth where we hovered, will its picture go all black, like our window did?',
    },
    {'match': 'tideG.toFixed(2)', 'eval': {'tideG.toFixed(2)': '(tidalStretch(2, HOLE.mass) / G_EARTH).toFixed(2)'}},
    {'match': 'maxTimeInside(M).toFixed(1)', 'eval': {'maxTimeInside(M).toFixed(1)': 'maxTimeInside(HOLE.mass).toFixed(1)'}},
]
NODE_PRELUDE = """
import * as body from './src/physics/body.js';
import * as units from './src/physics/units.js';
import { HOLE } from './src/game/world.js';
const { tidalStretch, maxTimeInside } = body; const { G_EARTH } = units;
"""

# lines that are never heard: sent from inside the horizon, so their light never arrives
NEVER_HEARD = {"...it's so quiet in here."}

# ---------- delivery ----------
# Kokoro has no emotion control; delivery comes from speed and punctuation. Ines is warm and wry at a
# relaxed pace, quicker and tighter as the rescue goes wrong. Keys are substrings of the line.
SPEED = {
    'Morning, doc!': 1.0,
    'Lost main power': 1.08,
    "Don't fire yet!": 1.1,
    'You should see the ring': 1.0,
    'Halfway to the edge': 1.02,
    'the stars behind me are going blue': 1.05,
    'Still okay. Still waiting': 1.08,
    'Everything overhead is so bright': 1.1,
    'The black fills most': 1.05,
    'Maybe now, doc?': 1.08,
    'Now would be good': 1.15,
    'Fire. Fire now.': 1.2,
    "I can't tell if you've fired": 1.12,
    "It doesn't look like anything": 1.05,
    "Engine's lit!": 1.15,
    'Docked. Hands still shaking.': 0.88,
    'You know what scares me?': 0.92,
    'Somehow that\'s worse than forever': 0.9,
    'Thank you.': 0.85,
    'Doc. Up. Please.': 0.95,
}
DEFAULT_SPEED = 0.97

# how Kokoro should say what the subtitle writes (pronunciation only; meaning never changes)
SAY_AS = [
    (r'\bWREN\b', 'Wren'),
    (r'rₛ', 'R S'),
    (r'(\d) g\b', r'\1 gee'),
    (r'\bdoc\b', 'doc'),
]


def key_of(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]


# ---------- scanning ----------
def read_literal(src, i):
    """Read the JS string literal starting at src[i]; return (raw body, quote, end index)."""
    q = src[i]
    j, depth = i + 1, 0
    while j < len(src):
        c = src[j]
        if c == '\\':
            j += 2
            continue
        if q == '`' and src.startswith('${', j):
            depth += 1; j += 2; continue
        if q == '`' and depth and c == '}':
            depth -= 1; j += 1; continue
        if c == q and not depth:
            return src[i + 1:j], q, j + 1
        j += 1
    raise ValueError('unterminated string')


def unescape(body):
    return re.sub(r"\\(.)", lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), body)


def phase_of(path, src, pos):
    """The act a line belongs to, for lazy loading: its enclosing top-level declaration in story.js, or its file."""
    if path.name != 'story.js':
        # the capsule bay's few intercom lines can come at any time from the first minute: load them up front
        return {'bay': 'opening'}.get(path.stem, path.stem.replace('act-', ''))
    decls = [(m.start(), m.group(1)) for m in re.finditer(r'^(?:export )?(?:async )?(?:function|const) (\w+)', src, re.M)]
    name = None
    for p, n in decls:
        if p < pos: name = n
    return {
        'dream': 'opening', 'wake': 'opening', 'toBridge': 'opening', 'beaconAct': 'opening', 'baseHandlers': 'opening',
        'INES_LINES': 'rescue', 'rescueAct': 'rescue', 'rescueAttempt': 'rescue',
        'reactions': 'helm', 'helmAct': 'helm', 'orpheusAct': 'orpheus',
        'epilogue': 'free', 'freeRoam': 'free', 'logbook': 'free',
    }.get(name, 'free')


def scan():
    found = []  # (text or template, is_template, file, line, phase)
    files = sorted((ROOT / 'src').rglob('*.js'))
    for path in files:
        src = path.read_text(encoding='utf-8')
        hits = []
        for m in re.finditer(r"""['"]INES['"]\s*,\s*(?=['"`])""", src):
            hits.append(m.end())
        # a line held in a constant first: const lit = '...'; ... say('INES', lit)
        for m in re.finditer(r"""['"]INES['"]\s*,\s*([A-Za-z_]\w*)\b""", src):
            d = re.search(r'\b(?:const|let)\s+' + m.group(1) + r"""\s*=\s*(?=['"`])""", src)
            if d: hits.append(d.end())
        for m in re.finditer(r'\b(INES_[A-Z_]+)\s*=\s*\[', src):
            # every string literal inside the array (balanced brackets)
            j, depth = m.end(), 1
            while j < len(src) and depth:
                c = src[j]
                if c in '\'"`':
                    hits.append(j); _, _, j = read_literal(src, j); continue
                if src.startswith('//', j):
                    j = src.index('\n', j); continue
                depth += c == '['; depth -= c == ']'; j += 1
        for at in hits:
            body, q, _ = read_literal(src, at)
            line = src.count('\n', 0, at) + 1
            found.append((unescape(body) if q != '`' or '${' not in body else body, q == '`' and '${' in body,
                          str(path.relative_to(ROOT)), line, phase_of(path, src, at)))
    return found


def node_eval(exprs):
    if not exprs:
        return {}
    js = NODE_PRELUDE + f'const E = {{{", ".join(f"{json.dumps(k)}: () => {v}" for k, v in exprs.items())}}};\n' \
        'console.log(JSON.stringify(Object.fromEntries(Object.entries(E).map(([k, f]) => [k, String(f())]))));'
    out = subprocess.run(['node', '--input-type=module', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def resolve(found):
    """Turn scan hits into lines: {key: {text, spoken, phase, where, pattern?}}, plus skipped templates."""
    lines, skipped = {}, []
    evals = {}
    for text, tpl, *_ in found:
        if tpl:
            for t in TEMPLATES:
                if t['match'] in text: evals.update(t.get('eval', {}))
    values = node_eval(evals)
    for text, tpl, where, ln, phase in found:
        pattern = None
        if tpl:
            spec = next((t for t in TEMPLATES if t['match'] in text), None)
            if not spec:
                skipped.append(f'{where}:{ln}  {text}'); continue
            if 'spoken' in spec:
                parts = re.split(r'\$\{(?:[^{}]|\{[^{}]*\})*\}', text)
                pattern = '^' + '.+?'.join(re.escape(unescape(p)) for p in parts) + '$'
                text = spec['spoken']
            else:
                def sub(m):
                    if m.group(1) not in values: raise KeyError(m.group(1))
                    return values[m.group(1)]
                text = unescape(re.sub(r'\$\{([^{}]*)\}', sub, text))
        if text in NEVER_HEARD:
            continue
        k = key_of(pattern or text)
        e = lines.setdefault(k, {'text': text, 'phase': phase, 'where': []})
        if where not in e['where']: e['where'].append(where)  # file only: line numbers would churn on every edit
        if pattern: e['pattern'] = pattern
    return lines, skipped


# ---------- synthesis ----------
def speed_for(text):
    for k, v in SPEED.items():
        if k in text: return v
    return DEFAULT_SPEED


def spoken_form(text):
    s = text
    for a, b in SAY_AS: s = re.sub(a, b, s)
    return s


def synth(pipe, text, speed):
    import numpy as np
    chunks = []
    for _, _, audio in pipe(spoken_form(text), voice=VOICE, speed=speed):
        if audio is not None: chunks.append(audio.numpy() if hasattr(audio, 'numpy') else np.asarray(audio))
    a = np.concatenate(chunks).astype('float32')
    # trim leading and trailing silence, keep a short breath of room
    env = np.abs(a) > 0.01
    if env.any():
        i0, i1 = np.argmax(env), len(a) - np.argmax(env[::-1])
        a = a[max(0, i0 - int(0.04 * SR)): min(len(a), i1 + int(0.12 * SR))]
    # loudness: about -18 LUFS, never above the peak ceiling
    try:
        import pyloudnorm
        lufs = pyloudnorm.Meter(SR).integrated_loudness(a.astype('float64'))
        gain = 10 ** ((TARGET_LUFS - lufs) / 20) if np.isfinite(lufs) else 1.0
    except Exception:
        rms = float(np.sqrt(np.mean(a ** 2))) or 1.0
        gain = 10 ** (TARGET_LUFS / 20) / rms
    a = a * gain
    peak = float(np.max(np.abs(a)))
    if peak > PEAK_CEIL: a *= PEAK_CEIL / peak
    # soft edges so a clip never starts or stops with a click
    n = int(0.008 * SR); ramp = np.linspace(0, 1, n, dtype='float32')
    a[:n] *= ramp; a[-n:] *= ramp[::-1]
    return a


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--list', action='store_true', help='list the lines found and exit')
    ap.add_argument('--force', action='store_true', help='re-make every clip')
    ap.add_argument('--threads', type=int, default=4, help='CPU threads for synthesis')
    ap.add_argument('--quality', type=float, default=0.55, help='Vorbis compression level, 0 (best) to 1 (smallest)')
    args = ap.parse_args()

    lines, skipped = resolve(scan())
    if args.list:
        for k, e in lines.items(): print(f"{k}  [{e['phase']:>8}]  {e['text']}{'   (pattern)' if 'pattern' in e else ''}")
        for s in skipped: print('SKIPPED (no TEMPLATES entry):', s)
        print(f'{len(lines)} lines, {len(skipped)} skipped')
        return

    OUT.mkdir(parents=True, exist_ok=True)
    mpath = OUT / 'manifest.json'
    old = json.loads(mpath.read_text()) if mpath.exists() else {}
    old_lines = old.get('lines', {})
    pipe = None
    made = 0
    for k, e in lines.items():
        speed = speed_for(e['text'])
        sig = hashlib.sha1(json.dumps([GEN_VERSION, VOICE, spoken_form(e['text']), speed, args.quality]).encode()).hexdigest()[:10]
        f = OUT / f'{k}.ogg'
        prev = old_lines.get(k)
        if not args.force and prev and prev.get('sig') == sig and f.exists():
            e.update(dur=prev['dur'], sig=sig); continue
        if pipe is None:
            import warnings; warnings.filterwarnings('ignore')
            import torch
            torch.set_num_threads(args.threads)  # a few threads beat many on a busy machine
            from kokoro import KPipeline
            pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M')
        import soundfile as sf
        a = synth(pipe, e['text'], speed)
        sf.write(f, a, SR, format='OGG', subtype='VORBIS', compression_level=args.quality)
        e.update(dur=round(len(a) / SR, 3), sig=sig)
        made += 1
        old_lines[k] = {'text': e['text'], 'dur': e['dur'], 'sig': sig}  # so an interrupted run resumes here
        mpath.write_text(json.dumps({**old, 'lines': old_lines}, indent=1, ensure_ascii=False) + '\n')
        print(f"made {k}  {e['dur']:5.2f}s  x{speed}  {e['text']}")
    # clips whose lines are gone
    removed = 0
    for f in OUT.glob('*.ogg'):
        if f.stem not in lines: f.unlink(); removed += 1
    order = ['opening', 'rescue', 'helm', 'orpheus', 'free']
    phases = order + sorted({e['phase'] for e in lines.values()} - set(order))
    manifest = {
        'voice': f'Kokoro-82M {VOICE} (Apache-2.0)', 'sampleRate': SR, 'phases': phases,
        'lines': {k: {kk: e[kk] for kk in ('text', 'pattern', 'phase', 'dur', 'sig', 'where') if kk in e} for k, e in sorted(lines.items(), key=lambda kv: (phases.index(kv[1]['phase']), kv[1]['where'][0]))},
    }
    mpath.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')
    total = sum(f.stat().st_size for f in OUT.glob('*.ogg'))
    print(f'{len(lines)} lines: {made} made, {len(lines) - made} kept, {removed} removed; {total / 1e6:.2f} MB of audio')
    for s in skipped: print('SKIPPED (no TEMPLATES entry, falls back to the procedural voice):', s, file=sys.stderr)


if __name__ == '__main__':
    main()
