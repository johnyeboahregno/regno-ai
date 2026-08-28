# Dynamic Tray Notifications System

## Overview

The tray notification system provides dynamic, app-specific updates for the MainStatusTray component. Each app can notify the tray when significant changes occur, updating only the relevant app's tray.

## Architecture

1. **trayUpdatesStore** (`src/lib/stores/trayUpdates.svelte.ts`) - Central store tracking updates per app
2. **trayNotifications** (`src/lib/utils/trayNotifications.ts`) - Helper functions for common scenarios
3. **MainStatusTray** (`src/lib/components/MainStatusTray.svelte`) - Displays dynamic updates

## How It Works

### Priority Order
1. **Dynamic store message** (from `trayUpdatesStore`)
2. **Prop override** (`updateMessage` prop)
3. **Static markers** (default capability descriptions)
4. **Fallback** ("App ready")

### Message Lifecycle
- Updates appear immediately when notified
- Each app context ('chat', 'pipelines', 'admin', etc.) has independent updates
- Only the specific app's tray is updated when changes occur

## Usage Examples

### Pipelines App

```typescript
import { notifyPipelineSaved, notifyPipelineDeleted } from '$lib/utils/trayNotifications';

// When saving a pipeline
const result = await pipelinePersistenceService.savePipeline(pipeline);
if (result.success) {
  notifyPipelineSaved(pipeline.name); // Updates pipelines tray only
}

// When deleting a pipeline
const result = await pipelinePersistenceService.deletePipeline(id, name);
if (result.success) {
  notifyPipelineDeleted(name); // Updates pipelines tray only
}
```

### Chat App

```typescript
import { notifyChatMessageSent, notifyChatEndpointChanged } from '$lib/utils/trayNotifications';

// After sending a message
notifyChatMessageSent(activeConversations);

// When changing AI endpoint
notifyChatEndpointChanged(endpoint.name);
```

### Admin App

```typescript
import { notifyAdminUserCreated, notifyAdminRoleChanged } from '$lib/utils/trayNotifications';

// After creating a user
notifyAdminUserCreated(username);

// After changing user role
notifyAdminRoleChanged(username, newRole);
```

### Generic Updates

```typescript
import { notifyAppUpdate } from '$lib/utils/trayNotifications';

// For custom updates
notifyAppUpdate('crm', 'Lead created: John Doe', 'create');
notifyAppUpdate('analytics', 'Report generated', 'report');
```

## Available Notification Functions

### Chat
- `notifyChatMessageSent(count)`
- `notifyChatEndpointChanged(endpointName)`
- `notifyChatConversationSaved()`

### Pipelines
- `notifyPipelineSaved(name)` ✅ **Integrated**
- `notifyPipelineDeleted(name)` ✅ **Integrated**
- `notifyPipelineExecuted(name, status)`
- `notifyPipelineNodeAdded(nodeType)`

### Admin
- `notifyAdminUserCreated(username)`
- `notifyAdminUserUpdated(username)`
- `notifyAdminRoleChanged(username, role)`
- `notifyAdminSystemSettingsChanged(setting)`
- `notifyAdminTagCreated(tagName)`

### CMS
- `notifyCmsContentSaved(title)`
- `notifyCmsContentPublished(title)`
- `notifyCmsContentDeleted(title)`

### Analytics
- `notifyAnalyticsReportGenerated(reportName)`
- `notifyAnalyticsDashboardUpdated(dashboardName)`

## Integration Status

### ✅ Completed
- **System Core**: Store and notification utilities created
- **MainStatusTray**: Updated to use dynamic messages
- **Pipelines App**: Save and delete operations integrated

### 🔄 To Be Integrated
- **Chat App**: Message sending, endpoint changes
- **Admin App**: User operations, role changes, settings
- **Other Apps**: As needed per app functionality

## Best Practices

1. **Update After Success**: Only notify after operations complete successfully
2. **Be Specific**: Include entity names in messages (`Saved: Pipeline 1` vs `Pipeline saved`)
3. **Keep Messages Short**: Tray space is limited (aim for <30 characters)
4. **Use Action Types**: Provide action parameter for categorization
5. **One Tray Per Change**: Each change updates only its app's tray

## Clearing Updates

```typescript
import { clearTrayUpdate, clearAllTrayUpdates } from '$lib/utils/trayNotifications';

// Clear specific app update (reverts to static message)
clearTrayUpdate('pipelines');

// Clear all updates
clearAllTrayUpdates();
```

## Adding New Notification Types

1. Add function to `src/lib/utils/trayNotifications.ts`:
```typescript
export function notifyMyAppAction(details: string) {
  trayUpdatesStore.updateTray(
    'myapp',  // app context
    `Action: ${details}`,  // message
    'action'  // action type
  );
}
```

2. Use in your app code:
```typescript
import { notifyMyAppAction } from '$lib/utils/trayNotifications';

// After some action
notifyMyAppAction('Data synced');
```

## Testing

1. Navigate to an app (e.g., `/pipelines`)
2. Perform an action (e.g., save a pipeline)
3. Check the pipelines tray - it should show "Saved: [pipeline name]"
4. Navigate to a different app (e.g., `/chat`)
5. The pipelines tray should keep its update message
6. Perform a chat action - only the chat tray should update

## Technical Details

### Store Structure
```typescript
interface TrayUpdate {
  message: string;
  timestamp: number;
  action?: string;
}
```

### Update Flow
```
User Action → App Code → notifyXxxUpdate() → trayUpdatesStore.updateTray()
                                                      ↓
MainStatusTray (derived reactive value) ← reads from store → displays update
```
