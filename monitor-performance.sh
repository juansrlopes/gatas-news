#!/bin/bash

# 🚀 CURSOR PERFORMANCE MONITOR
# Run this script to monitor Cursor's CPU and memory usage

echo "🔍 CURSOR PERFORMANCE MONITOR"
echo "================================"

while true; do
    clear
    echo "🔍 CURSOR PERFORMANCE MONITOR - $(date)"
    echo "================================"
    
    # Get Cursor processes
    CURSOR_PROCESSES=$(ps aux | grep -i cursor | grep -v grep | grep -v monitor-performance)
    
    if [ -z "$CURSOR_PROCESSES" ]; then
        echo "❌ No Cursor processes found"
    else
        echo "📊 CURSOR CPU & MEMORY USAGE:"
        echo "CPU%  MEM%  PROCESS"
        echo "----  ----  -------"
        echo "$CURSOR_PROCESSES" | awk '{printf "%-4s  %-4s  %s\n", $3, $4, $11}' | head -5
        
        # Total CPU usage
        TOTAL_CPU=$(echo "$CURSOR_PROCESSES" | awk '{sum += $3} END {printf "%.1f", sum}')
        TOTAL_MEM=$(echo "$CURSOR_PROCESSES" | awk '{sum += $4} END {printf "%.1f", sum}')
        
        echo ""
        echo "🎯 TOTAL CURSOR USAGE:"
        echo "CPU: ${TOTAL_CPU}% | Memory: ${TOTAL_MEM}%"
        
        # Performance rating
        if (( $(echo "$TOTAL_CPU < 50" | bc -l) )); then
            echo "✅ PERFORMANCE: EXCELLENT"
        elif (( $(echo "$TOTAL_CPU < 100" | bc -l) )); then
            echo "⚠️  PERFORMANCE: MODERATE"
        else
            echo "🔥 PERFORMANCE: HIGH CPU USAGE"
        fi
    fi
    
    echo ""
    echo "🔄 Refreshing in 3 seconds... (Ctrl+C to exit)"
    sleep 3
done
