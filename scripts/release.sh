#!/bin/bash
# WeComProxy Release Script
# Usage: ./scripts/release.sh [version]
# Example: ./scripts/release.sh 1.0.1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if git is clean
check_git_status() {
    if [ -n "$(git status --porcelain)" ]; then
        error "Git working directory is not clean. Please commit or stash your changes."
    fi

    if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
        error "Not on main branch. Please switch to main branch before releasing."
    fi
}

# Validate version format
validate_version() {
    local version=$1
    if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        error "Invalid version format. Use semantic versioning (e.g., 1.0.1)"
    fi
}

# Check if version already exists
check_version_exists() {
    local version=$1
    if git tag | grep -q "^v${version}$"; then
        error "Version v${version} already exists"
    fi
}

# Update version in package.json
update_package_version() {
    local version=$1
    info "Updating package.json version to ${version}"

    # Update package.json (if using Node.js)
    if [ -f "package.json" ]; then
        # Use sed for cross-platform compatibility
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/\"version\": \".*\"/\"version\": \"${version}\"/" package.json
        else
            sed -i "s/\"version\": \".*\"/\"version\": \"${version}\"/" package.json
        fi
        success "Updated package.json"
    fi
}

# Update CHANGELOG.md
update_changelog() {
    local version=$1
    local date=$(date +%Y-%m-%d)

    info "Updating CHANGELOG.md"

    if [ -f "CHANGELOG.md" ]; then
        # Create backup
        cp CHANGELOG.md CHANGELOG.md.bak

        # Add new version entry
        {
            echo "# Changelog"
            echo ""
            echo "## [${version}] - ${date}"
            echo ""
            echo "### Added"
            echo "- New features and enhancements"
            echo ""
            echo "### Changed"
            echo "- Updates and improvements"
            echo ""
            echo "### Fixed"
            echo "- Bug fixes"
            echo ""
            echo "---"
            echo ""
            tail -n +2 CHANGELOG.md.bak
        } > CHANGELOG.md

        rm CHANGELOG.md.bak
        success "Updated CHANGELOG.md"
        warning "Please edit CHANGELOG.md to add actual changes for this release"

        # Open editor if available
        if command -v code >/dev/null 2>&1; then
            info "Opening CHANGELOG.md in VS Code..."
            code CHANGELOG.md
        elif command -v nano >/dev/null 2>&1; then
            info "Opening CHANGELOG.md in nano..."
            nano CHANGELOG.md
        fi

        read -p "Press Enter after updating CHANGELOG.md to continue..."
    else
        warning "CHANGELOG.md not found, skipping changelog update"
    fi
}

# Create and push tag
create_tag() {
    local version=$1
    local tag="v${version}"

    info "Creating tag ${tag}"

    # Create annotated tag
    git tag -a "${tag}" -m "Release version ${version}"

    success "Created tag ${tag}"

    info "Pushing tag to origin..."
    git push origin "${tag}"

    success "Tag pushed to origin"
}

# Main release process
main() {
    echo ""
    info "🚀 WeComProxy Release Script"
    echo ""

    # Get version from argument or prompt
    local version=$1
    if [ -z "$version" ]; then
        read -p "Enter version number (e.g., 1.0.1): " version
    fi

    # Validate inputs
    validate_version "$version"
    check_git_status
    check_version_exists "$version"

    info "Preparing release for version ${version}"
    echo ""

    # Confirm release
    warning "This will:"
    echo "  1. Update package.json version"
    echo "  2. Update CHANGELOG.md"
    echo "  3. Commit changes"
    echo "  4. Create and push tag v${version}"
    echo "  5. Trigger GitHub Actions to build Docker images"
    echo "  6. Create GitHub Release automatically"
    echo ""

    read -p "Continue with release? (y/N): " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Release cancelled"
    fi

    echo ""
    info "Starting release process..."

    # Update files
    update_package_version "$version"
    update_changelog "$version"

    # Commit changes
    info "Committing version changes..."
    git add package.json CHANGELOG.md
    git commit -m "chore: bump version to ${version}

- Updated package.json version
- Updated CHANGELOG.md with release notes"

    success "Committed version changes"

    # Push changes
    info "Pushing changes to origin..."
    git push origin main
    success "Changes pushed to origin"

    # Create and push tag
    create_tag "$version"

    echo ""
    success "🎉 Release ${version} completed!"
    echo ""
    info "Next steps:"
    echo "  1. GitHub Actions will automatically build Docker images"
    echo "  2. Docker images will be available at:"
    echo "     - ghcr.io/andywangm/wecomproxy:v${version}"
    echo "     - ghcr.io/andywangm/wecomproxy:latest"
    echo "  3. GitHub Release will be created automatically"
    echo "  4. Check the Actions tab for build progress:"
    echo "     https://github.com/AndyWangM/WeComProxy/actions"
    echo ""
}

# Run main function
main "$@"