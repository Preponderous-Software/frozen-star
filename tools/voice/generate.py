#!/usr/bin/env python3
"""Voice the crew with Kokoro-82M: Ines (af_sky, American) and WREN, the Tern's ship AI (bm_george, British).

Scans the game source for every line each speaker says, synthesises the lines that have no clip yet, and
writes assets/voice/<speaker>/<key>.ogg plus assets/voice/<speaker>/manifest.json. The game plays a clip
when the line it is about to show matches one in that speaker's manifest; any other line keeps working
exactly as before (the procedural radio voice for Ines, silence for WREN).

Re-runnable, incremental and resumable: a clip is only re-made when its spoken text or its voice settings
change, the manifest is saved after every clip, a clip whose line only moved or changed its subtitle (same
spoken text and settings) is reused rather than re-made, and clips whose lines have left the source are
deleted.

    /root/.venvs/kokoro/bin/python tools/voice/generate.py                 # generate what is missing, both voices
    /root/.venvs/kokoro/bin/python tools/voice/generate.py --speaker wren  # one voice only
    /root/.venvs/kokoro/bin/python tools/voice/generate.py --list          # only list the lines found
    /root/.venvs/kokoro/bin/python tools/voice/generate.py --force         # re-make every clip

Setup (once): uv venv --python 3.11 /root/.venvs/kokoro, then install torch (CPU), kokoro, soundfile,
pyloudnorm and the spaCy model en_core_web_sm into it. Kokoro-82M is Apache-2.0
(https://github.com/hexgrad/kokoro, https://huggingface.co/hexgrad/Kokoro-82M).

Where the source finds a line (SPEAKER is INES or WREN):
  - say('SPEAKER', <expr>) or g.say(...), and every ['SPEAKER', <expr>] pair (reactions, chats, readables),
    where <expr> is a string, a ternary of strings (every branch is a line) or a const holding one;
  - every string in an array constant named INES_* (the rescue's radio lines, which carry no speaker tag);
  - WREN only: each objective's idle hint, g.objective(..., { hint: '...' }), which WREN speaks.
Template literals with computed numbers are handled by each speaker's templates (see TEMPLATES below); one
that is not covered is reported and skipped, so it keeps its old behaviour.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SR = 24000
TARGET_LUFS = -18.0
PEAK_CEIL = 10 ** (-1.5 / 20)  # -1.5 dBFS
GEN_VERSION = 1  # bump to re-make every clip after a change to the processing below

# ---------- computed lines ----------
# Every ${expression} in a template literal is either
#   - evaluated once with node (EVAL: it is a constant of the game, so the line is spoken exactly as shown),
#   - or the line gets a number-free spoken form ('spoken'), matched at runtime by a pattern built from the
#     template (for a value that depends on how the player played: too many values to record),
#   - or one clip per value it can take ('variants'), for a value with only a handful of possible values.
# The subtitle always shows the real line. Keys of EVAL are the expression's source text exactly.
NODE_PRELUDE = """
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
const ROOT = pathToFileURL(process.cwd() + '/');
// story.js imports three by its bare name, as the page's import map does
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) {
  return s === 'three' ? { url: ${JSON.stringify(new URL('vendor/three/three.module.min.js', ROOT).href)}, shortCircuit: true } : n(s, c); }`));
const imp = (p) => import(new URL(p, ROOT).href);
const body = await imp('src/physics/body.js'), units = await imp('src/physics/units.js'), world = await imp('src/game/world.js');
const { Infall } = await imp('src/physics/infall.js'), { lapDrift } = await imp('src/physics/photon-orbit.js');
const { PHOTON_SPHERE } = await imp('src/physics/light.js');
const { shadowDeg } = await imp('src/game/story.js'), { HALO } = await imp('src/game/act-halo.js');
const { tidalStretch, maxTimeInside, hoverRate } = body, { G_EARTH, formatAccel } = units, { HOLE, SEC_PER_M, R_STATION } = world;
const secs = (m) => m * SEC_PER_M;
const f = new Infall(R_STATION); // every fall in the story (K-1, K-2, the capsule, Orpheus) starts at the station
const R_FLOOR = 2.06; // the lowest altitude the helm allows (1.03 rₛ), as in audio.js
const range = (a, b, n, fn) => [...new Set(Array.from({ length: n + 1 }, (_, i) => fn(a + (b - a) * i / n)))];
"""

INES = {
    'name': 'INES', 'dir': 'ines', 'voice': 'af_sky', 'lang': 'a',
    'templates': [
        {  # deep is the deepest altitude the player held at, 1.03..1.33 rₛ: 31 values for one line. The
           # number is on screen in the subtitle; the voice says it without.
            'match': 'deep.toFixed(2)',
            'spoken': 'When it passes the depth where we hovered, will its picture go all black, like our window did?',
        },
    ],
    'eval': {
        'tideG.toFixed(2)': '(tidalStretch(2, HOLE.mass) / G_EARTH).toFixed(2)',
        'maxTimeInside(M).toFixed(1)': 'maxTimeInside(HOLE.mass).toFixed(1)',
    },
    # lines that are never heard: sent from inside the horizon, so their light never arrives
    'never': {"...it's so quiet in here."},
    # Kokoro has no emotion control; delivery comes from speed and punctuation. Ines is warm and wry at a
    # relaxed pace, quicker and tighter as the rescue goes wrong. Keys are substrings of the line.
    'speed': {
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
    },
    'default_speed': 0.97,
    # how Kokoro should say what the subtitle writes (pronunciation only; meaning never changes)
    'say_as': [
        (r'\bWREN\b', 'Wren'),
        (r'rₛ', 'R S'),
        (r'(\d) g\b', r'\1 gee'),
        (r'\bdoc\b', 'doc'),
    ],
    'phases': {},
}


def _radii(m):
    n = m.group(1)
    n = n.rstrip('0').rstrip('.') if '.' in n else n
    return f'{n} horizon radii' if n != '1' else 'one horizon radius'


SUPER = str.maketrans('⁰¹²³⁴⁵⁶⁷⁸⁹⁻', '0123456789-')

WREN = {
    'name': 'WREN', 'dir': 'wren', 'voice': 'bm_george', 'lang': 'b',
    'templates': [
        # How long before the deadline the player fired, and how far out her picture was then: both depend
        # on the moment of firing (any of ~30 s, to a tenth of rₛ). The voice keeps the point, not the figures.
        {'match': 'g.flags.stats.marginS',
         'spoken': 'You fired before the last possible moment. At that moment your screen showed her still well above the horizon, looking almost normal.'},
        # where the beam caught her, inside the horizon: depends on when it was fired
        {'match': '(result.r / 2).toFixed(2)',
         'spoken': 'The beam reached the capsule inside the horizon. Her engine cannot help her there.'},
        # how much the relay aged while the ship was down: as long as the player chose to stay
        {'match': 'Math.round(lost)',
         'spoken': 'Back at station. The rest of the universe aged more than we did down there.'},
        # the shadow at the depth the player held (1.03..1.33 rₛ): three numbers from one of 31 depths
        {'match': 'Math.round(shadowDeg(r))',
         'spoken': 'No. Hovering there, the shadow covered most of our sky. Orpheus will pass that spot at nearly the speed of light, and its motion swings the sky ahead of it. It will see the shadow much smaller.'},
        # the field's acceleration anywhere below 1.1 rₛ: a continuous value
        {'match': 'hoverAccel(g.shipR, M)',
         'spoken': 'The field is pushing against an enormous pull to hold us here. Nobody aboard feels a thing.'},
        # the relay rate at the helm's floor (below 1.04 rₛ down to 1.03 rₛ): only 5.1 to 5.9, so each is recorded
        {'match': '(1 / hoverRate(g.shipR)).toFixed(1)',
         'variants': 'range(R_FLOOR, 2.08, 400, (r) => (1 / hoverRate(r)).toFixed(1))'},
    ],
    'eval': {
        # the window line only fires while the ship holds station
        'Math.round(d)': 'Math.round(shadowDeg(R_STATION))',
        'Math.round(d / 0.52)': 'Math.round(shadowDeg(R_STATION) / 0.52)',
        'Math.round(secs(A9))': 'Math.round(secs(f.messageArrival(90)))',
        'Math.round(secs(f.tauH))': 'Math.round(secs(f.tauH))',
        'Math.round(secs(run.f.tauH))': 'Math.round(secs(f.tauH))',
        'Math.round(secs(D))': 'Math.round(secs(f.rescueDeadline))',
        'formatAccel(tidalStretch(2, 10))': 'formatAccel(tidalStretch(2, 10))',
        'Math.round(shadowDeg(PHOTON_SPHERE))': 'Math.round(shadowDeg(PHOTON_SPHERE))',
        'LAP_S.toFixed(1)': 'HALO.LAP_S.toFixed(1)',
        'LAP_S.toFixed(0)': 'HALO.LAP_S.toFixed(0)',
        'Math.round(LAP_S * 2)': 'Math.round(HALO.LAP_S * 2)',
        'LAP_FAR_S.toFixed(1)': 'HALO.LAP_FAR_S.toFixed(1)',
        'HALO.LOCK_LAP_M.toFixed(1)': 'HALO.LOCK_LAP_M.toFixed(1)',
        # fmtKm in act-halo.js: above a million km it writes "3.34 million km"
        'fmtKm(LAP_KM)': "HALO.LAP_KM >= 1e6 ? (HALO.LAP_KM / 1e6).toFixed(2) + ' million km' : Math.round(HALO.LAP_KM).toLocaleString('en') + ' km'",
        'Math.round(MAST_LAP1)': 'Math.round(HALO.MAST_LAP1)',
        'Math.round(MAST_LAP2_KM)': 'Math.round(HALO.MAST_LAP2_KM)',
        'Math.round(lapDrift(1, 1))': 'Math.round(lapDrift(1, 1))',
    },
    'never': set(),
    # WREN is calm, precise and dryly warm: a measured pace throughout, a touch quicker for the mayday and
    # the pulses, slower where it lets a point land.
    'speed': {
        'lost main power': 1.02,
        'Pulse away.': 1.0,
        'Mast pulse away.': 1.0,
        'Capsule away.': 0.98,
        'The recall beam travels at light speed': 1.0,
        'I can compute the deadline': 1.0,
        'You did not fire.': 0.9,
        'Only Orpheus saw it.': 0.88,
        'Same place, different motion': 0.9,
        'I did not log it.': 0.92,
        'Erebus will keep.': 0.92,
    },
    'default_speed': 0.95,
    # Pronunciation only. Kokoro reads [word](/IPA/) as a phoneme override; the British (b) lexicon is used.
    # Checked against its G2P: Erebus (ˈɛɹɪbəs), Orpheus (ˈɔːfɪəs), Tern, Doctor and "radii" are right as
    # written; Ines comes out ɪnˈiːz and Schwarzschild ʃwˈɔːzskIld, so those two are given.
    'say_as': [
        (r'\bWREN\b', 'Wren'),
        (r"\bInes('s)?\b", lambda m: f"[Ines{m.group(1) or ''}](/ˈiːnɛs{'ɪz' if m.group(1) else ''}/)"),  # EE-ness
        (r'\bSchwarzschild\b', '[Schwarzschild](/ʃwˈɔːtsʃɪld/)'),
        # rₛ after a number is a height or a distance: "horizon radii", as WREN says it elsewhere
        (r'(\d+(?:\.\d+)?)\s*rₛ', _radii),
        (r'rₛ', 'R S'),
        (r'τ', 'tau'),
        (r'1\s*\+\s*z\b', 'one plus zed'),
        (r'\bK-(\d)\b', r'K \1'),
        (r'\b0(\d):(\d\d)\b', r'oh \1 \2'),  # ship time, 06:40
        (r'\bten M\b', 'ten em'),  # M, the hole's natural unit of time
        (r'(\d(?:\.\d+)?)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)', lambda m: f'{m.group(1)} times ten to the power of {m.group(2).translate(SUPER)}'),
        (r'(\d) g\b', r'\1 gee'),
        (r'(\d)%', r'\1 percent'),
        (r'\bkm\b', 'kilometres'),
    ],
    # WREN's ambient reactions (the window, the lab, the quarters) can come from the first minute on
    'phases': {'reactions': 'opening'},
}

SPEAKERS = {'ines': INES, 'wren': WREN}


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


def expr_literals(src, i):
    """The string literals at the top level of the JS expression starting at src[i] (every branch of a
    ternary), and the expression's source when it holds none."""
    j, depth, hits = i, 0, []
    while j < len(src):
        c = src[j]
        if c in '\'"`':
            if depth == 0: hits.append(j)
            _, _, j = read_literal(src, j); continue
        if src.startswith('//', j):
            j = src.index('\n', j); continue
        if c in '([{': depth += 1
        elif c in ')]}':
            if depth == 0: break
            depth -= 1
        elif c == ',' and depth == 0: break
        j += 1
    return hits, src[i:j].strip()


