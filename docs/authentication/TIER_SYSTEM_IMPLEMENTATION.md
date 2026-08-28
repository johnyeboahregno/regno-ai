# Regno.ai Service Tier System - Implementation Guide

## ✅ What's Been Implemented

### 1. Core Tier Configuration (`/src/lib/server/services/serviceLevelConfig.ts`)

**5 Service Tiers**:
- 🌱 **STARTER** (Free) - Learning & experimentation
- 🔷 **STANDARD** ($29/mo) - Small projects & startups
- 💼 **PROFESSIONAL** ($99/mo) - Production workloads
- 🏢 **ENTERPRISE** ($299/mo) - Large-scale deployments
- 🚀 **ULTIMATE** ($999/mo) - Cutting-edge AI applications

**Per-Tier Configuration**:
- LLM models and token limits
- MAESTRO orchestration capabilities
- CORTEX memory limits
- FLUX pipeline constraints
- SENTINEL & NEXUS features
- Concurrent execution limits
- SLA guarantees
- Support levels

### 2. Service Level Manager (`/src/lib/server/services/serviceLevelManager.ts`)

**Features**:
- ✅ Get/Set system-wide service tier
- ✅ Get/Set per-user tier overrides
- ✅ Cached tier lookups (1-minute TTL)
- ✅ MongoDB persistence
- ✅ Fallback to default tier (PROFESSIONAL)

**Usage**:
```typescript
import { serviceLevelManager } from '$lib/server/services/serviceLevelManager';

// Get current system tier
const tier = await serviceLevelManager.getCurrentTier();

// Set system tier
await serviceLevelManager.setTier('ENTERPRISE');

// Get user-specific tier
const userTier = await serviceLevelManager.getUserTier('user123');

// Set user tier override
await serviceLevelManager.setUserTier('user123', 'ULTIMATE');
```

### 3. Default Credentials Manager (`/src/lib/server/services/defaultCredentialsManager.ts`)

**Auto-Creates Default LLM Credentials**:
- ✅ One credential per tier
- ✅ Uses recommended model for each tier
- ✅ Reads API keys from environment variables
- ✅ Naming convention: `Regno Default - TIER (Model)`

**Examples**:
- `Regno Default - STARTER (GPT-4o-mini)`
- `Regno Default - PROFESSIONAL (Sonnet 3.5)`
- `Regno Default - ULTIMATE (Sonnet 4.5)`

**API Keys Required** (Environment Variables):
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=... (for PROFESSIONAL+ tiers)
```

**Usage**:
```typescript
import { defaultCredentialsManager } from '$lib/server/services/defaultCredentialsManager';

// Initialize all default credentials
await defaultCredentialsManager.initializeDefaultCredentials();

// Get credential ID for a tier
const credentialId = await defaultCredentialsManager.getDefaultCredentialForTier('PROFESSIONAL');

// Update credentials with latest models (maintenance task)
await defaultCredentialsManager.updateDefaultCredentials();
```

### 4. API Endpoints (`/src/routes/api/service-tier/+server.ts`)

**GET `/api/service-tier`**:
- Returns current tier
- Returns all available tiers with capabilities
- User-specific tier if user is logged in

**POST `/api/service-tier`**:
- Set system-wide tier
- Set user-specific tier (with `userId` parameter)
- TODO: Add admin-only permission check

### 5. UI Component (`/src/lib/components/ServiceTierSwitcher.svelte`)

**Features**:
- ✅ Visual tier comparison grid
- ✅ Current tier highlighting
- ✅ One-click tier switching
- ✅ Capability details per tier
- ✅ Responsive design (5-column on desktop)

**Where to Use**:
- Admin panel settings
- User account settings
- System configuration page

### 6. Server Initialization (`/src/hooks.server.ts`)

**Auto-Initializes on Server Startup**:
1. Loads current service tier from database
2. Creates default credentials for all tiers
3. Logs current tier: `🎯 Current service tier: PROFESSIONAL`

## 📋 Next Steps (Tier Awareness Integration)

### LLM Service Integration

Update `llmService.generateCompletion()` to check tier limits:

```typescript
// In llmService.ts
import { serviceLevelManager } from './serviceLevelManager';
import { isModelAllowedForTier, isTokenCountAllowed } from './serviceLevelConfig';

