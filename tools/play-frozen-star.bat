@echo off
setlocal
rem Opens Frozen Star, the black hole relativity game, in its own window like the other games.
rem No GitHub or sign-in: it copies the current files from the clone in WSL, or runs the last
rem copy if WSL is not available. The first run downloads the Electron runtime once (about 160 MB).
rem Options:
rem   play-frozen-star.bat browser       play in your web browser instead
rem   play-frozen-star.bat lowgpu        smaller, cheaper 3D render for slow graphics
rem   play-frozen-star.bat fullscreen    start fullscreen (F11 toggles it any time)
rem   play-frozen-star.bat ship          skip the title screen (or a chapter, e.g. observatory)

set "FS_SRC=\\wsl$\Ubuntu\root\frozen-star"
set "MODE=desktop"
set "LOWGPU="
set "FULL="
set "OPEN="
for %%a in (%*) do (
    if /i "%%~a"=="browser" (set "MODE=browser") else if /i "%%~a"=="lowgpu" (set "LOWGPU=1") else if /i "%%~a"=="fullscreen" (set "FULL=1") else (set "OPEN=%%~a")
)
if "%MODE%"=="browser" goto browser

rem ---------------- desktop app ----------------
set "EV=45.2.0"
set "ESHA=8b3475a4c1e56ac70f4802b4fc05db758c8821c766f26445acdb90e3c4e68e71"
if not defined FS_RT set "FS_RT=%USERPROFILE%\frozen-star-desktop"
set "APPDIR=%FS_RT%\resources\app"
if exist "%FS_RT%\Frozen Star.exe" goto haveruntime

echo First run: downloading the Electron %EV% runtime, about 160 MB. This happens once.
set "ZIP=%TEMP%\electron-v%EV%-win32-x64.zip"
curl.exe -L --fail --progress-bar -o "%ZIP%" "https://github.com/electron/electron/releases/download/v%EV%/electron-v%EV%-win32-x64.zip" || (echo The download failed. Check your connection and run this again. & pause & exit /b 1)
set "GOT="
for /f %%h in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 -LiteralPath $env:ZIP).Hash.ToLower()"') do set "GOT=%%h"
if /i not "%GOT%"=="%ESHA%" (echo The download did not match its published checksum, so it was not used. & del "%ZIP%" & pause & exit /b 1)
if exist "%FS_RT%" rmdir /s /q "%FS_RT%"
mkdir "%FS_RT%"
tar.exe -xf "%ZIP%" -C "%FS_RT%" || (echo Unpacking the runtime failed. & pause & exit /b 1)
ren "%FS_RT%\electron.exe" "Frozen Star.exe"
del "%ZIP%"

:haveruntime
if exist "%FS_SRC%\index.html" (
    echo Copying the latest files from WSL ...
    robocopy "%FS_SRC%" "%APPDIR%\game" /MIR /XD .git node_modules desktop docs test /NFL /NDL /NJH /NJS /NP >nul
    if errorlevel 8 (echo Copying failed. & pause & exit /b 1)
    robocopy "%FS_SRC%\desktop" "%APPDIR%" main.cjs package.json icon.png /NFL /NDL /NJH /NJS /NP >nul
) else (
    echo WSL is not available, using the last copy.
)
if not exist "%APPDIR%\main.cjs" (echo No copy of Frozen Star yet. Start WSL and run this again. & pause & exit /b 1)

set "ARGS="
if defined LOWGPU set "ARGS=%ARGS% --lowgpu"
if defined FULL set "ARGS=%ARGS% --fullscreen"
if defined OPEN set "ARGS=%ARGS% --open=%OPEN%"
if defined FS_SMOKE (
    "%FS_RT%\Frozen Star.exe" %ARGS% --smoke=%FS_SMOKE%
    exit /b %ERRORLEVEL%
)
start "" "%FS_RT%\Frozen Star.exe" %ARGS%
exit /b 0

rem ---------------- web browser ----------------
:browser
set "FS_DIR=%USERPROFILE%\frozen-star-play"
if not defined FS_PORT set "FS_PORT=8640"
set "QUERY="
set "HASH="
if defined LOWGPU set "QUERY=?lowgpu"
if defined OPEN set "HASH=#%OPEN%"
set "URL=http://127.0.0.1:%FS_PORT%/%QUERY%%HASH%"

where py >nul 2>nul || (
    echo Browser mode needs Python 3 to serve its files. Installing it with winget ...
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