def unescape(body):
    return re.sub(r"\\(.)", lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), body)


def phase_of(spk, path, src, pos):
    """The act a line belongs to, for lazy loading: its enclosing top-level declaration in story.js, or its file."""
    if path.name != 'story.js':
        # the capsule bay's intercom and the ship's readables can come at any time from the first minute
        return {'bay': 'opening', 'ship': 'opening'}.get(path.stem, path.stem.replace('act-', ''))
    decls = [(m.start(), m.group(1)) for m in re.finditer(r'^(?:export )?(?:async )?(?:function|const) (\w+)', src, re.M)]
    name = None
    for p, n in decls:
        if p < pos: name = n
    return {
        'dream': 'opening', 'wake': 'opening', 'toBridge': 'opening', 'beaconAct': 'opening', 'baseHandlers': 'opening',
        'INES_LINES': 'rescue', 'rescueAct': 'rescue', 'rescueAttempt': 'rescue',
        'reactions': 'helm', 'helmAct': 'helm', 'orpheusAct': 'orpheus',
        'epilogue': 'free', 'freeRoam': 'free', 'logbook': 'free',
        **spk['phases'],
    }.get(name, 'free')


def scan(spk):
    name = spk['name']
    found = []  # (text or template, is_template, file, line, phase)
    for path in sorted((ROOT / 'src').rglob('*.js')):
        src = path.read_text(encoding='utf-8')
        hits = []
        for m in re.finditer(r"""[(\[]\s*['"]""" + name + r"""['"]\s*,\s*""", src):
            lits, expr = expr_literals(src, m.end())
            hits += lits
            # a line held in a constant first: const lit = '...'; ... say('INES', lit)
            if not lits and re.fullmatch(r'[A-Za-z_]\w*', expr):
                d = re.search(r'\b(?:const|let)\s+' + expr + r"""\s*=\s*(?=['"`])""", src)
                if d: hits.append(d.end())
        for m in re.finditer(r'\b(' + name + r'_[A-Z_]+)\s*=\s*\[', src):
            # every string literal inside the array (balanced brackets)
            j, depth = m.end(), 1
            while j < len(src) and depth:
                c = src[j]
                if c in '\'"`':
                    hits.append(j); _, _, j = read_literal(src, j); continue
                if src.startswith('//', j):
                    j = src.index('\n', j); continue
                depth += c == '['; depth -= c == ']'; j += 1
        if name == 'WREN':
            # objective hints: game.js shows them as WREN's lines
            for m in re.finditer(r'\bg\.objective\(', src):
                h = re.compile(r"""\bhint:\s*(?=['"`])""").search(src, m.end(), src.find('\n', m.end()))
                if h: hits.append(h.end())
        for at in hits:
            body, q, _ = read_literal(src, at)
            line = src.count('\n', 0, at) + 1
            found.append((unescape(body) if q != '`' or '${' not in body else body, q == '`' and '${' in body,
                          str(path.relative_to(ROOT)), line, phase_of(spk, path, src, at)))
    return found


