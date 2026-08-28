# 🖼️ Embedded Custom Header Strategy

**Date**: November 5, 2025
**Status**: ✅ Complete | **Build**: ✅ Successful

---

## Overview

This document describes the strategy for apps that have their own headers to display those headers **in the ApplicationShell** when running in embedded mode, while still showing the app's own header when accessed directly.

### The Problem

When apps are embedded in the ApplicationShell:
- **Before**: Apps would either show duplicate headers (shell header + app header) OR have no custom branding
- **Challenge**: Each app has unique branding (icon, title, subtitle, action buttons) that should be preserved

### The Solution

**When embedded**: Apps send their custom header data to the shell, which renders it in place of the default "Regno AI" branding.
**When standalone**: Apps display their own header normally.

---

## How It Works

### 1. App-Side Implementation (MAESTRO Example)

#### A. Detect Embedded Mode

```typescript
// Detect if running in embedded mode
let isEmbedded = $state(false);

if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  isEmbedded = urlParams.get('embedded') === 'true';
}
```

#### B. Send Custom Header Metadata

```typescript
if (isEmbedded && window.parent !== window) {
  window.parent.postMessage({
    type: 'APP_METADATA',
    hasHeader: false,  // Tell shell to show its header (not hide it)
    appName: 'maestro',
    loadingMessage: 'Loading MAESTRO orchestrator...',
    customHeader: {
      icon: '🎭',
      title: 'MAESTRO',
      subtitle: 'AI-Driven Pipeline Orchestration',
      actions: [
        { label: 'Settings', onClick: 'toggleSettings' }
      ]
    },
    timestamp: Date.now()
  }, '*');
}
```

#### C. Conditionally Render Standalone Header

```svelte
<!-- Standalone Header (only shown when NOT embedded) -->
{#if !isEmbedded}
  <div class="border-b border-purple-700/30 bg-black/40 backdrop-blur">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="text-4xl">🎭</div>
          <div>
            <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              MAESTRO
            </h1>
            <p class="text-sm text-gray-400">
              AI-Driven Pipeline Orchestration
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button onclick={() => showAdvancedSettings = !showAdvancedSettings}>
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
```

#### D. Listen for Header Actions

```typescript
onMount(() => {
  // Listen for header action messages from shell
  const handleShellMessage = (event: MessageEvent) => {
    if (event.data.type === 'HEADER_ACTION' && event.data.action === 'toggleSettings') {
      showAdvancedSettings = !showAdvancedSettings;
    }
  };
  window.addEventListener('message', handleShellMessage);

  return () => {
    window.removeEventListener('message', handleShellMessage);
  };
});
```

---

### 2. Shell-Side Implementation (ApplicationShell.svelte)

#### A. Define Custom Header Type

```typescript
type CustomHeaderData = {
  icon?: string;
  title?: string;
  subtitle?: string;
  actions?: Array<{ label: string; onClick: string }>;
};
let customHeaderData = $state<CustomHeaderData | null>(null);
```

#### B. Capture Custom Header Data

```typescript
const handleAppMetadata = (event: MessageEvent) => {
  if (event.data.type === 'APP_METADATA') {
    receivedMetadata = true;
    embeddedAppHasHeader = event.data.hasHeader === true;
    appLoadingMessage = event.data.loadingMessage;

    // Capture custom header data if provided
    if (event.data.customHeader) {
      customHeaderData = event.data.customHeader;
    }

    // ... rest of handler
  }
};
```

#### C. Render Custom Header Content