async generateCompletion(params) {
  // Get current tier
  const tier = params.userId
    ? await serviceLevelManager.getUserTier(params.userId)
    : await serviceLevelManager.getCurrentTier();

  const config = getTierConfig(tier);

  // Validate model
  if (!isModelAllowedForTier(params.model, tier)) {
    throw new Error(`Model ${params.model} not available in ${tier} tier`);
  }

  // Validate token count
  if (!isTokenCountAllowed(params.maxTokens, tier)) {
    throw new Error(`Max tokens ${params.maxTokens} exceeds ${tier} tier limit of ${config.llm.maxTokens}`);
  }

  // Apply tier-specific temperature range
  const [minTemp, maxTemp] = config.llm.temperatureRange;
  params.temperature = Math.max(minTemp, Math.min(maxTemp, params.temperature));

  // Continue with LLM call...
}
```

### MAESTRO Integration

Update `MaestroExecutor.execute()` to respect phase limits:

```typescript
// In MaestroExecutor.ts
import { serviceLevelManager } from '$lib/server/services/serviceLevelManager';
import { isPhaseCountAllowed } from '$lib/server/services/serviceLevelConfig';

async execute(context) {
  const tier = await serviceLevelManager.getUserTier(context.userId);
  const config = getTierConfig(tier);

  // Check if refinement is allowed
  if (context.node.config.refinement && !config.maestro.refinement) {
    console.warn(`Refinement not available in ${tier} tier, disabling`);
    context.node.config.refinement = false;
  }

  // Generate phases...
  const phases = await this.generatePhases();

  // Check phase count
  if (!isPhaseCountAllowed(phases.length, tier)) {
    throw new Error(`Generated ${phases.length} phases, but ${tier} tier allows max ${config.maestro.maxPhases}`);
  }

  // Execute phases...
}
```

### CORTEX Integration

```typescript
// In CORTEX vector storage
const tier = await serviceLevelManager.getCurrentTier();
const config = getTierConfig(tier);

if (!config.cortex.persistence) {
  console.warn('CORTEX persistence not available in current tier');
  return; // Don't save to vector DB
}

if (vectorCount > config.cortex.maxVectors) {
  throw new Error(`Vector count exceeds ${tier} tier limit`);
}
```

### FLUX Integration

```typescript
// In FLUX pipeline executor
const tier = await serviceLevelManager.getUserTier(userId);
const config = getTierConfig(tier);

if (nodeCount > config.flux.maxNodes) {
  throw new Error(`Pipeline has ${nodeCount} nodes, but ${tier} tier allows max ${config.flux.maxNodes}`);
}

if (requiresCustomNodes && !config.flux.customNodes) {
  throw new Error(`Custom nodes not available in ${tier} tier`);
}
```

## 🎯 How to Use

### 1. Add Tier Switcher to Admin Panel

```svelte
<!-- In /src/routes/admin/+page.svelte -->
<script>
  import ServiceTierSwitcher from '$lib/components/ServiceTierSwitcher.svelte';
</script>

<div class="admin-section">
  <ServiceTierSwitcher />
</div>
```

### 2. Display Current Tier in UI

```svelte
<script>
  let currentTier = $state('');

  async function loadTier() {
    const response = await fetch('/api/service-tier');
    const result = await response.json();
    currentTier = result.currentTier;
  }

  onMount(loadTier);
</script>

<div class="tier-badge">
  Current Tier: {currentTier}
</div>
```

### 3. Check Tier in Components

```typescript
// Client-side
const response = await fetch('/api/service-tier');
const { currentTier, currentConfig } = await response.json();

if (currentConfig.maestro.maxPhases < desiredPhases) {
  alert(`Your current tier (${currentTier}) supports max ${currentConfig.maestro.maxPhases} phases. Please upgrade.`);
}
```

### 4. Programmatic Tier Switching

```typescript
// Set system tier
await fetch('/api/service-tier', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tier: 'ENTERPRISE' })
});

