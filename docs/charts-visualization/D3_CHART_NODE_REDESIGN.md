# D3 Chart Node - Complete Redesign with AI Assistant

## Overview

The D3 Chart node has been completely redesigned with a simpler, more powerful approach featuring an AI-powered configuration assistant:

**Old Approach** (removed):
- Simple / Advanced / Auto tabs
- Complex configuration UI
- Prompt library with predefined templates
- Manual field selection with limited intelligence

**New Approach** (implemented):
1. User provides sample data (JSON)
2. System automatically detects field names and types
3. User selects LLM credential and model
4. **NEW**: AI Chart Assistant generates multiple ready-to-use configuration presets
5. User can either apply a preset OR manually configure comprehensive D3 chart options
6. Server builds intelligent prompt from all configuration
7. LLM generates optimal D3.js rendering code
8. Chart renders with LLM-generated code

## Key Benefits

✅ **Simpler UI**: No tabs, clean collapsible sections
✅ **More Control**: Comprehensive D3 chart options (30+ chart types)
✅ **AI-Driven**: LLM generates rendering code from configuration
✅ **AI Assistant**: Get instant configuration suggestions with natural language
✅ **Context-Aware**: Automatic field type detection (timestamps, numbers, strings, etc.)
✅ **Smart Defaults**: Field dropdowns show detected types for better guidance
✅ **Flexible**: Works with any data structure via sample data
✅ **Maintainable**: No hardcoded chart logic on server

## Configuration Structure

### 1. Sample Data (Required)
- User provides JSON sample of 1 record or array of records
- **NEW**: System automatically detects fields AND their types
- **NEW**: Visual display shows detected fields with icons and type labels
- **NEW**: Automatic type detection:
  - 🔢 **number**: Numeric values
  - ⏰ **timestamp**: Unix timestamps (milliseconds > 1000000000000)
  - 📝 **string**: Text values
  - 📅 **date**: Date objects
  - ✓ **boolean**: True/false values
  - 📋 **array**: Array values
  - 📦 **object**: Nested objects
- Fields populate dropdown menus for data mapping with type hints

**Example**:
```json
{
  "_id": "abc123",
  "timestamp": 1760371839914,
  "category": "A",
  "value": 42.5,
  "count": 10
}
```

**Detected Fields** (displayed visually in UI):
- ⏰ _id (string)
- ⏰ timestamp (timestamp) ← Automatically detected as timestamp!
- 📝 category (string)
- 🔢 value (number)
- 🔢 count (number)

