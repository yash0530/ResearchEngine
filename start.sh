#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status (except for manual checks)
set -e

# Define colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print beautiful ASCII banner
echo -e "${CYAN}${BOLD}"
echo "  ███████╗███╗   ██╗ ██████╗ ██╗███╗   ██╗███████╗"
echo "  ██╔════╝████╗  ██║██╔════╝ ██║████╗  ██║██╔════╝"
echo "  █████╗  ██╔██╗ ██║██║  ███╗██║██╔██╗ ██║█████╗  "
echo "  ██╔══╝  ██║╚██╗██║██║   ██║██║██║╚██╗██║██╔══╝  "
echo "  ███████╗██║ ╚████║╚██████╔╝██║██║ ╚████║███████╗"
echo "  ╚══════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝"
echo -e "   AI-Infrastructure Research Workstation${NC}\n"

# Helper functions for reporting status
print_step() {
  echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
  echo -e "${GREEN}✔ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✘ $1${NC}"
}

# --- Pre-run Checks ---

# 1. Environment configuration
if [ ! -f .env ]; then
  print_warning ".env file not found. Copying from .env.example..."
  cp .env.example .env
  print_success "Created .env file."
  print_warning "Add an LLM provider key to .env when ready — optional; the deterministic digest runs without one."
else
  print_success ".env file exists."
fi

# 2. Package installation
if [ ! -d node_modules ]; then
  print_warning "node_modules not found. Installing dependencies..."
  npm install
  print_success "Dependencies installed."
else
  print_success "Dependencies are installed."
fi

# 3. Database initialization
if [ ! -f prisma/dev.db ]; then
  print_warning "Database not found at prisma/dev.db. Setting up DB..."
  npm run db:setup
  print_success "Database generated, migrated, and seeded."
else
  print_success "Database dev.db exists."
fi

# --- Ingestion Jobs Menu ---
run_job_interactive() {
  while true; do
    echo -e "\n${CYAN}Select an ingestion job to run:${NC}"
    echo -e "1) ${BOLD}prices${NC}   - Ingest daily closes (use for charts & drawdowns)"
    echo -e "2) ${BOLD}news${NC}     - Ingest per-sector headlines"
    echo -e "3) ${BOLD}earnings${NC} - Fetch upcoming earnings (slow, ~1/sec)"
    echo -e "4) ${BOLD}rules${NC}    - Evaluate tripwires"
    echo -e "5) ${BOLD}nightly${NC}  - Run nightly brief (requires LLM API key in .env)"
    echo -e "6) ${BOLD}morning${NC}  - Build the morning digest (deterministic + optional LLM)"
    echo -e "7) ${BOLD}backup${NC}   - Back up the SQLite database"
    echo -e "8) ${BOLD}Go back to main menu${NC}"
    
    read -p "Enter choice [1-8]: " job_choice
    case $job_choice in
      1)
        read -p "Enter backfill days (default 400): " backfill
        backfill=${backfill:-400}
        echo -e "${CYAN}Running prices backfill for $backfill days...${NC}"
        npm run job -- prices --backfill="$backfill"
        ;;
      2)
        echo -e "${CYAN}Running news job...${NC}"
        npm run job -- news
        ;;
      3)
        echo -e "${CYAN}Running earnings job...${NC}"
        npm run job -- earnings
        ;;
      4)
        read -p "Dry run? (evaluate without writing/firing alerts) [Y/n]: " dry_run
        if [[ "$dry_run" =~ ^[Nn] ]]; then
          npm run job -- rules
        else
          npm run job -- rules --dry-run
        fi
        ;;
      5)
        echo -e "${CYAN}Running nightly brief job...${NC}"
        npm run job -- nightly
        ;;
      6)
        echo -e "${CYAN}Running morning job...${NC}"
        npm run job -- morning
        ;;
      7)
        echo -e "${CYAN}Running backup...${NC}"
        npm run job -- backup
        ;;
      8)
        return
        ;;
      *)
        print_error "Invalid choice."
        ;;
    esac
  done
}

# --- Actions ---

