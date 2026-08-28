# Cortex Brain Explorer - Phase 5 Implementation

## Overview

The Cortex Brain Explorer provides an interactive interface for exploring, debugging, and understanding what Cortex Brain has learned. It includes:

1. **REST API Endpoints** - For programmatic access
2. **Python Client Library** - For Jupyter/Python integration
3. **Example Jupyter Notebook** - Interactive exploration tutorials

## Why This Matters

Previously, Cortex Brain was a "black box" - patterns went in, responses came out, but:
- Hard to understand WHY a pattern was/wasn't matched
- No visualization of pattern relationships
- No statistics on pattern usage over time
- Difficult to debug knowledge gaps

The Explorer solves all these issues.

---

## API Endpoints

### Search Patterns

```
POST /api/cortex/explorer/search
```

Search patterns by semantic similarity.

**Request Body:**
```json
{
  "query": "authentication patterns",
  "domain": "security",
  "limit": 20
}
```

**Response:**
```json
{
  "query": "authentication patterns",
  "domain": "security",
  "patterns": [...],
  "totalMatches": 15,
  "semanticMatchCount": 10,
  "overallConfidence": 0.85
}
```

### List Patterns

```
GET /api/cortex/explorer/patterns
```

Query parameters:
- `domain` - Filter by domain
- `sortBy` - Sort field (useCount, confidence, name)
- `limit` - Max results (default 100)
- `minConfidence` - Minimum confidence threshold

### Get Pattern Details

```
GET /api/cortex/explorer/patterns/{id}
```

Query parameters:
- `includeSimilar` - Include similar patterns (true/false)
- `similarLimit` - Max similar patterns

### List Domains

```
GET /api/cortex/explorer/domains
```

Returns all pattern domains with counts.

### Pattern Graph

```
GET /api/cortex/explorer/graph
```

Get pattern relationship graph for visualization.

Query parameters:
- `domain` - Filter by domain
- `minConfidence` - Minimum confidence threshold
- `maxNodes` - Maximum nodes (default 100)

**Response:**
```json
{
  "nodes": [
    {"id": "...", "name": "...", "domain": "...", "confidence": 0.8, "useCount": 42}
  ],
  "edges": [
    {"source": "...", "target": "...", "relationship": "similar_to", "weight": 0.75}
  ]
}
```

### Statistics

```
GET /api/cortex/explorer/stats
```

Get pattern usage statistics.

Query parameters:
- `days` - Time period (default 30)
- `domain` - Filter by domain

### Explain Matching

```
POST /api/cortex/explorer/explain
```

Debug why patterns did/didn't match a query.

**Request Body:**
```json
{
  "query": "user login",
  "expectedPattern": "auth-flow-pattern",
  "domain": "security"
}
```

**Response:**
```json
{
  "query": "user login",
  "matchedPatterns": [...],
  "expectedPatternAnalysis": {
    "found": false,
    "similarity": 0.42,
    "reason": "Embedding similarity was 0.42, below threshold 0.5",
    "suggestions": ["Add 'login' to trigger keywords"]
  }
}
```

### Export Patterns

```
GET /api/cortex/explorer/export
```

Export patterns to JSON or CSV.

Query parameters:
- `domain` - Filter by domain
- `format` - 'json' or 'csv'
- `limit` - Max patterns

---

## Python Client Library

### Installation

**Option 1: Using the install script (recommended)**

```bash
cd tools/cortex_brain_explorer
./install.sh
```

This creates a virtual environment and installs all dependencies.

**Option 2: Manual virtual environment setup**

```bash
cd tools/cortex_brain_explorer

# Create virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install with visualization dependencies
pip install -e .[full]
```

**Activating the environment (for subsequent sessions)**

```bash
source tools/cortex_brain_explorer/.venv/bin/activate
```

### Quick Start

```python
from cortex_brain_explorer import connect

# Connect to local Regno instance
brain = connect("http://localhost:5173")

# Check connection
if brain.is_healthy():
    print("Connected!")

# Search patterns
results = brain.search("authentication patterns")
print(results)

# Visualize pattern graph
brain.visualize_graph(domain="security")

# Get statistics
stats = brain.get_stats(days=30)
print(f"Total patterns: {stats['summary']['totalPatterns']}")

# Debug matching
explanation = brain.explain_recall("user login", expected_pattern="auth-pattern")
print(explanation['expectedPatternAnalysis']['reason'])
```

