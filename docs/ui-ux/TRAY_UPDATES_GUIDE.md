# App-Specific Tray Updates Guide

This guide explains how to implement app-specific tray updates that show relevant, contextual information in the MainStatusTray based on the current app.

## Overview

The MainStatusTray displays app-specific update messages that change based on the current application context. This provides users with relevant information about what's happening in the app they're currently using.

## How It Works

1. **Default Messages**: Each app has a default update message defined in `MainStatusTray.svelte`
2. **Custom Messages**: Apps can send custom update messages via `postMessage` API
3. **Real-time Updates**: Messages update automatically as app state changes

## Implementation Guide

### Step 1: Import the Utility

In your app component, import the tray update utility:

```typescript
import { sendTrayUpdate, TrayUpdateTemplates } from '$lib/utils/trayUpdates';
```

### Step 2: Send Updates Using $effect

Use Svelte's `$effect` to send updates when your app state changes:

```typescript
// Example: Update based on node count in a pipeline canvas
$effect(() => {
  const nodeCount = nodes.length;
  const selectedCount = selectionManager?.selectedNodeIds.size || 0;

  if (selectedCount > 0) {
    sendTrayUpdate(TrayUpdateTemplates.nodesSelected(selectedCount));
  } else if (nodeCount > 0) {
    sendTrayUpdate(TrayUpdateTemplates.nodesInCanvas(nodeCount));
  } else {
    sendTrayUpdate('Canvas ready');
  }
});
```

### Step 3: Use Template Functions

The `TrayUpdateTemplates` object provides pre-formatted update messages:

#### Pipeline/Canvas Updates
- `TrayUpdateTemplates.nodesSelected(count)` → "5 nodes selected"
- `TrayUpdateTemplates.nodesInCanvas(count)` → "15 nodes in canvas"
- `TrayUpdateTemplates.pipelineExecuting()` → "Pipeline executing..."
- `TrayUpdateTemplates.pipelineReady()` → "Pipeline ready"

#### Chat Updates
- `TrayUpdateTemplates.messagesInChat(count)` → "25 messages"
- `TrayUpdateTemplates.chatActive()` → "Chat active"
- `TrayUpdateTemplates.typing()` → "Typing..."

#### Admin Updates
- `TrayUpdateTemplates.usersOnline(count)` → "12 users online"
- `TrayUpdateTemplates.activeConnections(count)` → "5 connections"

#### Generic Updates
- `TrayUpdateTemplates.itemsLoaded(count, type)` → "10 items loaded"
- `TrayUpdateTemplates.processing(item)` → "Processing data..."
- `TrayUpdateTemplates.ready(feature)` → "Analytics ready"

### Step 4: Send Custom Messages

You can also send custom messages directly:

```typescript
sendTrayUpdate('Processing 3 files...');
sendTrayUpdate(`${userCount} collaborators online`);
```

### Step 5: Clear Updates (Optional)

To clear a custom update and fall back to the default app message:

```typescript
import { clearTrayUpdate } from '$lib/utils/trayUpdates';

clearTrayUpdate();
```

## Complete Example

Here's a complete example from the DataManagementCanvas component:

```svelte
<script lang="ts">
  import { sendTrayUpdate, TrayUpdateTemplates } from '$lib/utils/trayUpdates';

  // State
  let nodes = $state<Node[]>([]);
  let selectionManager = new SelectionManager();

  // Send tray updates when state changes
  $effect(() => {
    const nodeCount = nodes.length;
    const selectedCount = selectionManager?.selectedNodeIds.size || 0;

    if (selectedCount > 0) {
      sendTrayUpdate(TrayUpdateTemplates.nodesSelected(selectedCount));
    } else if (nodeCount > 0) {
      sendTrayUpdate(TrayUpdateTemplates.nodesInCanvas(nodeCount));
    } else {
      sendTrayUpdate('Canvas ready');
    }
  });
</script>
```

## Default App Messages

If an app doesn't send custom updates, these default messages are shown:

| App | Default Message |
|-----|----------------|
| Home | `Home • v1.0.0` |
| Chat | `Chat ready • AI enabled` |
| Pipelines | `Canvas ready • 15 nodes` |
| Admin | `System ready • DB connected` |
| CMS | `CMS ready • Content loaded` |
| Analytics | `Analytics ready` |
| Automation | `Automation ready` |
| Others | `[App name] ready` |

## Best Practices

1. **Keep messages concise**: Limit to 30-40 characters for readability
2. **Update on meaningful changes**: Don't spam updates for minor state changes
3. **Use templates when possible**: They provide consistent formatting
4. **Clear when appropriate**: Reset to default when app returns to idle state
5. **Test in embedded mode**: Ensure messages appear correctly in the shell

## Technical Details

### PostMessage Protocol

Apps communicate with the shell using the `postMessage` API:

```typescript
window.parent.postMessage({
  type: 'TRAY_UPDATE_MESSAGE',
  message: 'Your update message',
  timestamp: Date.now()
}, '*');
```

### Message Flow

```
App Component → sendTrayUpdate() → postMessage → ApplicationShell → MainStatusTray
```

### State Management

- **receivedUpdateMessage**: Stores the current app-specific update in ApplicationShell
- **trayUpdateMarker**: Derived value in MainStatusTray that shows the final message
- **Auto-clear**: Messages are automatically cleared when switching apps

## Adding New Template Types

To add new template types, edit `/disks/disk1/chat/src/lib/utils/trayUpdates.ts`:

```typescript
export const TrayUpdateTemplates = {
  // ... existing templates ...

  /**
   * Your new category
   */
  yourNewTemplate: (param: number) => `${param} items processed`,
};
```

## Debugging

Enable console logging in ApplicationShell to see when updates are received:

```typescript
// Look for this in the console:
[ApplicationShell] Received TRAY_UPDATE_MESSAGE: Your message here
```

## Future Enhancements

Potential improvements to the tray update system:

- [ ] Update history/timeline
- [ ] Click-to-expand for detailed info
- [ ] Update priorities/importance levels
- [ ] Animation on update changes
- [ ] Notification badges for important updates
