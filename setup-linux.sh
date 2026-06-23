#!/bin/bash
# ============================================================
#  WeRead Auto Reader - Linux Setup (delegates to setup.js)
#  Cross-platform: auto-detects OS and runs correct steps.
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$SCRIPT_DIR"

echo "========================================"
echo "  WeRead Auto Reader - Setup (Linux)"
echo "  Delegating to setup.js (cross-platform)..."
echo "========================================"
echo

# Use bundled Node.js if available, else system node
if [ -f "$ROOT/nodejs-linux/bin/node" ]; then
    NODE="$ROOT/nodejs-linux/bin/node"
elif [ -f "$ROOT/nodejs/bin/node" ]; then
    NODE="$ROOT/nodejs/bin/node"
else
    NODE="node"
fi

echo "Using Node.js: $($NODE --version 2>/dev/null || echo 'not found')"
echo

"$NODE" "$ROOT/setup.js"

echo
echo "Setup script finished."
echo "Next: run ./start-linux.sh"