### API Reference

#### Search & Query

| Method | Description |
|--------|-------------|
| `search(query, domain, limit)` | Search patterns by semantic similarity |
| `get_pattern(id, include_similar)` | Get pattern details |
| `list_patterns(domain, sort_by, limit)` | List all patterns |
| `list_domains()` | Get all domains |
| `get_domain_stats()` | Statistics per domain |

#### Visualization

| Method | Description |
|--------|-------------|
| `get_graph(domain, min_confidence)` | Get NetworkX graph object |
| `visualize_graph(domain, figsize)` | Display pattern relationship graph |

#### Analytics

| Method | Description |
|--------|-------------|
| `get_stats(days, domain)` | Get usage statistics |
| `plot_usage_over_time(days)` | Plot analytics charts |

#### Debug & Explain

| Method | Description |
|--------|-------------|
| `explain_recall(query, expected_pattern)` | Explain pattern matching |
| `find_similar_patterns(pattern_id)` | Find similar patterns |
| `find_low_confidence_patterns(threshold)` | Find patterns needing improvement |
| `find_unused_patterns(max_uses)` | Find unused patterns |

#### Export

| Method | Description |
|--------|-------------|
| `export_patterns(domain, format, save_to)` | Export to JSON/CSV |

---

## Example Jupyter Notebook

An interactive notebook is provided at:
```
tools/notebooks/cortex_brain_exploration.ipynb
```

The notebook demonstrates:
1. Connecting to Cortex Brain
2. Exploring domains
3. Searching patterns
4. Viewing pattern details
5. Visualizing pattern graphs
6. Analyzing usage statistics
7. Debugging pattern matching
8. Finding knowledge gaps
9. Exporting patterns

### Running the Notebook

```bash
# Install (creates virtual environment)
cd tools/cortex_brain_explorer
./install.sh

# Activate and run
source .venv/bin/activate
jupyter notebook ../notebooks/cortex_brain_exploration.ipynb
```

---

## Files Created

### API Endpoints
- `src/routes/api/cortex/explorer/search/+server.ts`
- `src/routes/api/cortex/explorer/patterns/+server.ts`
- `src/routes/api/cortex/explorer/patterns/[id]/+server.ts`
- `src/routes/api/cortex/explorer/domains/+server.ts`
- `src/routes/api/cortex/explorer/graph/+server.ts`
- `src/routes/api/cortex/explorer/stats/+server.ts`
- `src/routes/api/cortex/explorer/explain/+server.ts`
- `src/routes/api/cortex/explorer/export/+server.ts`

### Python Library
- `tools/cortex_brain_explorer/__init__.py`
- `tools/cortex_brain_explorer/client.py`
- `tools/cortex_brain_explorer/setup.py`

### Notebooks
- `tools/notebooks/cortex_brain_exploration.ipynb`

---

## Use Cases

### 1. Understanding Pattern Coverage

```python
# What domains have patterns?
domains = brain.list_domains()

# How many patterns per domain?
stats = brain.get_domain_stats()
```

### 2. Debugging Search Issues

```python
# Why didn't my expected pattern match?
result = brain.explain_recall(
    query="user authentication",
    expected_pattern="auth-flow-v2"
)

# Get suggestions for improvement
for suggestion in result['expectedPatternAnalysis']['suggestions']:
    print(f"- {suggestion}")
```

### 3. Finding Knowledge Gaps

```python
# Patterns with low confidence
low_conf = brain.find_low_confidence_patterns(threshold=0.5)

# Patterns never used
unused = brain.find_unused_patterns()

# These need attention!
```

### 4. Visualizing Pattern Relationships

```python
# See how patterns relate to each other
brain.visualize_graph(domain="expert")

# Node size = usage count
# Node color = confidence
```

### 5. Monitoring Pattern Health

```python
# Weekly stats check
stats = brain.get_stats(days=7)
print(f"Success rate: {stats['summary']['successRate']*100:.1f}%")
print(f"Avg confidence: {stats['summary']['avgConfidence']:.2f}")

# Visualize trends
brain.plot_usage_over_time(days=30)
```

---

## Version History

- **v1.0** (Phase 5) - Initial implementation
  - REST API endpoints for search, patterns, graph, stats, explain, export
  - Python client library with visualization support
  - Example Jupyter notebook
