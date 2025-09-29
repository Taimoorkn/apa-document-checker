@echo off
REM Windows batch file to set up environment variables for new architecture testing

echo =============================================================
echo  APA Document Checker - New Architecture Environment Setup
echo =============================================================
echo.

echo Setting environment variables for new architecture...
echo.

REM Core architecture flags
set NEXT_PUBLIC_NEW_ARCHITECTURE=true
set NEXT_PUBLIC_INCREMENTAL_ANALYSIS=true
set NEXT_PUBLIC_BIDIRECTIONAL_SYNC=true
set NEXT_PUBLIC_PARAGRAPH_CACHING=true
set NEXT_PUBLIC_UNIFIED_FIX_SYSTEM=true

REM Migration and debugging flags
set NEXT_PUBLIC_MIGRATION_LOGGING=true
set NEXT_PUBLIC_DEBUG_INFO=true
set NEXT_PUBLIC_SHOW_MIGRATION_STATUS=true
set NEXT_PUBLIC_AUTO_FALLBACK=true

REM Performance monitoring
set NEXT_PUBLIC_PERFORMANCE_MONITORING=true
set NEXT_PUBLIC_MEMORY_TRACKING=true
set NEXT_PUBLIC_ANALYSIS_METRICS=true

REM Development flags
set NEXT_PUBLIC_VERBOSE_LOGGING=true
set NEXT_PUBLIC_STATE_INSPECTOR=true

echo Environment variables set!
echo.
echo Active Features:
echo   - New Architecture: %NEXT_PUBLIC_NEW_ARCHITECTURE%
echo   - Incremental Analysis: %NEXT_PUBLIC_INCREMENTAL_ANALYSIS%
echo   - Bidirectional Sync: %NEXT_PUBLIC_BIDIRECTIONAL_SYNC%
echo   - Paragraph Caching: %NEXT_PUBLIC_PARAGRAPH_CACHING%
echo   - Unified Fix System: %NEXT_PUBLIC_UNIFIED_FIX_SYSTEM%
echo   - Performance Monitoring: %NEXT_PUBLIC_PERFORMANCE_MONITORING%
echo   - Debug Info: %NEXT_PUBLIC_DEBUG_INFO%
echo.
echo =============================================================
echo Ready to start development server with new architecture!
echo Run: npm run dev
echo =============================================================
echo.

REM Keep window open
pause