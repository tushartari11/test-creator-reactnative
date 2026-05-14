#!/bin/bash
# Cleans the application log file

LOG_DIR="$(dirname "$0")/../logs"
LOG_FILE="$LOG_DIR/test-creator.log"

if [ -f "$LOG_FILE" ]; then
    > "$LOG_FILE"
    echo "Log file cleared: $LOG_FILE"
else
    echo "Log file not found: $LOG_FILE"
fi