### 2. LLM Configuration (Required)
- Select LLM credential to use
- Select model (defaults to credential's default model)
- No prompt writing needed - server builds it automatically
- **NEW**: Manage credentials button for quick access
- **NEW**: Reset to default model button

### 2.5. AI Chart Assistant (NEW - Optional but Recommended)
The AI Chart Assistant helps you configure charts using natural language:

**How it works:**
1. Enter natural language instructions (e.g., "I want to create a line chart using time series data showing sales over time, grouped by product category")
2. Select how many configuration presets to generate (3, 5, or 7 options)
3. Click "Generate Configs"
4. AI analyzes your instructions and sample data
5. Receive multiple ready-to-use configuration presets
6. Click on any preset to apply it instantly

**Example Instructions:**
- "Show revenue trends by region over time"
- "Compare product sales across quarters as a bar chart"
- "Visualize user activity with a heatmap"
- "Create a bubble chart showing cost vs. efficiency, sized by volume"

**What you get:**
- Name and description of each preset
- Complete chart configuration (type, fields, options)
- Visual tags showing chart type and data mapping
- One-click application

This feature is perfect for:
- Quickly exploring different visualization options
- Learning what configuration options work best
- Saving time on manual configuration
- Getting AI-powered recommendations

### 3. Chart Type Selection
Comprehensive catalog organized by category:

**Basic**:
- Bar Chart, Line Chart, Area Chart
- Pie Chart, Scatter Plot, Bubble Chart

**Statistical**:
- Histogram, Box Plot, Violin Plot, Ridgeline Plot

**Hierarchical**:
- Treemap, Sunburst, Tree Diagram, Circle Pack

**Network & Flow**:
- Sankey Diagram, Chord Diagram, Force Graph

**Specialized**:
- Heatmap, Calendar Heatmap, Radar Chart
- Parallel Coordinates, Waterfall Chart
- Bullet Chart, Gauge Chart

### 4. General Options
- Width, Height
- Title, Subtitle
- Responsive (auto-fit to container)
- Margins (top, right, bottom, left)

### 5. Data Mapping (Context-Aware)
All dropdowns are now context-aware and show detected field types:

- **X Field** (auto-populated with type hints)
  - Shows: `timestamp (timestamp)`, `category (string)`, etc.
  - Label hint: "typically: timestamp, category, or ordinal"

- **Y Field** (auto-populated with type hints)
  - Shows: `value (number)`, `count (number)`, etc.
  - Label hint: "typically: number/measurement"

- **Group/Series Field** (optional, auto-populated with type hints)
  - Shows all fields with their types
  - Label hint: "optional - for multiple series"
  - 💡 Tip displayed: "You can use composite keys like 'field1|field2' for grouping by multiple fields"

- **Size Field** (for bubbles, optional)
  - Shows all fields with their types
  - Label hint: "for bubble charts - typically number"

- **Color Field** (optional)
  - Shows all fields with their types
  - Label hint: "optional - for color encoding"

### 6. Colors
- D3 Color Schemes (10 built-in schemes)
- Visual preview of each scheme
- Category10, Accent, Dark2, Paired, Pastel1, Set1, Set2, Set3, Tableau10

### 7. Chart-Specific Options

**Bar Chart**:
- Orientation (vertical/horizontal)
- Bar Padding (0-1)
- Stacked bars
- Show values on bars

**Line/Area Chart**:
- Curve Type (10 D3 curve types: Linear, Monotone X/Y, Basis, Cardinal, etc.)
- Stroke Width
- Show data points
- Fill area under line

**Pie Chart**:
- Inner Radius (0 = pie, >0 = donut)
- Show labels
- Show percentages

**Scatter/Bubble Chart**:
- Point size/range
- Point opacity
- Point shape

### 8. Legend
- Show/hide legend
- Position (right, left, top, bottom)

### 9. Animation
- Enable/disable animations
- Duration (ms)

## Server-Side Processing

### D3ChartExecutor Flow

1. **Validation**:
   ```typescript
   - Check sample data is provided
   - Check LLM credential is selected
   ```

2. **Data Preparation**:
   ```typescript
   - Get input data from upstream nodes
   - Limit sample to first 5 records for prompt
   ```

3. **Intelligent Prompt Building**:
   ```typescript
   buildChartPrompt(config, data)
   ```

   Generates comprehensive prompt including:
   - Chart type
   - Sample data structure (user-provided)
   - Actual data sample (first 5 records)
   - Data statistics (total records, available fields)
   - Data mapping (X, Y, group, size, color fields)
   - Dimensions & layout (width, height, margins, title)
   - Scale configuration (types, nice values)
   - Axes configuration (labels, grid lines, tick format)
   - Color scheme
   - Legend configuration
   - Chart-specific options
   - Animation settings
   - 10 detailed requirements for the LLM

4. **LLM Code Generation**:
   ```typescript
   await callLLM({
     messages: [
       { role: 'system', content: 'D3.js expert prompt' },
       { role: 'user', content: generatedPrompt }
     ],
     credentialId: config.llmCredentialId,
     temperature: 0.3,
     maxTokens: 4000
   })
   ```

5. **Store Rendering Code**:
   ```typescript
   updateNodeConfig(node, context, {
     d3RenderingCode: cleanedCode,
     d3GeneratedAt: timestamp,
     d3ChartData: data,
     d3ChartType: config.chartType
   })
   ```

### Prompt Generation Example

The server builds a detailed prompt like:

```markdown
# D3.js Chart Generation Request

## Chart Type
line

## Sample Data Structure
User provided this sample data structure:
{ "_id": "abc123", "timestamp": 1760371839914, "value": 42.5 }

## Actual Data Sample (first 5 records)
[actual data from pipeline...]

## Data Statistics
- Total records: 1000
- Available fields: _id, timestamp, category, value, count

## Data Mapping
- X Field: timestamp
- Y Field: value
- Group/Series Field: category

## Chart Dimensions & Layout
- Width: 800px
- Height: 600px
- Margins: {"top":40,"right":120,"bottom":60,"left":60}
- Title: Sales Over Time
- Responsive: No

## Scale Configuration
- X Scale: auto (nice: true)
- Y Scale: auto (nice: true)

## Axes Configuration
- X Axis: Show (label: "Time")
  - Grid Lines: Yes
  - Tick Format: auto
- Y Axis: Show (label: "Sales ($)")
  - Grid Lines: Yes
  - Tick Format: auto

## Colors
- Color Scheme: schemeCategory10

## Legend
- Show Legend: Yes
- Position: right

## Chart-Specific Options

**Line/Area Chart:**
- Curve Type: curveMonotoneX
- Stroke Width: 2px
- Show Points: Yes

## Animation
- Enabled: Yes
- Duration: 750ms

## Requirements

Generate a complete D3.js visualization function that:

1. Creates the chart based on the configuration above
2. Handles the data appropriately (parse, validate, transform)
3. Implements proper scales (detect timestamps automatically)
4. Renders axes properly (format tick labels)
5. Applies colors and styling (use specified D3 color scheme)
6. Includes legend (position as specified)
7. Handles responsive sizing (use fixed dimensions)
8. Implements smooth animations (750ms duration)
9. Adds interactivity (implement tooltips, highlighting)
10. Follows D3.js best practices (v7+ API, efficient data binding)

## Output Format

Return ONLY the JavaScript function code that takes (svgElement, data, config) as parameters.

Example structure:
function renderChart(svgElement, data, config) {
  // Your D3.js code here
}

Do NOT include markdown, explanatory text, comments, example usage, or imports.

Generate the code now:
```

## Client-Side Rendering

The client receives:
```typescript
{
  success: true,
  outputData: [...data...],
  metadata: {
    chartType: 'line',
    dataPoints: 1000,
    renderingCode: 'function renderChart(svgElement, data, config) { ... }',
    generatedAt: '2025-10-24T08:30:00.000Z'
  }
}
```

The chart display component then:
1. Extracts the rendering code
2. Dynamically evaluates the function
3. Calls it with the SVG element, data, and config
4. D3.js renders the chart

## Benefits Over Previous Approach

### Removed Complexity
- ❌ No tabs (Simple/Advanced/Auto)
- ❌ No prompt library management
- ❌ No manual instruction writing
- ❌ No template selection
- ❌ No context building UI

### Added Power
- ✅ 30+ chart types (vs 9 previously)
- ✅ Comprehensive configuration options
- ✅ Automatic prompt generation from config
- ✅ Sample data field detection
- ✅ Dynamic field mapping dropdowns
- ✅ Visual color scheme preview
- ✅ Chart-specific options per type
- ✅ Clean collapsible UI sections

### Better UX
- Simple, focused workflow
- All required fields clearly marked
- Field detection from sample data
- Dropdown auto-population
- Visual feedback (detected fields shown)
- Clear documentation in UI

## Files Changed

### 1. D3ChartModalConfig.ts
- Removed: Simple/Advanced/Auto mode configs
- Removed: Prompt library settings
- Added: `sampleData` (string - JSON)
- Added: `llmCredentialId` (string)
- Added: `specificModel` (string - defaults to credential's default model, same as Expert node)
- Added: Comprehensive chart type configs for 30+ types
- Added: All D3 configuration options

### 2. D3ChartConfigSection.svelte
- Removed: Mode tabs (Simple/Advanced/Auto)
- Removed: Prompt library components
- Removed: PromptEditor integration
- Added: Sample data JSON textarea with field detection
- **NEW**: Field type detection with visual display (icons + type labels)
- **NEW**: `detectedFieldTypes()` derived state for automatic type detection
- Added: LLM credential selection with manage credentials button
- Added: Model selection with reset to default button
- **NEW**: AI Chart Assistant section
  - Natural language instructions textarea
  - Configurable number of presets (3/5/7)
  - Generate configs button with loading state
  - Preset cards with visual tags
  - One-click apply functionality
- **NEW**: Context-aware field dropdowns showing types in options
- **NEW**: Helpful hints and tips on each field label
- Added: Comprehensive chart type grid (organized by category)
- Added: Collapsible sections for all options
- Added: Chart-specific options per chart type
- Added: Visual color scheme preview

### 3. D3ChartExecutor.ts
- Completely rewritten
- Removed: analyzeDataWithLLM (old approach)
- Removed: chartLlmAnalyzer integration (old approach)
- Removed: Data schema analysis (old approach)
- Added: `buildChartPrompt()` - generates comprehensive prompt from config
- Added: `buildChartSpecificOptions()` - adds chart-specific options to prompt
- Added: Direct callLLM with intelligent prompt
- Added: Code extraction and storage

### 4. /api/charts/suggest-configs/+server.ts (NEW)
- New API endpoint for AI Chart Assistant
- Accepts: instructions, sampleData, credentialId, model, numPresets
- Performs automatic field type detection on server
- Builds intelligent prompt with user instructions and data context
- Calls LLM with temperature 0.7 for creative suggestions
- Returns: Array of configuration presets with name, description, and complete config
- Validates preset structure before returning
- Comprehensive error handling and logging

## Usage Examples

### Example 1: Quick Start with AI Assistant (Recommended)

#### Step 1: Add Chart Node
Drag D3 Chart node to canvas, connect to data source

#### Step 2: Provide Sample Data
```json
{
  "timestamp": 1760371839914,
  "product": "Widget A",
  "sales": 42500,
  "quantity": 150
}
```

System automatically detects:
- ⏰ `timestamp` (timestamp) ← Auto-detected!
- 📝 `product` (string)
- 🔢 `sales` (number)
- 🔢 `quantity` (number)

#### Step 3: Select LLM
Choose from dropdown: "OpenAI GPT-4" (or any configured LLM)
Model defaults to credential's default (e.g., gpt-4o-mini)

#### Step 4: Use AI Chart Assistant
1. Enter instructions: "Show sales trends over time, grouped by product"
2. Select: **5 options**
3. Click **Generate Configs**
4. AI returns 5 ready-to-use presets:

**Preset 1**: "Time Series Line Chart with Product Grouping"
- Chart Type: `line`
- X: `timestamp (timestamp)`
- Y: `sales (number)`
- Group: `product (string)`

**Preset 2**: "Area Chart Showing Sales Volume"
- Chart Type: `area`
- X: `timestamp (timestamp)`
- Y: `sales (number)`
- Stacked by: `product (string)`

**Preset 3**: "Bar Chart Comparing Products"
...and more

5. Click on **Preset 1** to apply it instantly
6. All configuration fields are automatically filled

#### Step 5: Fine-tune (Optional)
- Adjust colors, legend position, or other options
- Everything is pre-configured but customizable

#### Step 6: Execute Pipeline
Server:
1. Builds intelligent prompt from configuration
2. Calls LLM with prompt
3. LLM generates D3.js rendering function
4. Stores code in node config

Client:
1. Receives rendering code
2. Evaluates function
3. Renders chart with D3.js

---

### Example 2: Manual Configuration (Traditional Approach)

#### Steps 1-3: Same as Example 1

#### Step 4: Manual Configuration
Navigate through collapsible sections:

**Chart Type**:
- Select **Line Chart** from Basic category

**Data Mapping** (dropdowns show types):
- X Field: `timestamp (timestamp)`
- Y Field: `sales (number)`
- Group Field: `product (string)`

**General Options**:
- Title: "Sales Over Time by Product"
- Width: 800px
- Height: 600px

**Colors**:
- Color Scheme: **Category10**

**Legend**:
- Show Legend: ✓ Yes
- Position: Right

**Line Chart Options**:
- Curve: Monotone X
- Stroke Width: 2px
- Show Points: ✓ Yes

#### Step 5: Execute Pipeline
Same as Example 1

## Migration Notes

**For existing pipelines**:
- Old D3 chart nodes will need reconfiguration
- Sample data must be provided
- LLM credential must be selected
- Previous auto-analysis configs are not compatible

**Benefits of migration**:
- Much simpler configuration
- More chart types available
- Better control over chart appearance
- Faster configuration (no prompt writing)

## Future Enhancements

Possible additions:
1. ✅ **COMPLETED**: AI Chart Assistant with natural language configuration
2. ✅ **COMPLETED**: Automatic field type detection with visual display
3. ✅ **COMPLETED**: Context-aware dropdowns with type hints
4. Save/load chart configurations as templates
5. Chart preview in configuration modal (live preview before execution)
6. Export chart as image/PDF
7. Real-time data streaming updates
8. Interactive chart editing
9. More chart types (geographic maps, 3D charts, etc.)
10. Custom D3 code editor for advanced users
11. Chart gallery for inspiration
12. AI-suggested chart improvements after rendering
13. Smart field recommendations based on data distribution

## Conclusion

The redesigned D3 Chart node provides a **powerful yet simple** interface for creating any type of D3.js visualization, now enhanced with AI-powered assistance. By leveraging LLM code generation, intelligent configuration suggestions, and context-aware options, users can create professional charts in seconds without writing any code or complex prompts.

**Key Philosophy**:
- **AI-First**: Natural language → Ready-to-use configurations
- **Context-Aware**: System understands your data structure
- **Flexible**: Use AI suggestions or manual configuration
- **Intelligent**: LLM generates optimal rendering code
- **Result**: Perfect charts every time, in half the time

**What Makes This Redesign Special**:
1. 🤖 AI Chart Assistant eliminates guesswork
2. 🔍 Automatic field type detection saves time
3. 💡 Context-aware UI guides you to the right choices
4. ⚡ Multiple presets let you explore different visualizations instantly
5. 🎨 30+ chart types with comprehensive options
6. 🚀 LLM-generated code adapts to your exact data structure
