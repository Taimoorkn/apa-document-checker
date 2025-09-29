#!/usr/bin/env node

/**
 * Test Script for New Architecture
 *
 * This script helps validate the new DocumentModel-based architecture
 * Run with: node test-new-architecture.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 APA Document Checker - New Architecture Test Suite\n');

// Configuration
const testConfigs = [
  {
    name: 'New Architecture (Development)',
    env: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_NEW_ARCHITECTURE: 'true',
      NEXT_PUBLIC_INCREMENTAL_ANALYSIS: 'true',
      NEXT_PUBLIC_BIDIRECTIONAL_SYNC: 'true',
      NEXT_PUBLIC_PARAGRAPH_CACHING: 'true',
      NEXT_PUBLIC_UNIFIED_FIX_SYSTEM: 'true',
      NEXT_PUBLIC_MIGRATION_LOGGING: 'true',
      NEXT_PUBLIC_DEBUG_INFO: 'true',
      NEXT_PUBLIC_PERFORMANCE_MONITORING: 'true',
      NEXT_PUBLIC_MEMORY_TRACKING: 'true'
    },
    description: 'Full new architecture with all features enabled'
  },
  {
    name: 'Legacy Architecture (Comparison)',
    env: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_NEW_ARCHITECTURE: 'false',
      NEXT_PUBLIC_MIGRATION_LOGGING: 'true',
      NEXT_PUBLIC_DEBUG_INFO: 'true',
      NEXT_PUBLIC_PERFORMANCE_MONITORING: 'true'
    },
    description: 'Original architecture for comparison'
  },
  {
    name: 'Safe Migration Mode',
    env: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_NEW_ARCHITECTURE: 'true',
      NEXT_PUBLIC_INCREMENTAL_ANALYSIS: 'true',
      NEXT_PUBLIC_BIDIRECTIONAL_SYNC: 'true',
      NEXT_PUBLIC_PARAGRAPH_CACHING: 'true',
      NEXT_PUBLIC_UNIFIED_FIX_SYSTEM: 'false', // Keep legacy fixes initially
      NEXT_PUBLIC_AUTO_FALLBACK: 'true',
      NEXT_PUBLIC_PARALLEL_VALIDATION: 'true',
      NEXT_PUBLIC_MIGRATION_LOGGING: 'true'
    },
    description: 'New architecture with safety features and fallbacks'
  }
];

// Test scenarios
const testScenarios = [
  {
    name: 'Document Upload Test',
    description: 'Test uploading a DOCX file and verify processing',
    instructions: [
      '1. Upload a sample DOCX file',
      '2. Verify document appears in editor',
      '3. Check that text is editable',
      '4. Confirm document statistics appear',
      '5. Watch console for performance metrics'
    ]
  },
  {
    name: 'Edit Persistence Test',
    description: 'Test that editor changes persist in document model',
    instructions: [
      '1. Type text in the editor',
      '2. Check browser console for sync messages',
      '3. Switch architecture modes (if debug enabled)',
      '4. Verify edits are maintained',
      '5. Reload page - edits should persist (new architecture only)'
    ]
  },
  {
    name: 'Incremental Analysis Test',
    description: 'Test fast incremental APA analysis',
    instructions: [
      '1. Upload document and wait for initial analysis',
      '2. Edit a single paragraph',
      '3. Trigger analysis (should be much faster)',
      '4. Check console for "incremental" vs "full" analysis',
      '5. Verify only affected issues change'
    ]
  },
  {
    name: 'Fix Application Test',
    description: 'Test unified fix application system',
    instructions: [
      '1. Generate APA issues by uploading non-compliant document',
      '2. Apply a content fix (citation comma, etc.)',
      '3. Apply a formatting fix (font, spacing, etc.)',
      '4. Verify both types work consistently',
      '5. Check console for fix application logs'
    ]
  },
  {
    name: 'Performance Comparison',
    description: 'Compare old vs new architecture performance',
    instructions: [
      '1. Upload the same document in both architectures',
      '2. Measure initial analysis time',
      '3. Make identical edits in both',
      '4. Compare re-analysis speeds',
      '5. Check memory usage in browser dev tools'
    ]
  }
];

function displayMenu() {
  console.log('📋 Available Test Configurations:\n');
  testConfigs.forEach((config, index) => {
    console.log(`${index + 1}. ${config.name}`);
    console.log(`   ${config.description}\n`);
  });

  console.log('🧪 Test Scenarios to Validate:\n');
  testScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log('   Instructions:');
    scenario.instructions.forEach(instruction => {
      console.log(`     ${instruction}`);
    });
    console.log('');
  });
}

function startServer(configIndex) {
  if (configIndex < 0 || configIndex >= testConfigs.length) {
    console.error('❌ Invalid configuration index');
    process.exit(1);
  }

  const config = testConfigs[configIndex];
  console.log(`🚀 Starting server with: ${config.name}\n`);

  // Display environment
  console.log('Environment Variables:');
  Object.entries(config.env).forEach(([key, value]) => {
    console.log(`  ${key}=${value}`);
  });
  console.log('');

  // Start Next.js dev server
  const server = spawn('npm', ['run', 'dev'], {
    env: { ...process.env, ...config.env },
    stdio: 'inherit',
    shell: true
  });

  console.log(`✅ Server started! Open http://localhost:3000 to test.`);
  console.log(`📊 Testing: ${config.description}`);
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTING INSTRUCTIONS');
  console.log('='.repeat(60));

  testScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    scenario.instructions.forEach(instruction => {
      console.log(`   ${instruction}`);
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log('Press Ctrl+C to stop the server');
  console.log('='.repeat(60) + '\n');

  server.on('close', (code) => {
    console.log(`\n🛑 Server stopped with code ${code}`);
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
  });
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  displayMenu();
  console.log('Usage: node test-new-architecture.js [config-number]');
  console.log('Example: node test-new-architecture.js 1');
  process.exit(0);
}

const configIndex = parseInt(args[0]) - 1;
startServer(configIndex);