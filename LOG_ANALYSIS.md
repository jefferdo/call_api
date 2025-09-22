# Call API Log Analysis

## Overview
This document provides a comprehensive analysis of the call API system logs, mapping all events and their patterns across multiple call sessions.

## Log Files Analyzed
- `196214e2-bf3a-479d-85ad-a4e3bdeb96d2.log` - Successful call
- `543e8f8f-db02-4fa1-9523-7c28fcb2d3b1.log` - Failed call (allocation error)
- `96889026-3d16-4b4c-b407-a962d3101cad.log` - Failed call (busy)
- `undefined.log` - Extension status events

## Event Types

### 1. Call Status Events (`call_status`)
Events that track the complete lifecycle of phone calls:

| Event | Description |
|-------|-------------|
| `initiated` | Call session started |
| `ringing_a` | Internal extension (A-leg) is ringing |
| `answered_a` | Internal extension answered the call |
| `ringing_b` | External number (B-leg) is ringing |
| `answered_b` | External number answered the call |
| `bridged` | Both parties successfully connected |
| `terminated_by_internal` | Call ended by internal party |
| `terminated_by_external` | Call ended by external party |
| `completed` | Call session fully completed |
| `not_answered` | Call failed to connect |

### 2. External Number Status Events (`external_number_status`)
Events tracking the status of external call legs:

| Status | Description | Cause Code |
|--------|-------------|------------|
| `answered` | External number picked up | - |
| `busy` | External number is busy | 17 |

### 3. Internal Extension Status Events (`internal_extension_status`)
Events monitoring internal extension availability:

| Status | Description |
|--------|-------------|
| `in_service` | Extension is available for calls |
| `out_of_service` | Extension is unavailable |

### 4. Call Details Events (`call_details`)
Comprehensive call information including:
- Call duration and timestamps (local and UTC)
- A-leg and B-leg timing details
- Hangup causes for both legs
- Recording information

### 5. Recording Events (`recording`)
Audio recording metadata:
- Filename with structured naming convention
- Date folder organization

## Call Flow Patterns

### Successful Call Flow
```mermaid
graph LR
    A[initiated] --> B[ringing_a]
    B --> C[answered_a]
    C --> D[ringing_b]
    D --> E[answered_b]
    E --> F[bridged]
    F --> G[terminated_by_internal]
    G --> H[completed]
```

### Failed Call - External Busy
```mermaid
graph LR
    A[initiated] --> B[ringing_a]
    B --> C[answered_a]
    C --> D[ringing_b]
    D --> E[terminated_by_external]
    E --> F[completed]
```

### Failed Call - System Error
```mermaid
graph LR
    A[initiated] --> B[ringing_a]
    B --> C[not_answered]
```

## Call Summary

| Call ID | Extension | External Number | Start Time | End Time | Duration | Status | Recording |
|---------|-----------|-----------------|------------|----------|----------|--------|-----------|
| `196214e2-bf3a-479d-85ad-a4e3bdeb96d2` | 1000 | 0777066311 | 2025-09-23 00:56:40 | 2025-09-23 00:56:56 | 16s | ✅ Successful | `1000_0777066311_20250923_20250923-005656.wav` |
| `96889026-3d16-4b4c-b407-a962d3101cad` | 1000 | 0777634116 | 2025-09-23 00:57:40 | 2025-09-23 00:57:56 | 16s | ❌ Failed (Busy) | `1000_0777634116_20250923_20250923-005756.wav` |
| `543e8f8f-db02-4fa1-9523-7c28fcb2d3b1` | 1000 | - | - | - | - | ❌ Failed (Allocation) | None |

## Statistics

### Success Rate
- **Total Calls**: 3
- **Successful Calls**: 1 (33%)
- **Failed Calls**: 2 (67%)

### Failure Breakdown
- **System Errors**: 1 (33%) - Allocation failure
- **External Busy**: 1 (33%) - Destination busy

### Extension Usage
- **Extension 1000**: All calls (100%)
- **Most Called Number**: 0777066311 (1 call, successful)

## Event Timeline (Chronological)

| Time | Call ID | Event | Details |
|------|---------|-------|---------|
| 00:56:33 | 196214e2 | Extension answered | Extension 1000 |
| 00:56:40 | 196214e2 | External answered | 0777066311 bridged |
| 00:56:56 | 196214e2 | Call completed | Duration: 16s |
| 00:57:40 | 96889026 | Extension answered | Extension 1000 |
| 00:57:55 | 96889026 | Call failed | 0777634116 busy |

## System Behavior

### Logging Format
- **Structure**: JSON formatted events
- **Timestamps**: Both local (UTC+5:30) and UTC
- **Call IDs**: UUID format for unique session identification

### Recording System
- **Naming Convention**: `{extension}_{external_number}_{date}_{timestamp}.wav`
- **Storage**: Organized by date folders (`2025-09-23`)
- **Coverage**: Records even failed calls (except allocation failures)

### Error Handling
- **Hangup Causes**: Standardized cause codes (16, 17)
- **Detailed Tracking**: Separate A-leg and B-leg information
- **Failure Reasons**: Specific error messages for troubleshooting

## Recommendations

1. **Monitor Allocation Failures**: Investigate system resource issues causing allocation failures
2. **Call Quality**: Average successful call duration is 16 seconds
3. **Number Analysis**: 0777066311 has 100% success rate, consider it a reliable test number
4. **Extension Health**: Monitor extension 1000 service status transitions

## Technical Details

### Hangup Cause Codes
- **16**: Normal call clearing
- **17**: User busy

### Timezone Information
- **Local Time**: UTC+5:30 (Sri Lanka Standard Time)
- **UTC Offset**: 5 hours 30 minutes ahead of UTC

---
*Generated on: September 23, 2025*
*Total Events Analyzed: 35 events across 4 log files*