@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

:: 1) Define paths
set "ZIP_PATH=%~dp0chromium.zip"
set "EXTRACT_DIR=%~dp0chromium"

echo.
echo Fetching latest Chromium revision number…

:: 2) Use PowerShell to get the latest revision (LAST_CHANGE)
for /f "usebackq tokens=*" %%R in (`powershell -NoProfile -Command "Invoke-RestMethod 'https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win/LAST_CHANGE'"`) do (
    set "REVISION=%%R"
)

if not defined REVISION (
    echo [ERROR] Could not retrieve latest revision!
    exit /b 1
)

echo Latest revision is %REVISION%.

:: 3) Construct the download URL
set "DOWNLOAD_URL=https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win/%REVISION%/chrome-win.zip"

echo.
echo Downloading Chromium from:
echo   %DOWNLOAD_URL%
echo to:
echo   %ZIP_PATH%

:: 4) Download using PowerShell (no curl needed)
powershell -NoProfile -Command ^
    "Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ZIP_PATH%' -UseBasicParsing" || (
    echo [ERROR] Download failed!
    exit /b 1
)

:: 5) If the folder exists, delete it
if exist "%EXTRACT_DIR%" (
    echo Removing existing folder "%EXTRACT_DIR%"…
    rmdir /s /q "%EXTRACT_DIR%"
)

:: 6) Unzip via PowerShell’s Expand-Archive
echo Extracting to "%EXTRACT_DIR%"…
powershell -NoProfile -Command ^
    "Expand-Archive -LiteralPath '%ZIP_PATH%' -DestinationPath '%EXTRACT_DIR%' -Force" || (
    echo [ERROR] Extraction failed!
    exit /b 1
)

:: 7) Cleanup
echo Cleaning up…
del /q "%ZIP_PATH%"

echo.
echo ✔ Chromium (rev %REVISION%) has been downloaded and extracted to:
echo   %EXTRACT_DIR%
ENDLOCAL
exit /b 0
