# Node Type Registration Guide

## Overview

The Regno AI platform uses a **centralized registration system** for node types. All node types MUST be registered in `NodeMetadataRegistry.ts`, which serves as the single source of truth.

## Architecture

### Single Source of Truth: NodeMetadataRegistry.ts

**Location**: `src/lib/nodes/NodeMetadataRegistry.ts`

This file contains the `NODE_METADATA` object which defines ALL node types in the system. Other systems automatically derive their type information from this registry.

### Derived Systems

1. **NodeFactory.ts** - Automatically derives `NodeType` union from registry
2. **ModalConfigFactory.ts** - Maps node types to modal configurations
3. **ExecutorRegistry.ts** - Registers server-side executors for each type
4. **UI Components** - Use metadata for icons, colors, display names

## Adding a New Node Type

### Step 1: Register in NodeMetadataRegistry.ts

Add an entry to the `NODE_METADATA` object:

```typescript
'your-node': {
  type: 'your-node',
  displayName: 'Your Node',
  icon: YourIcon,  // Import from lucide-svelte
  color: 'bg-color-600',
  defaultDimensions: { width: 150, height: 80 },
  category: 'transform',  // or 'source', 'sink', 'ai', 'visualization', 'control', 'utility'
  description: 'Brief description',
  defaultConfig: {
    isTrigger: false,
    nodeMode: 'enabled',
    // ... other default config values
  }
}
```

### Step 2: Create Modal Configuration

**Location**: `src/lib/components/modals/YourNodeModalConfig.ts`

```typescript
import { BaseModalConfig, type ConfigSection } from './BaseModalConfig.js';

export class YourNodeModalConfig extends BaseModalConfig {
  get nodeTypeName(): string { return 'Your Node'; }

  createDefaultConfig(): any {
    return {
      // Default configuration values
    };
  }

  getConfigurationSections(): ConfigSection[] {
    return [
      { id: 'section-1', title: 'Section Title', component: 'YourConfigSection' }
    ];
  }
}
```

Then register it in `ModalConfigFactory.ts`:

```typescript
import { YourNodeModalConfig } from './YourNodeModalConfig.js';

// In the switch statement:
case 'your-node':
  return new YourNodeModalConfig(node, state, actions);
```

### Step 3: Create Executor

**Location**: `src/lib/server/execution/executors/YourNodeExecutor.ts`

```typescript
import { NodeExecutor, type NodeExecutionContext, type NodeExecutionResult } from './NodeExecutor';

export class YourNodeExecutor extends NodeExecutor {
  readonly nodeType = 'your-node';

  async execute(
    node: any,
    inputData: any[],
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // Your execution logic here
    return this.createSuccessResult(outputData);
  }
}
```

Then register it in `ExecutorRegistry.ts`:

```typescript
import { YourNodeExecutor } from './YourNodeExecutor';

// In the constructor:
this.executors.set('your-node', new YourNodeExecutor());
```

### Step 4: (Optional) Create Node Implementation

Only needed if your node requires client-side logic (UI interaction, local state, etc.).

**Location**: `src/lib/nodes/YourNodeImpl.ts`

```typescript
import { BaseNode } from './BaseNode.js';

export class YourNodeImpl extends BaseNode {
  readonly type = 'your-node' as const;

  constructor(id: string, name: string, config: any) {
    super(id, name, config);
  }

  // Add client-side methods if needed
}
```

Then add a case in `NodeFactory.ts`:

```typescript
case 'your-node':
  module = await import('./YourNodeImpl.js');
  nodeImplementations[type] = module.YourNodeImpl;
  break;
```

## Important Notes

### For Server-Side Only Nodes (like Lookup)

If your node only executes server-side and doesn't need client-side logic:

1. **Skip Step 4** - No NodeImpl needed
2. NodeFactory will automatically create a generic BaseNode implementation
3. Only the executor matters for execution

### Type Safety

The `NodeType` union is automatically generated from `NODE_METADATA` keys:

```typescript
export type NodeType = ReturnType<typeof getAllNodeTypes>[number];
```

This means TypeScript will automatically know about your new type without manual updates!

### Validation

If you forget to register a node type properly, you'll get:
- **Compile-time error**: If ModalConfigFactory doesn't handle it
- **Runtime warning**: If NodeFactory doesn't have implementation (falls back to generic)
- **Runtime error**: If ExecutorRegistry doesn't have executor (execution fails)

## Example: The Lookup Node

The lookup node is a perfect example of a minimal server-side only node:

1. **NodeMetadataRegistry.ts**: ✅ Registered with metadata
2. **LookupModalConfig.ts**: ✅ Modal configuration created
3. **LookupExecutor.ts**: ✅ Server-side executor created
4. **NodeImpl**: ❌ Not needed - uses generic BaseNode
5. **ExecutorRegistry.ts**: ✅ Executor registered

This pattern works for any node that only needs server-side execution.

## Migration from Old System

If you're updating old code that manually defined node types:

1. **Remove hardcoded type unions** - They're now derived
2. **Check NODE_METADATA** - Ensure all types are registered
3. **Test compilation** - TypeScript will catch missing registrations
4. **Test execution** - Server restart needed for executor changes

## Benefits of Centralization

1. **Single place to add new nodes** - Just update NODE_METADATA
2. **Type safety** - TypeScript automatically validates
3. **Less boilerplate** - Generic implementations for simple nodes
4. **Easier maintenance** - Clear pattern to follow
5. **No scattered registration** - Everything derives from one source

## Developer Workflow

When adding a new node type:

```bash
# 1. Add to NODE_METADATA
vi src/lib/nodes/NodeMetadataRegistry.ts

# 2. Create modal config
vi src/lib/components/modals/YourNodeModalConfig.ts

# 3. Register in factory
vi src/lib/components/modals/ModalConfigFactory.ts

# 4. Create executor
vi src/lib/server/execution/executors/YourNodeExecutor.ts

# 5. Register executor
vi src/lib/server/execution/executors/ExecutorRegistry.ts

# 6. Restart dev server for server-side changes
# Ctrl+C, then npm run dev

# 7. Test!
```

That's it! No more hunting through multiple files wondering where to register things.
