#!/bin/bash

# --- Configuration ---
# Get the absolute path of the project root
ROOT_DIR=$(pwd)

# Colors for logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting DevOps Chatbot Stack...${NC}"

# Function to handle cleanup on exit
cleanup() {
    echo -e "\n${BLUE}Stopping services...${NC}"
    # Kill all background processes started by this script
    kill $(jobs -p) 2>/dev/null
    echo -e "${GREEN}✅ All services stopped.${NC}"
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# 1. Start Backend
echo -e "${BLUE}Starting Backend...${NC}"
cd "$ROOT_DIR/backend" || exit
# Using 'uv run' as per your pyproject.toml/uv.lock setup
uv run main.py & 
BACKEND_PID=$!
echo -e "Backend running on PID: $BACKEND_PID"

# 2. Start Frontend
echo -e "${BLUE}Starting Frontend...${NC}"
cd "$ROOT_DIR/frontend" || exit
npm run dev &
FRONTEND_PID=$!
echo -e "Frontend running on PID: $FRONTEND_PID"

echo -e "\n${GREEN}✨ Both services are running!${NC}"
echo -e "Backend: http://localhost:8000"
echo -e "Frontend: http://localhost:5173 (usually)"
echo -e "${BLUE}Press Ctrl+C to stop both services.${NC}"

# Wait for background processes to keep the script alive
wait
