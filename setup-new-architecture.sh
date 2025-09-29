#!/bin/bash

# Shell script to set up environment variables for new architecture testing

echo "============================================================="
echo " APA Document Checker - New Architecture Environment Setup"
echo "============================================================="
echo ""

echo "Setting environment variables for new architecture..."
echo ""

# Core architecture flags
export NEXT_PUBLIC_NEW_ARCHITECTURE=true
export NEXT_PUBLIC_INCREMENTAL_ANALYSIS=true
export NEXT_PUBLIC_BIDIRECTIONAL_SYNC=true
export NEXT_PUBLIC_PARAGRAPH_CACHING=true
export NEXT_PUBLIC_UNIFIED_FIX_SYSTEM=true

# Migration and debugging flags
export NEXT_PUBLIC_MIGRATION_LOGGING=true
export NEXT_PUBLIC_DEBUG_INFO=true
export NEXT_PUBLIC_SHOW_MIGRATION_STATUS=true
export NEXT_PUBLIC_AUTO_FALLBACK=true

# Performance monitoring
export NEXT_PUBLIC_PERFORMANCE_MONITORING=true
export NEXT_PUBLIC_MEMORY_TRACKING=true
export NEXT_PUBLIC_ANALYSIS_METRICS=true

# Development flags
export NEXT_PUBLIC_VERBOSE_LOGGING=true
export NEXT_PUBLIC_STATE_INSPECTOR=true

echo "Environment variables set!"
echo ""
echo "Active Features:"
echo "  - New Architecture: $NEXT_PUBLIC_NEW_ARCHITECTURE"
echo "  - Incremental Analysis: $NEXT_PUBLIC_INCREMENTAL_ANALYSIS"
echo "  - Bidirectional Sync: $NEXT_PUBLIC_BIDIRECTIONAL_SYNC"
echo "  - Paragraph Caching: $NEXT_PUBLIC_PARAGRAPH_CACHING"
echo "  - Unified Fix System: $NEXT_PUBLIC_UNIFIED_FIX_SYSTEM"
echo "  - Performance Monitoring: $NEXT_PUBLIC_PERFORMANCE_MONITORING"
echo "  - Debug Info: $NEXT_PUBLIC_DEBUG_INFO"
echo ""
echo "============================================================="
echo "Ready to start development server with new architecture!"
echo "Run: npm run dev"
echo "============================================================="
echo ""

# Start development server if requested
if [ "$1" = "start" ]; then
    echo "🚀 Starting development server..."
    npm run dev
fi