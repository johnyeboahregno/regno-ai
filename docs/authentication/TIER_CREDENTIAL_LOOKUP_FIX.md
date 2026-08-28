# Tier Credential Lookup Fix

## Problem

The STANDARD tier was using the wrong LLM credential:
- **Expected**: OpenRouter with `gpt-4o-mini`
- **Actual**: OpenAI with `gpt-5` (non-existent model)

### Root Cause

The `defaultCredentialsManager.getDefaultCredentialForTier()` method was matching credentials **by name**, which is fragile:

```typescript
// OLD - Risky name-based matching
const credential = credentials.find(c => c.name === template.name);
```

The template expected `'Regno Default - STANDARD (GPT-4o-mini)'` but the database had `'Regno.AI - Standard Tier'`, so the lookup failed and fell back to the first available credential (OpenAI).

## Solution

Changed credential lookup to use **tier field and isDefault flag** instead of name matching:

```typescript
// NEW - Reliable flag-based matching
const credential = credentials.find(c =>
  c.tier === tier && c.isDefault === true
);
```

## Changes Made

### 1. Updated TypeScript Types (`mongoCredentials.ts`)

Added tier-specific fields to `StoredLLMCredential` interface:

```typescript
export interface StoredLLMCredential extends BaseCredential {
  type: 'llm';
  provider: string;
  baseUrl: string;
  defaultModel: string;
  apiKey: string;
  // Tier-specific fields
  tier?: 'STARTER' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ULTIMATE';
  isDefault?: boolean;
  defaultForTiers?: Array<'STARTER' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ULTIMATE'>;
}
```

### 2. Updated Credential Lookup (`defaultCredentialsManager.ts`)

#### `getDefaultCredentialForTier()`
- Changed from name-based to tier + isDefault flag matching
- Added fallback to `defaultForTiers` array

#### `ensureDefaultCredentialForTier()`
- Changed from name-based to tier + isDefault flag matching

#### `updateDefaultCredentials()`
- Changed from name-based to tier + isDefault flag matching
- Fixed bug: was checking `credential.model` instead of `credential.defaultModel`

### 3. Database Cleanup (Optional)

Updated credential names for consistency (though no longer required for lookup):
- `Regno.AI - Starter Tier` → `Regno Default - STARTER (GPT-4o-mini)`
- `Regno.AI - Standard Tier` → `Regno Default - STANDARD (GPT-4o-mini)`
- `Regno.AI - Professional Tier` → `Regno Default - PROFESSIONAL (Sonnet 3.5)`
- `Regno.AI - Enterprise Tier` → `Regno Default - ENTERPRISE (Opus 3.5)`
- `Regno.AI - Ultimate Tier` → `Regno Default - ULTIMATE (Sonnet 4.5)`

## Verification

All tier credentials are now correctly matched by tier + isDefault flag:

```
STARTER:    ✓ OpenRouter with meta-llama/llama-3.3-8b-instruct:free
STANDARD:   ✓ OpenRouter with gpt-4o-mini
PROFESSIONAL: ✓ OpenRouter with claude-3-5-sonnet-20241022
ENTERPRISE: ✓ OpenRouter with gpt-4-turbo
ULTIMATE:   ✓ OpenRouter with claude-sonnet-4-20250514
```

## Benefits

1. **More Reliable**: Matching by flags instead of fragile string names
2. **Flexible**: Credential names can be changed without breaking lookups
3. **Type-Safe**: Proper TypeScript types instead of `as any` casts
4. **Future-Proof**: Multiple credentials can target the same tier via `defaultForTiers` array

## Impact

- STANDARD tier now correctly uses OpenRouter with `gpt-4o-mini`
- All other tiers are validated and working correctly
- No breaking changes to existing code
