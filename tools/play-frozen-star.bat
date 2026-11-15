@echo off
setlocal
rem Opens Frozen Star, the black hole relativity game, in your browser (this PC only).
rem No GitHub or sign-in: it copies the current files from the clone in WSL, or runs the
rem last copy if WSL is not available. Close this window to stop the game's server.
rem Options:
rem   play-frozen-star.bat lowgpu         smaller, cheaper 3D render for slow graphics
rem   play-frozen-star.bat observatory    open straight into the observatory
rem   play-frozen-star.bat into-the-dark  open a chapter by name

set "FS_DIR=%USERPROFILE%\frozen-star-play"
set "FS_SRC=\\wsl$\Ubuntu\root\frozen-star"
if not defined FS_PORT set "FS_PORT=8640"
set "QUERY="
set "HASH="
for %%a in (%*) do (
    if /i "%%~a"=="lowgpu" (set "QUERY=?lowgpu") else (set "HASH=#%%~a")
)
set "URL=http://127.0.0.1:%FS_PORT%/%QUERY%%HASH%"

where py >nul 2>nul || (
    echo Frozen Star needs Python 3 to serve its files. Installing it with winget ...
    winget install --id Python.Python.3.13 -e --accept-source-agreements --accept-package-agreements || (echo Install it from https://www.python.org/downloads/ & pause & exit /b 1)
    echo Python installed. Close this window and run the script again.
    pause
    exit /b 0
)

if exist "%FS_SRC%\index.html" (
    echo Copying the latest files from WSL ...
    robocopy "%FS_SRC%" "%FS_DIR%" /MIR /XD .git node_modules /NFL /NDL /NJH /NJS /NP >nul
    if errorlevel 8 (echo Copying failed. & pause & exit /b 1)
) else (
    echo WSL is not available, using the last copy.
)
if not exist "%FS_DIR%\index.html" (echo No copy of Frozen Star yet. Start WSL and run this again. & pause & exit /b 1)

rem Already running? The files above are fresh and the server never caches, so just open the browser.
curl.exe -s -o NUL "http://127.0.0.1:%FS_PORT%/index.html" && (start "" "%URL%" & exit /b 0)

title Frozen Star
rem tools\serve.py serves this PC only, with fresh URLs on every launch so the browser never runs an old copy.
if defined FS_NO_BROWSER (
    py -3 "%FS_DIR%\tools\serve.py" "%FS_DIR%" %FS_PORT%
) else (
    py -3 "%FS_DIR%\tools\serve.py" "%FS_DIR%" %FS_PORT% --open "%URL%"
)
if errorlevel 1 pause
