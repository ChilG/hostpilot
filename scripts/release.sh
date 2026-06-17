#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       HostPilot Release Utility       ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    exit 1
fi

# Check if node is installed (used for safe JSON/TOML version bumping)
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: node is not installed. Node.js is required for safely bumping versions.${NC}"
    exit 1
fi

# Check if git repository
if [ ! -d .git ]; then
    echo -e "${RED}Error: Not a git repository. Run this script from the workspace root.${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes in your workspace. Please commit or stash them before releasing.${NC}"
    exit 1
fi

# Calculate version options using Node.js
VERSION_JSON=$(node -e "
const pkg = require('./package.json');
const current = pkg.version;
const parts = current.split('.');
const major = parseInt(parts[0], 10) || 0;
const minor = parseInt(parts[1], 10) || 0;
const patch = parseInt(parts[2] ? parts[2].split('-')[0] : '0', 10) || 0;
console.log(JSON.stringify({
  current,
  patch: \`\${major}.\${minor}.\${patch + 1}\`,
  minor: \`\${major}.\${minor + 1}.0\`,
  major: \`\${major + 1}.0.0\`
}));
")

CURRENT_VERSION=$(echo "$VERSION_JSON" | node -e "const fs = require('fs'); console.log(JSON.parse(fs.readFileSync(0, 'utf-8')).current);")
PATCH_VERSION=$(echo "$VERSION_JSON" | node -e "const fs = require('fs'); console.log(JSON.parse(fs.readFileSync(0, 'utf-8')).patch);")
MINOR_VERSION=$(echo "$VERSION_JSON" | node -e "const fs = require('fs'); console.log(JSON.parse(fs.readFileSync(0, 'utf-8')).minor);")
MAJOR_VERSION=$(echo "$VERSION_JSON" | node -e "const fs = require('fs'); console.log(JSON.parse(fs.readFileSync(0, 'utf-8')).major);")

echo -e "${GREEN}Current version:${NC} $CURRENT_VERSION\n"

echo -e "Select the type of release:"
echo -e "  1) ${BLUE}Patch${NC}  -> $PATCH_VERSION (bug fixes)"
echo -e "  2) ${BLUE}Minor${NC}  -> $MINOR_VERSION (new features, backward compatible)"
echo -e "  3) ${BLUE}Major${NC}  -> $MAJOR_VERSION (breaking changes)"
echo -e "  4) ${BLUE}Custom${NC} -> Enter version manually"
echo

read -p "Choose option [1-4] (default: 1): " choice
choice=${choice:-1}

NEW_VERSION=""
case $choice in
    1)
        NEW_VERSION=$PATCH_VERSION
        ;;
    2)
        NEW_VERSION=$MINOR_VERSION
        ;;
    3)
        NEW_VERSION=$MAJOR_VERSION
        ;;
    4)
        read -p "Enter custom version (e.g. 0.1.1): " NEW_VERSION
        ;;
    *)
        echo -e "${RED}Invalid option.${NC}"
        exit 1
        ;;
esac

# Basic SemVer validation
if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    echo -e "${RED}Error: Version '$NEW_VERSION' does not match SemVer format (X.Y.Z).${NC}"
    exit 1
fi

echo -e "\nBumping version to ${GREEN}v$NEW_VERSION${NC}..."

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo -e "  - Updated package.json"

# Update src-tauri/tauri.conf.json
node -e "
const fs = require('fs');
const tauriConf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
tauriConf.version = '$NEW_VERSION';
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(tauriConf, null, 2) + '\n');
"
echo -e "  - Updated src-tauri/tauri.conf.json"

# Update src-tauri/Cargo.toml
node -e "
const fs = require('fs');
let cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
cargo = cargo.replace(/^version = \".*\"/m, 'version = \"$NEW_VERSION\"');
fs.writeFileSync('src-tauri/Cargo.toml', cargo);
"
echo -e "  - Updated src-tauri/Cargo.toml"

# Update Cargo.lock
if command -v cargo &> /dev/null; then
    echo -e "${YELLOW}Running 'cargo check' to update Cargo.lock...${NC}"
    (cd src-tauri && cargo check --quiet)
    echo -e "  - Updated src-tauri/Cargo.lock"
else
    echo -e "${YELLOW}Warning: 'cargo' command not found. Cargo.lock was not updated. It will be updated on build.${NC}"
fi

echo -e "\n${GREEN}Version bump completed!${NC}"
echo -e "${BLUE}--- GIT DIFF ---${NC}"
git diff package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml

# Commit and tag locally
echo -e "${BLUE}----------------${NC}"
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
if [ -f src-tauri/Cargo.lock ]; then
    git add src-tauri/Cargo.lock
fi

git commit -m "chore: version bump $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "v$NEW_VERSION"
echo -e "${GREEN}Created commit and tag v$NEW_VERSION locally.${NC}"

# Push immediately to origin
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Pushing branch '$CURRENT_BRANCH' and tags to origin...${NC}"
git push origin "$CURRENT_BRANCH" --tags
echo -e "${GREEN}Successfully pushed version bump and tags to origin.${NC}"