```svelte
<header class="flex-shrink-0 bg-slate-900 px-4 py-3 z-20 shell-header">
  <div class="flex items-center justify-between">
    <!-- Left: App Switcher + Custom Header -->
    <div class="flex items-center space-x-2 relative">
      <!-- App Switcher Button -->
      <button onclick={() => showAppMenu = !showAppMenu}>
        <!-- App Switcher Icon -->
      </button>

      <!-- Custom Header Content (if provided by embedded app) -->
      {#if customHeaderData}
        <div class="flex items-center gap-3">
          {#if customHeaderData.icon}
            <div class="text-2xl">{customHeaderData.icon}</div>
          {/if}
          <div>
            {#if customHeaderData.title}
              <h1 class="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                {customHeaderData.title}
              </h1>
            {/if}
            {#if customHeaderData.subtitle}
              <p class="text-xs text-gray-400">{customHeaderData.subtitle}</p>
            {/if}
          </div>
        </div>
      {:else}
        <!-- Default Regno AI branding -->
        <div>
          <h1 class="text-sm font-semibold text-white">Regno AI</h1>
          <p class="text-xs text-gray-300">{appName}</p>
        </div>
      {/if}
    </div>

    <!-- Right: Custom Actions + Theme + User Profile -->
    <div class="flex items-center space-x-1 flex-shrink-0">
      <!-- Custom Header Actions (if provided) -->
      {#if customHeaderData?.actions}
        {#each customHeaderData.actions as action}
          <button
            onclick={() => {
              // Send message to iframe to trigger action
              if (iframeElement?.contentWindow) {
                iframeElement.contentWindow.postMessage({
                  type: 'HEADER_ACTION',
                  action: action.onClick
                }, '*');
              }
            }}
            class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 border border-purple-500 rounded-lg text-xs text-white font-medium flex items-center gap-1.5 transition-all"
          >
            <Settings size={14} />
            {action.label}
          </button>
        {/each}
      {/if}

      <!-- Theme Toggle -->
      <button onclick={toggleTheme}>
        <!-- Theme Icon -->
      </button>

      <!-- User Profile Button -->
      <UserIconButton />
    </div>
  </div>
</header>
```

---

## Message Flow

### Initialization Sequence

```
1. App loads in iframe with ?embedded=true
2. App immediately sends APP_METADATA with customHeader
3. Shell receives metadata and stores customHeader data
4. Shell renders header with custom icon, title, subtitle
5. App completes initialization, sends INIT_COMPLETE
6. App signals APP_READY when fully loaded
```

### Action Flow (e.g., Settings Button Click)

```
1. User clicks Settings button in shell header
2. Shell sends HEADER_ACTION message to iframe:
   {
     type: 'HEADER_ACTION',
     action: 'toggleSettings'
   }
3. App receives message and handles action:
   if (event.data.action === 'toggleSettings') {
     showAdvancedSettings = !showAdvancedSettings;
   }
```

---

## APP_METADATA Protocol

### Full Message Structure

```typescript
{
  type: 'APP_METADATA',
  hasHeader: false,           // false = show shell header with custom content
  appName: 'maestro',         // App identifier
  loadingMessage: string,     // Optional loading message
  customHeader: {
    icon: '🎭',              // Emoji or icon identifier
    title: 'MAESTRO',        // Main title (appears in gradient)
    subtitle: 'AI-Driven Pipeline Orchestration',  // Subtitle
    actions: [               // Optional action buttons
      {
        label: 'Settings',   // Button label
        onClick: 'toggleSettings'  // Action identifier
      }
    ]
  },
  timestamp: Date.now()
}
```

### HEADER_ACTION Protocol

```typescript
{
  type: 'HEADER_ACTION',
  action: 'toggleSettings'    // Action identifier from customHeader.actions
}
```

---

## Benefits

### For Users
✅ **Consistent Navigation** - App Switcher always in the same place
✅ **App Identity** - Each app maintains its unique branding
✅ **No Duplicate Headers** - Clean, professional interface
✅ **More Screen Space** - Single header instead of two

### For Developers
✅ **Simple Integration** - Just add APP_METADATA with customHeader
✅ **Flexible Actions** - Add custom buttons in shell header
✅ **Message-Based** - Clean communication via postMessage
✅ **Backward Compatible** - Apps without customHeader still work

---

## Visual Comparison

### Before (Without Custom Headers)

```
┌─────────────────────────────────────┐
│ [≋] Regno AI                    [☀️][👤] │ ← Generic shell header
├─────────────────────────────────────┤
│                                     │
│  App content without branding       │
│                                     │
```

### After (With Custom Headers)

