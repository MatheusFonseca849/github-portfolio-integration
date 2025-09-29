# Priority System Implementation

## Overview

The portfolio-github-integration library now includes an intelligent priority system for GitHub API requests, ensuring optimal performance and user experience by processing critical requests first.

## Priority Hierarchy

The system uses the following priority levels (higher numbers = higher priority):

| Priority Level | Value | Use Case | Description |
|---------------|-------|----------|-------------|
| `CRITICAL` | 10 | Repository listing | Initial API call to fetch user's repositories |
| `HIGH` | 8 | Recent repos (< 30 days) | Config files for recently updated repositories |
| `MEDIUM` | 5 | Moderate repos (30-180 days) | Config files for moderately recent repositories |
| `LOW` | 2 | Old repos (> 180 days) | Config files for older repositories |
| `RETRY` | 1 | Retry attempts | Failed requests being retried |
| `DEFAULT` | 0 | Fallback | Default priority when none specified |

## How It Works

### 1. Repository Listing (CRITICAL Priority)
```typescript
const reposRes = await fetchWithRateLimit(
  `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
  { headers },
  PRIORITY.CRITICAL  // Always processed first
);
```

### 2. Dynamic Config File Priority
```typescript
// Calculate priority based on repo freshness
const priority = calculateRepoPriority(repo);

const configRes = await fetchWithRateLimit(
  `https://api.github.com/repos/${username}/${repo.name}/contents/src/repo.config.json`,
  { headers },
  priority  // Dynamic priority based on repo age
);
```

### 3. Priority Calculation Logic
```typescript
function calculateRepoPriority(repo: any): number {
  if (!repo.updated_at) return PRIORITY.LOW;
  
  const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceUpdate < 30) return PRIORITY.HIGH;      // Recently updated
  if (daysSinceUpdate < 180) return PRIORITY.MEDIUM;   // Moderately recent
  return PRIORITY.LOW;                                  // Older repos
}
```

## Performance Benefits

### Before Priority System
- All requests processed in insertion order (FIFO)
- Repository listing competed equally with config file requests
- Users waited for all requests to complete before seeing any results
- No differentiation between important and less important requests

### After Priority System
- **Repository listing always executes first** (CRITICAL priority)
- **Recently updated repositories processed before older ones**
- **Better user experience** with faster initial results
- **Intelligent queue management** based on request importance

## Request Processing Order

Given a typical scenario with multiple repositories:

1. **Repository listing** (Priority 10) - Executes immediately
2. **Recent repo configs** (Priority 8) - Processed next
3. **Moderate repo configs** (Priority 5) - Processed after recent ones
4. **Old repo configs** (Priority 2) - Processed last
5. **Any retries** (Priority 1) - Lowest priority

## Usage Examples

### Basic Usage (Automatic Priority)
```typescript
import { getRepos } from 'portfolio-github-integration';

// Priority system works automatically
const repos = await getRepos('username');
```

### Advanced Usage (Custom Priorities)
```typescript
import fetchWithRateLimit, { PRIORITY } from 'portfolio-github-integration/helpers/fetchWithRateLimit';

// High priority request
const response = await fetchWithRateLimit(url, options, PRIORITY.HIGH);

// Custom priority
const response2 = await fetchWithRateLimit(url, options, 7);
```

## API Changes

### fetchWithRateLimit Function
```typescript
// Before
async function fetchWithRateLimit(url: string, options: any): Promise<Response>

// After
async function fetchWithRateLimit(url: string, options: any, priority: number = 0): Promise<Response>
```

### New Exports
```typescript
export const PRIORITY = {
  CRITICAL: 10,
  HIGH: 8,
  MEDIUM: 5,
  LOW: 2,
  RETRY: 1,
  DEFAULT: 0
} as const;

export function calculateRepoPriority(repo: any): number;
```

## Backward Compatibility

✅ **Fully backward compatible** - existing code continues to work without changes
✅ **Optional priority parameter** - defaults to 0 when not specified
✅ **No breaking changes** to public API
✅ **Existing tests pass** without modification

## Performance Metrics

### Typical Improvement Scenarios

1. **User with 50 repositories (10 recent, 40 old)**:
   - Repository listing: Immediate (Priority 10)
   - 10 recent configs: Next in queue (Priority 8)
   - 40 old configs: Processed last (Priority 2)
   - **Result**: Users see recent projects much faster

2. **Rate-limited scenario**:
   - Critical requests bypass less important ones
   - Better resource utilization
   - Improved user experience during API limits

## Testing

The priority system includes comprehensive tests:

```bash
npm test -- priority.test.js
```

Tests cover:
- Priority constant hierarchy
- Dynamic priority calculation
- Edge cases and boundary conditions
- Integration with existing functionality

## Migration Guide

No migration required! The priority system is:
- **Automatically enabled** for all users
- **Zero configuration** needed
- **Transparent** to existing implementations
- **Optimized** for common usage patterns

## Future Enhancements

Potential improvements for future versions:
- User-configurable priority weights
- Priority boost for starred repositories
- Language-based priority adjustments
- Custom priority callback functions
