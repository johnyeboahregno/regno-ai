# Maximizable Panels Feature ✨

## Overview

Every major div section/panel in the app can now be maximized to fill the screen. When you hover over the top-right corner of a panel, an expand icon appears. Click it to enlarge the panel to full screen with a 1em border around each edge.

## Usage

### Basic Usage

Import the action and apply it to any div:

```svelte
<script>
  import { maximizable } from '$lib/utils/maximizable';
</script>

<div use:maximizable class="my-panel">
  <!-- Panel content -->
</div>
```

### With Options

```svelte
<div use:maximizable={{ borderSize: '2em', zIndex: 10000, iconSize: 24 }}>
  <!-- Panel content -->
</div>
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `borderSize` | string | `'1em'` | Space around edges when maximized |
| `zIndex` | number | `9999` | Z-index when maximized |
| `iconSize` | number | `20` | Size of expand/minimize icon in pixels |

## Features

### 1. **Hover to Reveal**
- Hover over the top-right corner of any panel
- Expand icon appears with smooth fade-in animation
- Icon has purple/indigo background for visibility

### 2. **Click to Maximize**
- Click the expand icon
- Panel smoothly fills the entire screen
- 1em border around all edges (customizable)
- Icon changes to minimize icon
- Original layout is preserved with placeholder

### 3. **Click to Minimize**
- Click the minimize icon to restore
- Panel returns to original size and position
- Layout remains intact

### 4. **Keyboard Shortcut**
- Press `Escape` to exit maximized mode
- Works from anywhere when a panel is maximized

### 5. **Smooth Animations**
- Button hover effects (scale + color change)
- Opacity fade in/out on hover
- Smooth transitions between states

## How It Works

### DOM Manipulation
1. **Maximize**:
   - Saves original styles and DOM position
   - Creates placeholder to maintain layout
   - Moves element to `document.body`
   - Applies fixed positioning with borders
   - Sets high z-index

2. **Minimize**:
   - Restores element to original position
   - Removes placeholder
   - Restores all original styles
   - Removes fixed positioning

### Events
Dispatches custom events you can listen to:

```svelte
<div
  use:maximizable
  on:maximized={() => console.log('Panel maximized')}
  on:minimized={() => console.log('Panel minimized')}
>
  <!-- Content -->
</div>
```

## Styling Considerations

### Parent Container
The action automatically handles positioning:
- If parent has `position: static`, it adds `position: relative`
- This ensures the hover button appears correctly

### Panel Content
When maximized:
- `overflow: auto` is automatically added
- Content becomes scrollable if it exceeds viewport
- Original overflow style is restored on minimize

### Z-Index
Default z-index is `9999`. Adjust if you have modals or other overlays:

```svelte
<div use:maximizable={{ zIndex: 10001 }}>
  <!-- Will appear above z-index 10000 elements -->
</div>
```

## Examples

### 1. Database Explorer Panel

```svelte
<div
  use:maximizable
  class="flex gap-4 h-96 border rounded-lg bg-gray-50 p-2"
>
  <div class="w-64 border rounded-lg bg-white">
    <!-- Collection tree -->
  </div>
  <div class="flex-1 border rounded-lg bg-white">
    <!-- Query workspace -->
  </div>
</div>
```

### 2. Chart Display

```svelte
<div
  use:maximizable={{ borderSize: '0.5em' }}
  class="chart-container"
>
  <canvas></canvas>
</div>
```

### 3. Code Editor

```svelte
<div
  use:maximizable={{ borderSize: '1.5em', iconSize: 24 }}
  class="code-editor"
>
  <textarea></textarea>
</div>
```

### 4. Data Grid

```svelte
<div
  use:maximizable
  class="ag-grid-container"
>
  <!-- AG Grid content -->
</div>
```

## Best Practices

### ✅ Do
- Apply to major panels/sections (database explorers, charts, grids, editors)
- Use on elements with defined height (either fixed or within flex/grid layouts)
- Apply to elements that benefit from more screen space

### ❌ Don't
- Apply to inline elements or spans
- Apply to elements that are already full-screen
- Apply to tiny buttons or icons (they won't benefit from maximizing)
- Stack multiple maximizable elements directly inside each other

## Browser Compatibility

Works in all modern browsers that support:
- CSS `position: fixed`
- ES6 JavaScript
- Custom Events API
- Svelte Actions

## Performance

- Minimal overhead (only adds one button per panel)
- Button is hidden by default (opacity: 0)
- Only activates on hover
- No polling or continuous checks
- DOM manipulation only on maximize/minimize

## Accessibility

- Button is keyboard accessible (can tab to it)
- Clear visual indicator (hover state)
- Escape key to exit maximized mode
- Semantic HTML button element

## Technical Details

### State Management
Each maximizable element maintains its own state:
```typescript
{
  isMaximized: boolean;
  originalStyles: { ... };  // All CSS properties
  originalParent: HTMLElement | null;
  originalNextSibling: Node | null;
  placeholder: HTMLElement | null;
}
```

### Placeholder Strategy
When maximizing:
1. Creates a placeholder div with same dimensions
2. Inserts placeholder before removing element
3. Maintains layout flow
4. On minimize, restores element to exact position

### Style Preservation
Saves and restores 12 key CSS properties:
- position, top, left, right, bottom
- width, height, maxWidth, maxHeight
- margin, zIndex, transform

## Customization

### Icon Colors
Edit the SVG fill/stroke in `maximizable.ts`:

```typescript
// Current: white icons on purple background
stroke="white"
background: rgba(99, 102, 241, 0.9)

// Change to: black icons on white background
stroke="black"
background: rgba(255, 255, 255, 0.9)
```

### Button Position
Edit button positioning in `maximizable.ts`:

```typescript
// Current: 8px from top-right
top: 8px;
right: 8px;

// Change to: 16px from top-right
top: 16px;
right: 16px;
```

### Transition Speed
Edit transition duration:

```typescript
transition: opacity 0.2s ease;  // Change 0.2s to your preference
```

## Troubleshooting

### Icon Not Appearing
- Check parent has `position: relative` or other positioned value
- Ensure parent has enough height (button appears at top-right)
- Check z-index conflicts

### Panel Not Maximizing
- Check console for JavaScript errors
- Ensure element is not already fixed positioned
- Verify Svelte action is properly imported

### Layout Breaks on Maximize
- Check if parent container has strict size constraints
- Ensure no conflicting CSS transitions
- Verify no other scripts are manipulating the same element

### Minimize Not Working
- Check if original parent still exists in DOM
- Verify no routing changes removed the parent
- Check console for errors

## Future Enhancements

Potential future features:
- [ ] Double-click to maximize
- [ ] Drag to resize when maximized
- [ ] Multiple panels maximized side-by-side
- [ ] Snap to edges/corners
- [ ] Remember maximized state across sessions
- [ ] Animate the maximize/minimize transition
- [ ] Custom icons per panel type

---

**Created**: 2025-11-05
**Version**: 1.0.0
**Status**: ✅ Ready to Use