def node_eval(exprs):
    if not exprs:
        return {}
    js = NODE_PRELUDE + f'const E = {{{", ".join(f"{json.dumps(k)}: () => {v}" for k, v in exprs.items())}}};\n' \
        'console.log(JSON.stringify(Object.fromEntries(Object.entries(E).map(([k, f]) => { const v = f(); return [k, Array.isArray(v) ? v.map(String) : String(v)]; }))));'
    out = subprocess.run(['node', '--input-type=module', '-e', js], cwd=ROOT, capture_output=True, text=True)
    if out.returncode: sys.exit('node evaluation failed:\n' + out.stderr)
    return json.loads(out.stdout)


EXPR = r'\$\{((?:[^{}]|\{[^{}]*\})*)\}'


def resolve(spk, found):
    """Turn scan hits into lines: {key: {text, phase, where, pattern?}}, plus skipped templates."""
    lines, skipped = {}, []
    evals = dict(spk['eval'])
    for t in spk['templates']:
        if 'variants' in t: evals['@' + t['match']] = t['variants']
    values = node_eval(evals)

    def add(text, phase, where, pattern=None):
        if text in spk['never']: return
        k = key_of(pattern or text)
        e = lines.setdefault(k, {'text': text, 'phase': phase, 'where': []})
        if where not in e['where']: e['where'].append(where)  # file only: line numbers would churn on every edit
        if pattern: e['pattern'] = pattern

    for text, tpl, where, ln, phase in found:
        if not tpl:
            add(text, phase, where); continue
        spec = next((t for t in spk['templates'] if t['match'] in text), None)
        if spec and 'spoken' in spec:
            parts = re.split(EXPR, text)[::2]
            add(spec['spoken'], phase, where, '^' + '.+?'.join(re.escape(unescape(p)) for p in parts) + '$')
            continue
        if spec and 'variants' in spec:
            for v in values['@' + spec['match']]:
                add(unescape(re.sub(EXPR, lambda m: v if m.group(1) == spec['match'] else values[m.group(1)], text)), phase, where)
            continue
        missing = [x for x in re.findall(EXPR, text) if x not in values]
        if missing:
            skipped.append(f'{where}:{ln}  {text}'); continue
        add(unescape(re.sub(EXPR, lambda m: values[m.group(1)], text)), phase, where)
    return lines, skipped