start_all() {
  print_step "Starting Next.js Dev Server & Scheduler Daemon"
  if command -v npx >/dev/null 2>&1; then
    echo -e "${GREEN}Running concurrently using npx...${NC}"
    npx --yes concurrently \
      --names "WEB,CRON" \
      --prefix-colors "blue,green" \
      "npm run dev" \
      "npm run scheduler"
  else
    print_warning "npx not found or failed, starting processes in parallel..."
    
    # Run dev in background
    npm run dev &
    PID_DEV=$!
    
    # Run scheduler in background
    npm run scheduler &
    PID_SCHED=$!
    
    # Setup trap to terminate both on exit
    trap "echo -e '\nStopping services...'; kill $PID_DEV $PID_SCHED 2>/dev/null; exit" SIGINT SIGTERM EXIT
    
    # Wait for background tasks to finish
    wait
  fi
}

start_dev() {
  print_step "Starting Next.js Web Workstation UI only"
  npm run dev
}

start_scheduler() {
  print_step "Starting Scheduler Cron Daemon only"
  npm run scheduler
}

db_reset() {
  print_warning "This will wipe dev.db and reseed it. Are you sure? [y/N]"
  read -p "Confirm database reset: " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    print_step "Resetting Database"
    rm -f prisma/dev.db prisma/dev.db-shm prisma/dev.db-wal
    npm run db:setup
    print_success "Database has been reset and reseeded."
  else
    print_warning "Database reset aborted."
  fi
}

run_tests() {
  print_step "Running tests"
  echo -e "1) ${BOLD}Unit tests${NC}  - Run pure business logic tests (Vitest)"
  echo -e "2) ${BOLD}Smoke tests${NC} - Run end-to-end integration checks"
  read -p "Select option [1-2]: " test_opt
  if [ "$test_opt" = "1" ]; then
    npm run test
  elif [ "$test_opt" = "2" ]; then
    npm run smoke
  else
    print_error "Invalid option."
  fi
}

# --- Command Line Interface ---

# Parse command line flags if provided
if [ $# -gt 0 ]; then
  case "$1" in
    --all)
      start_all
      exit 0
      ;;
    --dev)
      start_dev
      exit 0
      ;;
    --scheduler)
      start_scheduler
      exit 0
      ;;
    --setup)
      npm run db:setup
      exit 0
      ;;
    --reset)
      db_reset
      exit 0
      ;;
    --jobs)
      run_job_interactive
      exit 0
      ;;
    --test)
      run_tests
      exit 0
      ;;
    --help|-h)
      echo "Usage: ./start.sh [FLAG]"
      echo "Flags:"
      echo "  --all         Start both Web Workstation and Scheduler (default behavior)"
      echo "  --dev         Start only Next.js Web Workstation UI"
      echo "  --scheduler   Start only Scheduler Daemon"
      echo "  --setup       Run database setup (generate client, apply migrations, seed)"
      echo "  --reset       Wipe the database and reseed from scratch"
      echo "  --jobs        Open ingestion jobs submenu"
      echo "  --test        Open tests submenu"
      echo "  --help, -h    Show this help menu"
      exit 0
      ;;
    *)
      print_error "Unknown flag: $1"
      echo "Use --help to see available flags."
      exit 1
      ;;
  esac
fi

# Main menu loop (if run without arguments)
while true; do
  echo -e "\n${CYAN}===============================================${NC}"
  echo -e " ${BOLD}Main Workstation Menu${NC}"
  echo -e "${CYAN}===============================================${NC}"
  echo -e "1) ${GREEN}${BOLD}Start Workstation${NC} (Start Web UI & Scheduler - Recommended)"
  echo -e "2) Start Web UI only (Next.js dev server)"
  echo -e "3) Start Scheduler Daemon only (cron daemon)"
  echo -e "4) Run database setup / reset database"
  echo -e "5) Run manual ingestion jobs (prices, news, briefs, etc.)"
  echo -e "6) Run tests (unit/smoke)"
  echo -e "7) ${RED}Exit${NC}"
  
  read -p "Select action [1-7]: " menu_choice
  
  case $menu_choice in
    1)
      start_all
      ;;
    2)
      start_dev
      ;;
    3)
      start_scheduler
      ;;
    4)
      db_reset
      ;;
    5)
      run_job_interactive
      ;;
    6)
      run_tests
      ;;
    7)
      echo -e "\nExiting. Have a productive research session!"
      exit 0
      ;;
    *)
      print_error "Invalid choice."
      ;;
  esac
done