```
┌─────────────────────────────────────┐
│ [≋] 🎭 MAESTRO              [⚙️][☀️][👤] │ ← Custom app header in shell
│    AI-Driven Pipeline Orch...       │
├─────────────────────────────────────┤
│                                     │
│  App content                        │
│                                     │
```

### Standalone Mode (Direct Access)

```
┌─────────────────────────────────────┐
│  🎭 MAESTRO                    [⚙️]  │ ← App's own header
│  AI-Driven Pipeline Orchestration   │
├─────────────────────────────────────┤
│                                     │
│  App content                        │
│                                     │
```

---

## Implementation Checklist

### For New Apps

- [ ] Detect embedded mode (`?embedded=true` query param)
- [ ] Send APP_METADATA with customHeader on load
- [ ] Conditionally render standalone header (only when NOT embedded)
- [ ] Listen for HEADER_ACTION messages
- [ ] Handle custom actions from shell header buttons
- [ ] Test both embedded and standalone modes

### Example Template

```typescript
// 1. Detect embedded mode
let isEmbedded = $state(false);

if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  isEmbedded = urlParams.get('embedded') === 'true';

  // 2. Send metadata if embedded
  if (isEmbedded && window.parent !== window) {
    window.parent.postMessage({
      type: 'APP_METADATA',
      hasHeader: false,
      appName: 'your-app',
      customHeader: {
        icon: '🚀',
        title: 'Your App',
        subtitle: 'Your subtitle here',
        actions: [
          { label: 'Settings', onClick: 'toggleSettings' }
        ]
      }
    }, '*');
  }
}

// 3. Listen for actions
onMount(() => {
  const handleShellMessage = (event: MessageEvent) => {
    if (event.data.type === 'HEADER_ACTION') {
      if (event.data.action === 'toggleSettings') {
        // Handle settings toggle
      }
    }
  };
  window.addEventListener('message', handleShellMessage);
  return () => window.removeEventListener('message', handleShellMessage);
});
```

```svelte
<!-- 4. Conditional standalone header -->
{#if !isEmbedded}
  <header>
    <!-- Your custom header for standalone mode -->
  </header>
{/if}
```

---

## Files Modified

### ApplicationShell.svelte
- Added `CustomHeaderData` type definition
- Added `customHeaderData` state variable
- Updated `handleAppMetadata` to capture customHeader
- Updated header rendering to show custom content
- Added custom action button rendering
- Implemented HEADER_ACTION message sending

### MAESTRO Page (src/routes/maestro/+page.svelte)
- Added `isEmbedded` state variable
- Updated APP_METADATA to include customHeader
- Added conditional standalone header rendering
- Implemented HEADER_ACTION message listener
- Updated onMount to handle shell messages

---

## Future Enhancements

### Multiple Actions
```typescript
customHeader: {
  actions: [
    { label: 'Settings', onClick: 'toggleSettings' },
    { label: 'Export', onClick: 'exportData' },
    { label: 'Help', onClick: 'showHelp' }
  ]
}
```

### Custom Icons (Beyond Emoji)
```typescript
customHeader: {
  icon: {
    type: 'lucide',
    name: 'settings',
    color: '#a855f7'
  }
}
```

### Dynamic Header Updates
```typescript
// Update header at runtime
window.parent.postMessage({
  type: 'UPDATE_CUSTOM_HEADER',
  customHeader: {
    title: 'New Title',
    subtitle: 'Updated subtitle'
  }
}, '*');
```

---

## Summary

This strategy provides:

1. **🎯 Best of Both Worlds** - App branding in embedded mode, full control in standalone
2. **🔄 Seamless Integration** - Shell and apps work together via messaging
3. **🎨 Brand Consistency** - Each app maintains its unique identity
4. **🚀 Easy Implementation** - Simple message-based protocol
5. **📱 Professional UX** - Clean, single header interface

**Result**: Apps embedded in the shell can display their custom branding (icon, title, subtitle, actions) in the shell header, eliminating duplicate headers while preserving app identity!

---

*Enhancement completed: November 5, 2025*
*Build status: ✅ Successful*