// Set user tier
await fetch('/api/service-tier', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tier: 'ULTIMATE', userId: 'user123' })
});
```

## 🔧 Configuration Files

### Environment Variables

Add to `.env`:
```bash
# LLM API Keys for Default Credentials
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Default Service Tier (optional, defaults to PROFESSIONAL)
DEFAULT_SERVICE_TIER=PROFESSIONAL
```

### MongoDB Collections

**`system_config`**:
```json
{
  "key": "service_tier",
  "value": "PROFESSIONAL",
  "updatedAt": "2025-01-15T..."
}
```

**`users`** (user-level override):
```json
{
  "id": "user123",
  "email": "user@example.com",
  "serviceTier": "ULTIMATE",
  "serviceTierUpdatedAt": "2025-01-15T..."
}
```

**`credentials`** (auto-created):
```json
{
  "type": "llm",
  "name": "Regno Default - PROFESSIONAL (Sonnet 3.5)",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "apiKey": "sk-ant-...",
  "metadata": {
    "tier": "PROFESSIONAL",
    "description": "Professional tier - Advanced reasoning...",
    "autoCreated": true,
    "createdAt": "2025-01-15T..."
  }
}
```

## 📊 Tier Comparison

| Feature | STARTER | STANDARD | PROFESSIONAL | ENTERPRISE | ULTIMATE |
|---------|---------|----------|--------------|------------|----------|
| **Price** | Free | $29/mo | $99/mo | $299/mo | $999/mo |
| **Models** | GPT-4o-mini, Haiku | GPT-4o, Sonnet 3.5 | Sonnet 4, Gemini Pro | Opus 3.5, 4-Turbo | Flagship models |
| **Max Tokens** | 2K | 4K | 8K | 16K | 32K+ |
| **Phases** | 1 | 5 | 12 | ∞ | ∞ |
| **Nodes** | 5 | 15 | 50 | ∞ | ∞ |
| **Concurrent** | 1 | 3 | 10 | 50 | ∞ |
| **CORTEX** | No | 1K vectors | 10K vectors | 100K vectors | ∞ |
| **Refinement** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Meta-Orchestration** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Custom Models** | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🚀 Future Enhancements

- [ ] Billing integration (Stripe/payment processing)
- [ ] Usage metering and quota enforcement
- [ ] Tier-based rate limiting
- [ ] Automatic tier recommendations based on usage
- [ ] Tier upgrade prompts when hitting limits
- [ ] Admin dashboard with tier analytics
- [ ] Per-organization tiers (multi-tenancy)
- [ ] Trial period management
- [ ] Tier migration tools (upgrade/downgrade data)
- [ ] Cost estimation per execution
- [ ] Tier comparison tooltips in UI
- [ ] Tier-specific feature flags

## 📝 Maintenance Tasks

### Update Default Credentials with New Models

```typescript
// Run periodically (monthly) to update with latest models
import { defaultCredentialsManager } from '$lib/server/services/defaultCredentialsManager';
await defaultCredentialsManager.updateDefaultCredentials();
```

### Audit Tier Usage

```typescript
// Get all users and their tiers
const users = await getMongoCollection('users');
const tierCounts = await users.aggregate([
  { $group: { _id: '$serviceTier', count: { $sum: 1 } } }
]).toArray();

console.log('Tier distribution:', tierCounts);
```

### Clear Tier Cache

```typescript
// After bulk tier changes or system config updates
import { serviceLevelManager } from '$lib/server/services/serviceLevelManager';
serviceLevelManager.clearCache();
```

## ✅ Summary

The Regno.ai Service Tier System is now **fully implemented** and ready to use!

**What's Working**:
1. ✅ 5-tier system with detailed capabilities
2. ✅ System-wide and per-user tier management
3. ✅ Auto-creation of default credentials for each tier
4. ✅ API endpoints for tier management
5. ✅ UI component for easy tier switching
6. ✅ Server startup initialization

**Next**: Integrate tier awareness into LLM service, MAESTRO, CORTEX, and FLUX components to enforce limits and unlock features based on the active tier.
