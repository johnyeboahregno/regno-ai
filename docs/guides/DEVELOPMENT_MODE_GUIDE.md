# Development Mode Guide

## Overview

**Development Mode** is a powerful feature for users with the `app.development` role that provides debug tools, verbose logging, performance monitoring, and state inspection capabilities.

## Features

When Development Mode is enabled, you get access to:

### 1. **Floating Debug Panel**
- Draggable debug panel that shows:
  - **Performance Metrics**: FPS, memory usage
  - **Auth State**: Authentication status, email, roles, permissions count
  - **API Call Log**: Recent network requests with status codes and timing
  - **Feature Toggles**: Enable/disable individual debug features

### 2. **Verbose Console Logging**
- Detailed logs with color-coded prefixes
- Methods available:
  - `developmentModeStore.log()` - Green `[DEV]` prefix
  - `developmentModeStore.warn()` - Orange `[DEV]` prefix
  - `developmentModeStore.error()` - Red `[DEV]` prefix

### 3. **Performance Monitoring**
- FPS counter
- Memory usage tracking
- Timer helper for measuring operation duration
  ```javascript
  const stopTimer = developmentModeStore.startTimer('MyOperation');
  // ... do work ...
  stopTimer(); // Logs: "⏱️ MyOperation: 45.23ms"
  ```

### 4. **State Inspector**
- Real-time view of authentication state
- Role and permission tracking
- Reactive updates when state changes

### 5. **Network Activity Log**
- Automatic logging of all fetch requests
- Status codes, timing, and URLs
- Last 10 API calls displayed in debug panel

### 6. **Configurable Features**
Each feature can be toggled individually:
- `showDebugPanel` - Show/hide the floating debug panel
- `verboseLogging` - Enable/disable console logging
- `showPerformance` - Show/hide performance metrics
- `showStateInspector` - Show/hide auth state in panel
- `showNetworkLog` - Show/hide API call log
- `highlightReactivity` - Visual highlights for reactive updates (future)

## How to Enable

### Step 1: Ensure you have the developer role
You must have the `app.development` role assigned to your user.

### Step 2: Toggle Development Mode
1. Click your user icon in the top-right
2. Find "Development Mode" toggle (green when active)
3. Click to enable

### Step 3: Access the Debug Panel
Once enabled, a floating green debug panel will appear in the top-left corner.

## Usage Examples

### Example 1: Adding Verbose Logging to Your Code

```typescript
import { developmentModeStore } from '$lib/stores/developmentMode.svelte.js';

function myFunction() {
  developmentModeStore.log('Function called with params:', { foo: 'bar' });

  try {
    // ... your code ...
    developmentModeStore.log('Operation successful');
  } catch (error) {
    developmentModeStore.error('Operation failed:', error);
  }
}
```

### Example 2: Measuring Performance

```typescript
import { developmentModeStore } from '$lib/stores/developmentMode.svelte.js';

async function loadData() {
  const stopTimer = developmentModeStore.startTimer('Data Load');

  const data = await fetch('/api/data');

  stopTimer(); // Automatically logs timing if performance monitoring is enabled

  return data;
}
```

### Example 3: Checking if Development Mode is Active

```typescript
import { developmentModeStore } from '$lib/stores/developmentMode.svelte.js';

// Check if development mode is enabled
if (developmentModeStore.isDevelopmentMode) {
  console.log('Development mode is ON');
}

// Check if a specific feature is enabled
if (developmentModeStore.isEnabled('showPerformance')) {
  // Show additional performance UI
}
```

## Debug Panel Controls

### Drag to Reposition
- Click and hold the green header bar
- Drag to move the panel anywhere on screen
- Position persists across page reloads

### Minimize/Maximize
- Click the minimize button (▭) to collapse the panel
- Click maximize button (▢) to expand it again

### Toggle Features
- Scroll to the "Features" section at the bottom
- Check/uncheck boxes to enable/disable features in real-time

### Close Panel
- Click the X button to hide the debug panel
- Or uncheck "Show Debug Panel" in the Features section

## API Reference

### developmentModeStore

#### Properties
- `isDevelopmentMode: boolean` - Whether development mode is enabled
- `features: object` - Current feature flags

#### Methods
- `setDevelopmentMode(enabled: boolean)` - Enable/disable development mode
- `setFeature(feature: string, enabled: boolean)` - Toggle a specific feature
- `isEnabled(feature: string): boolean` - Check if a feature is enabled
- `log(...args)` - Log message with [DEV] prefix (if verboseLogging is on)
- `warn(...args)` - Log warning with [DEV] prefix (if verboseLogging is on)
- `error(...args)` - Log error with [DEV] prefix (if verboseLogging is on)
- `startTimer(label: string): Function` - Start performance timer, returns stop function

## Difference from Developer Settings

**Development Mode** (this feature) and **Developer Settings** (security bypasses) are separate:

| Feature | Development Mode | Developer Settings |
|---------|-----------------|-------------------|
| **Purpose** | Debug tools and monitoring | Security bypass for testing |
| **Location** | User Profile menu | User Roles & Privileges → Developer tab |
| **What it does** | Shows debug panel, logs, performance metrics | Bypasses authentication/authorization |
| **Risk Level** | Low (read-only debugging) | High (disables security) |
| **Use When** | Debugging UI, checking state, monitoring performance | Testing protected features, bypassing auth |

## Tips & Best Practices

1. **Leave Development Mode ON** while actively developing
2. **Use verbose logging** to understand component lifecycle
3. **Monitor API calls** to debug network issues
4. **Check FPS** if you notice UI lag
5. **Use timers** to identify performance bottlenecks
6. **Turn OFF in production** - not intended for end users

## Troubleshooting

### Debug panel doesn't appear
- Ensure you have the `app.development` role
- Check that Development Mode toggle is ON (green)
- Refresh the page

### No console logs appearing
- Check if "Verbose Logging" feature is enabled in the debug panel
- Open browser DevTools console (F12)

### Performance metrics show 0
- Some browsers restrict `performance.memory` API
- Try Chrome/Edge for full memory monitoring

### Network log is empty
- API logging only captures requests after Development Mode is enabled
- Make a new API call to see it appear in the log

## Future Enhancements

Planned features for Development Mode:
- Visual reactivity highlights (flash elements when they update)
- Store state time-travel debugging
- Component tree inspector
- Network request mocking
- State snapshot/restore functionality
- Performance profiling with flame graphs

## Questions?

For issues or feature requests related to Development Mode:
1. Check this guide first
2. Ask in the developer channel
3. File an issue with `[DevMode]` prefix
