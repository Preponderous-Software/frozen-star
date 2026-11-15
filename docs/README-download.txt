Frozen Star @VERSION@
=================

A first-person game about general relativity. You wake aboard the research
ship Tern, hovering above the black hole Erebus, and find out whether things
really fall in. Everything outside the windows is a real light-ray trace
through curved spacetime.

Play
----

Windows desktop app (frozen-star-@VERSION@-win-x64.zip):
    Unzip the folder anywhere and double-click "Frozen Star.exe".
    Windows may say it protected your PC, because the app is not signed:
    choose "More info", then "Run anyway".
    Command-line options: --fullscreen, --lowgpu (cheaper 3D for slow
    graphics), --open=observatory (or another chapter). F11 toggles
    fullscreen.

Web version (frozen-star-@VERSION@-web.zip):
    The game is plain web files, but browsers do not run them straight
    from disk, so serve the folder with any static web server:

        cd frozen-star-@VERSION@-web
        python3 -m http.server 8000      (on Windows: py -3 -m http.server 8000)

    then open http://localhost:8000/ in a current browser.
    Add ?lowgpu to the address on slow machines.

The game needs WebGL 2. Controls: WASD and mouse (click to capture), E to
use, Space to skip a line, Esc to pause. Touch and gamepads work too.
Progress is saved in the browser (or the app) on its own.

More: https://github.com/Preponderous-Software/frozen-star
Play in a browser: https://frozen-star.play.danielstephenson.dev

Frozen Star is MIT-licensed (LICENSE.txt, or LICENSE-frozen-star.txt in the
desktop app). three.js (vendor/three) is MIT licensed by the three.js authors.
The desktop app runs on Electron (MIT; its LICENSE and
LICENSES.chromium.html are next to "Frozen Star.exe").
