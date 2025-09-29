# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2025-09-28

### Added
- **Intelligent Priority System**: Implemented sophisticated request prioritization for optimal performance
- **Priority Constants**: Added `PRIORITY` export with predefined priority levels (CRITICAL, HIGH, MEDIUM, LOW, RETRY, DEFAULT)
- **Dynamic Priority Calculation**: Added `calculateRepoPriority()` function that assigns priority based on repository freshness
- **Enhanced Rate Limiting**: Extended `fetchWithRateLimit()` to accept optional priority parameter
- **Comprehensive Testing**: Added priority system test suite with 7 test cases
- **Documentation**: Created detailed `PRIORITY_SYSTEM.md` documentation

### Changed
- **Repository Processing Order**: Repository listing now gets CRITICAL priority (processed first)
- **Config File Prioritization**: Recently updated repositories (< 30 days) get HIGH priority, moderately recent (30-180 days) get MEDIUM priority, older repositories get LOW priority
- **Queue Management**: Requests are now intelligently sorted by priority for better user experience

### Performance Improvements
- **Faster Initial Results**: Users see recently updated projects much sooner
- **Better Resource Utilization**: Critical requests bypass less important ones during rate limiting
- **Optimized Processing**: Repository listing always executes before individual config file requests

### Technical Details
- Extended `fetchWithRateLimit(url, options, priority = 0)` signature
- Added priority-based queue sorting in `GitHubRateLimiter`
- Implemented time-based priority calculation algorithm
- Maintained full backward compatibility

## [2.2.1] - Previous Release
### Fixed
- ES module compatibility issues
- Import statement corrections
- Package.json exports field optimization

## [2.2.0] - Previous Release
### Added
- Browser-native implementation
- Enhanced caching system
- Parallel processing capabilities

---

## Priority System Overview

The new priority system ensures optimal performance by processing requests in order of importance:

1. **CRITICAL (10)**: Repository listing - must happen first
2. **HIGH (8)**: Recently updated repos (< 30 days)
3. **MEDIUM (5)**: Moderately recent repos (30-180 days)  
4. **LOW (2)**: Older repos (> 180 days)
5. **RETRY (1)**: Failed requests being retried
6. **DEFAULT (0)**: Fallback priority

This results in significantly improved user experience, especially for users with many repositories.