# ---------- synthesis ----------
def speed_for(spk, text):
    for k, v in spk['speed'].items():
        if k in text: return v
    return spk['default_speed']


def spoken_form(spk, text):
    s = text
    for a, b in spk['say_as']: s = re.sub(a, b, s)
    return s


def synth(pipe, spk, text, speed):
    import numpy as np
    chunks = []
    for _, _, audio in pipe(spoken_form(spk, text), voice=spk['voice'], speed=speed):
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


def generate(spk, args):
    out_dir = ROOT / 'assets' / 'voice' / spk['dir']
    lines, skipped = resolve(spk, scan(spk))
    if args.list:
        for k, e in lines.items():
            sp = spoken_form(spk, e['text'])
            print(f"{k}  [{e['phase']:>8}]  {e['text']}{'   (pattern)' if 'pattern' in e else ''}{chr(10) + ' ' * 26 + '-> ' + sp if sp != e['text'] else ''}")
        for s in skipped: print('SKIPPED (no template):', s)
        print(f"{spk['name']}: {len(lines)} lines, {len(skipped)} skipped\n")
        return

    out_dir.mkdir(parents=True, exist_ok=True)
    mpath = out_dir / 'manifest.json'
    old = json.loads(mpath.read_text()) if mpath.exists() else {}
    old_lines = old.get('lines', {})
    by_sig = {v['sig']: k for k, v in old_lines.items() if (out_dir / f'{k}.ogg').exists()}
    pipe = None
    made = reused = 0
    # short lines first, so a partial run voices as many lines as it can
    for k, e in sorted(lines.items(), key=lambda kv: len(kv[1]['text'])):
        speed = speed_for(spk, e['text'])
        sig = hashlib.sha1(json.dumps([GEN_VERSION, spk['voice'], spoken_form(spk, e['text']), speed, args.quality]).encode()).hexdigest()[:10]
        f = out_dir / f'{k}.ogg'
        prev = old_lines.get(k)
        if not args.force and prev and prev.get('sig') == sig and f.exists():
            e.update(dur=prev['dur'], sig=sig); continue
        if not args.force and sig in by_sig and by_sig[sig] != k:
            # the same recording under a new key (its subtitle changed, not what is said): copy, never re-make
            src_k = by_sig[sig]
            shutil.copyfile(out_dir / f'{src_k}.ogg', f)
            e.update(dur=old_lines[src_k]['dur'], sig=sig); reused += 1
        else:
            if pipe is None:
                import warnings; warnings.filterwarnings('ignore')
                import torch
                torch.set_num_threads(args.threads)  # a few threads beat many on a busy machine
                from kokoro import KPipeline
                pipe = KPipeline(lang_code=spk['lang'], repo_id='hexgrad/Kokoro-82M')
            import soundfile as sf
            a = synth(pipe, spk, e['text'], speed)
            sf.write(f, a, SR, format='OGG', subtype='VORBIS', compression_level=args.quality)
            e.update(dur=round(len(a) / SR, 3), sig=sig)
            made += 1
            print(f"{spk['name']} made {k}  {e['dur']:5.2f}s  x{speed}  {e['text']}", flush=True)
        old_lines[k] = {'text': e['text'], 'dur': e['dur'], 'sig': sig}  # so an interrupted run resumes here
        mpath.write_text(json.dumps({**old, 'lines': old_lines}, indent=1, ensure_ascii=False) + '\n')
    # clips whose lines are gone
    removed = 0
    for f in out_dir.glob('*.ogg'):
        if f.stem not in lines: f.unlink(); removed += 1
    order = ['opening', 'rescue', 'helm', 'orpheus', 'free']
    phases = order + sorted({e['phase'] for e in lines.values()} - set(order))
    manifest = {
        'voice': f"Kokoro-82M {spk['voice']} (Apache-2.0)", 'sampleRate': SR, 'phases': phases,
        'lines': {k: {kk: e[kk] for kk in ('text', 'pattern', 'phase', 'dur', 'sig', 'where') if kk in e} for k, e in sorted(lines.items(), key=lambda kv: (phases.index(kv[1]['phase']), kv[1]['where'][0]))},
    }
    mpath.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + '\n')
    total = sum(f.stat().st_size for f in out_dir.glob('*.ogg'))
    print(f"{spk['name']}: {len(lines)} lines: {made} made, {reused} reused, {len(lines) - made - reused} kept, {removed} removed; {total / 1e6:.2f} MB of audio")
    for s in skipped: print(f"SKIPPED (no template, keeps its old behaviour): {s}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--speaker', choices=[*SPEAKERS, 'all'], default='all', help='which voice to generate (default: all)')
    ap.add_argument('--list', action='store_true', help='list the lines found (and how each is spoken) and exit')
    ap.add_argument('--force', action='store_true', help='re-make every clip')
    ap.add_argument('--threads', type=int, default=4, help='CPU threads for synthesis')
    ap.add_argument('--quality', type=float, default=0.55, help='Vorbis compression level, 0 (best) to 1 (smallest)')
    args = ap.parse_args()
    for name, spk in SPEAKERS.items():
        if args.speaker in (name, 'all'): generate(spk, args)


if __name__ == '__main__':
    main()
