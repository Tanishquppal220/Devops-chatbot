#!/bin/bash
set -euo pipefail

# --- Configuration ---
# Resolve the absolute path of the project root from the script location
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Colors for logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

setup_backend() {
    log "Checking backend environment..."

    if [ ! -d "$BACKEND_DIR/.venv" ]; then
        if command_exists python3; then
            PYTHON=python3
        elif command_exists python; then
            PYTHON=python
        else
            echo "Python 3 is required to create the backend virtual environment." >&2
            exit 1
        fi

        log "Creating Python virtual environment for backend..."
        "$PYTHON" -m venv "$BACKEND_DIR/.venv"
    fi

    local VENV_PYTHON="$BACKEND_DIR/.venv/bin/python"

    if ! "$VENV_PYTHON" -m pip --version >/dev/null 2>&1; then
        log "pip not found in virtual environment; bootstrapping pip..."
        if ! "$VENV_PYTHON" -m ensurepip --upgrade --default-pip >/dev/null 2>&1; then
            echo "Failed to bootstrap pip. Install a Python distribution with ensurepip or install pip manually." >&2
            exit 1
        fi
    fi

    log "Bootstrapping uv in the backend virtual environment..."
    "$VENV_PYTHON" -m pip install --upgrade pip
    "$VENV_PYTHON" -m pip install uv

    log "Syncing backend dependencies with uv..."
    cd "$BACKEND_DIR" || exit
    "$VENV_PYTHON" -m uv sync
}

setup_frontend() {
    log "Checking frontend environment..."

    if ! command_exists npm; then
        echo "npm is required to install frontend dependencies." >&2
        exit 1
    fi

    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        log "Installing frontend dependencies..."
        cd "$FRONTEND_DIR" || exit
        npm install
    fi
}

cleanup() {
    echo -e "\n${BLUE}Stopping services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    log_success "✅ All services stopped."
    exit
}

trap cleanup SIGINT SIGTERM

log "🚀 Starting DevOps Chatbot Stack..."
setup_backend
setup_frontend

log "Starting Backend..."
cd "$BACKEND_DIR" || exit
"$BACKEND_DIR/.venv/bin/python" main.py &
BACKEND_PID=$!
echo "Backend running on PID: $BACKEND_PID"

log "Starting Frontend..."
cd "$FRONTEND_DIR" || exit
npm run dev &
FRONTEND_PID=$!
echo "Frontend running on PID: $FRONTEND_PID"

echo -e "\n${GREEN}✨ Both services are running!${NC}"
echo -e "Backend: http://localhost:8000"
echo -e "Frontend: http://localhost:5173 (usually)"
echo -e "${BLUE}Press Ctrl+C to stop both services.${NC}"

