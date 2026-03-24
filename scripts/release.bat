@echo off
:: WeComProxy Release Script for Windows
:: Usage: scripts\release.bat [version]
:: Example: scripts\release.bat 1.0.1

setlocal enabledelayedexpansion

:: Check if version is provided
set "version=%1"
if "%version%"=="" (
    set /p "version=Enter version number (e.g., 1.0.1): "
)

:: Validate version format (basic check)
echo %version% | findstr /r "^[0-9]*\.[0-9]*\.[0-9]*$" >nul
if errorlevel 1 (
    echo ❌ Invalid version format. Use semantic versioning (e.g., 1.0.1)
    exit /b 1
)

:: Check if git is clean
for /f %%i in ('git status --porcelain') do (
    echo ❌ Git working directory is not clean. Please commit or stash your changes.
    exit /b 1
)

:: Check if on main branch
for /f %%i in ('git rev-parse --abbrev-ref HEAD') do set "current_branch=%%i"
if not "%current_branch%"=="main" (
    echo ❌ Not on main branch. Please switch to main branch before releasing.
    exit /b 1
)

:: Check if tag already exists
git tag | findstr /c:"v%version%" >nul
if not errorlevel 1 (
    echo ❌ Version v%version% already exists
    exit /b 1
)

echo.
echo 🚀 WeComProxy Release Script
echo.
echo ℹ️  Preparing release for version %version%
echo.

:: Show what will happen
echo ⚠️  This will:
echo   1. Update package.json version
echo   2. Update CHANGELOG.md
echo   3. Commit changes
echo   4. Create and push tag v%version%
echo   5. Trigger GitHub Actions to build Docker images
echo   6. Create GitHub Release automatically
echo.

set /p "confirm=Continue with release? (y/N): "
if /i not "%confirm%"=="y" (
    echo ❌ Release cancelled
    exit /b 1
)

echo.
echo ℹ️  Starting release process...

:: Update package.json version
echo ℹ️  Updating package.json version to %version%
if exist "package.json" (
    powershell -Command "(Get-Content package.json) -replace '\"version\": \".*\"', '\"version\": \"%version%\"' | Set-Content package.json"
    echo ✅ Updated package.json
)

:: Update CHANGELOG.md
echo ℹ️  Updating CHANGELOG.md
if exist "CHANGELOG.md" (
    :: Get current date
    for /f %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd'"') do set "current_date=%%i"

    :: Create new changelog content
    echo # Changelog > CHANGELOG_new.md
    echo. >> CHANGELOG_new.md
    echo ## [%version%] - %current_date% >> CHANGELOG_new.md
    echo. >> CHANGELOG_new.md
    echo ### Added >> CHANGELOG_new.md
    echo - New features and enhancements >> CHANGELOG_new.md
    echo. >> CHANGELOG_new.md
    echo ### Changed >> CHANGELOG_new.md
    echo - Updates and improvements >> CHANGELOG_new.md
    echo. >> CHANGELOG_new.md
    echo ### Fixed >> CHANGELOG_new.md
    echo - Bug fixes >> CHANGELOG_new.md
    echo. >> CHANGELOG_new.md
    echo --- >> CHANGELOG_new.md
    echo. >> CHANGELOG_new.md

    :: Append existing content (skip first line)
    more +1 CHANGELOG.md >> CHANGELOG_new.md
    move CHANGELOG_new.md CHANGELOG.md

    echo ✅ Updated CHANGELOG.md
    echo ⚠️  Please edit CHANGELOG.md to add actual changes for this release

    :: Try to open editor
    if exist "%ProgramFiles%\Microsoft VS Code\Code.exe" (
        echo ℹ️  Opening CHANGELOG.md in VS Code...
        "%ProgramFiles%\Microsoft VS Code\Code.exe" CHANGELOG.md
    ) else (
        echo ℹ️  Please edit CHANGELOG.md manually
        notepad CHANGELOG.md
    )

    pause
)

:: Commit changes
echo ℹ️  Committing version changes...
git add package.json CHANGELOG.md
git commit -m "chore: bump version to %version%

- Updated package.json version
- Updated CHANGELOG.md with release notes"

if errorlevel 1 (
    echo ❌ Failed to commit changes
    exit /b 1
)
echo ✅ Committed version changes

:: Push changes
echo ℹ️  Pushing changes to origin...
git push origin main
if errorlevel 1 (
    echo ❌ Failed to push changes
    exit /b 1
)
echo ✅ Changes pushed to origin

:: Create and push tag
echo ℹ️  Creating tag v%version%
git tag -a "v%version%" -m "Release version %version%"
if errorlevel 1 (
    echo ❌ Failed to create tag
    exit /b 1
)
echo ✅ Created tag v%version%

echo ℹ️  Pushing tag to origin...
git push origin "v%version%"
if errorlevel 1 (
    echo ❌ Failed to push tag
    exit /b 1
)
echo ✅ Tag pushed to origin

echo.
echo 🎉 Release %version% completed!
echo.
echo ℹ️  Next steps:
echo   1. GitHub Actions will automatically build Docker images
echo   2. Docker images will be available at:
echo      - ghcr.io/andywangm/wecomproxy:v%version%
echo      - ghcr.io/andywangm/wecomproxy:latest
echo   3. GitHub Release will be created automatically
echo   4. Check the Actions tab for build progress:
echo      https://github.com/AndyWangM/WeComProxy/actions
echo.

pause