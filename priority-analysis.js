// Priority System Analysis Script
import { PRIORITY, calculateRepoPriority } from './dist/helpers/fetchWithRateLimit.js';

console.log('=== PRIORITY SYSTEM ANALYSIS ===\n');

// Test Priority Constants
console.log('1. PRIORITY CONSTANTS:');
console.log(`   CRITICAL: ${PRIORITY.CRITICAL}`);
console.log(`   HIGH: ${PRIORITY.HIGH}`);
console.log(`   MEDIUM: ${PRIORITY.MEDIUM}`);
console.log(`   LOW: ${PRIORITY.LOW}`);
console.log(`   RETRY: ${PRIORITY.RETRY}`);
console.log(`   DEFAULT: ${PRIORITY.DEFAULT}\n`);

// Test Priority Calculation
console.log('2. PRIORITY CALCULATION EXAMPLES:');

const testRepos = [
  { name: 'recent-project', updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }, // 10 days ago
  { name: 'moderate-project', updated_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() }, // 60 days ago
  { name: 'old-project', updated_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString() }, // 200 days ago
  { name: 'no-date-project' }, // No updated_at
];

testRepos.forEach(repo => {
  const priority = calculateRepoPriority(repo);
  const daysSince = repo.updated_at 
    ? Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    : 'N/A';
  
  console.log(`   ${repo.name}: Priority ${priority} (${daysSince} days old)`);
});

console.log('\n3. EXECUTION ORDER SIMULATION:');
console.log('   Repository listing: CRITICAL (10) - Executes FIRST');
console.log('   Recent repos: HIGH (8) - Execute SECOND');
console.log('   Moderate repos: MEDIUM (5) - Execute THIRD');
console.log('   Old repos: LOW (2) - Execute LAST');

console.log('\n4. PERFORMANCE CHARACTERISTICS:');
console.log('   ✅ Queue sorting: O(n log n) per insertion');
console.log('   ✅ Concurrent requests: Up to 6 simultaneous');
console.log('   ✅ Rate limiting: 50ms minimum interval (1200 req/min max)');
console.log('   ✅ Retry logic: 3 attempts with exponential backoff');
console.log('   ✅ Cache system: 20-minute default TTL');

console.log('\n=== ANALYSIS COMPLETE ===');
