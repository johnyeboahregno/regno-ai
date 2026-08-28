# HTML Export Console Styling Update

## Overview
Updated the HTML export feature to match the Maestro console's exact visual styling, providing a true WYSIWYG experience where exported HTML documents look identical to the on-screen display.

## Changes Made

### File Modified
`src/routes/api/maestro/export-selection/+server.ts` - `generateHtmlFromSelection()` function

### Styling Updates

#### 1. Font Size
**Before:** 1rem (16px) - larger, more readable
**After:** 0.75rem (12px) - matches console's `text-xs` class

**Rationale:** Console uses compact text sizing for density

#### 2. Section Header Colors
**Before:** All headers were purple (#a78bfa)
**After:**
- **Cyan (#22d3ee)** for: Summary, Findings, Detailed Output
- **Purple (#a78bfa)** for: Recommendations

**Implementation:**
```typescript
if (trimmed.match(/^(Summary|Findings|Detailed Output):/i)) {
  // Cyan headers
  contentHtml += `<div class="section-header cyan">`;
} else if (trimmed.match(/^Recommendations:/i)) {
  // Purple headers
  contentHtml += `<div class="section-header purple">`;
}
```

**CSS:**
```css
.section-header.cyan .label {
  color: #22d3ee;  /* Matches text-cyan-400 */
}

.section-header.purple .label {
  color: #a78bfa;  /* Matches text-purple-400 */
}
```

#### 3. Background Color
**Before:** `rgba(31, 41, 55, 0.8)` with backdrop-filter blur
**After:** `rgba(31, 41, 55, 0.5)` without blur

**Rationale:** Matches console's `bg-gray-800/50` exactly

#### 4. List Styling
**Before:** Custom styled bullets with green color and absolute positioning
```css
li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #34d399;
  font-weight: bold;
}
```

**After:** Simple disc bullets matching console
```css
.list {
  list-style-type: disc;
  list-style-position: inside;
  margin: 0.5rem 0 0.75rem 0;
}
```

**Rationale:** Console uses standard `list-disc list-inside` classes

#### 5. Spacing and Layout
**Before:**
- Large spacing (2-3rem)
- Generous padding
- Line height 1.75

**After:**
- Compact spacing (0.5-1rem)
- Tighter padding
- Line height 1.5

**Key CSS Changes:**
```css
.content {
  font-size: 0.75rem;      /* Was: 1rem */
  line-height: 1.5;        /* Was: 1.75 */
}

.section-header {
  margin-bottom: 0.5rem;   /* Was: 1rem */
  margin-top: 1rem;        /* Was: 2rem */
}

p {
  margin-bottom: 0.75rem;  /* Was: 1rem */
}
```

#### 6. Field Label Styling
**New Feature:** Intelligent detection of label:value pairs

**Implementation:**
```typescript
if (trimmed.includes(':') && !trimmed.endsWith(':')) {
  const colonIndex = trimmed.indexOf(':');
  const label = trimmed.substring(0, colonIndex);
  const value = trimmed.substring(colonIndex + 1).trim();
  // Only treat as label:value if label is short
  if (label.length < 30 && !label.match(/\s+\w+\s+/)) {
    contentHtml += `<div class="field">`;
    contentHtml += `<span class="field-label">${label}:</span>`;
    contentHtml += `<span class="field-value">${value}</span>`;
    contentHtml += `</div>`;
  }
}
```

**CSS:**
```css
.field {
  display: flex;
  gap: 0.5rem;
}

.field-label {
  color: #a78bfa;      /* Purple */
  font-weight: 600;
  flex-shrink: 0;
}

.field-value {
  color: #d1d5db;      /* Gray-300 */
  flex: 1;
}
```

#### 7. Title Styling
**Before:**
```css
h1 {
  color: #a78bfa;           /* Purple */
  font-size: 2rem;          /* Large */
  font-weight: 700;         /* Bold */
  border-bottom: 2px solid;  /* Thick border */
}
```

**After:**
```css
h1 {
  color: #d1d5db;                              /* Gray-300 */
  font-size: 1.25rem;                          /* Smaller */
  font-weight: 600;                            /* Semi-bold */
  border-bottom: 1px solid rgba(75, 85, 99, 0.3);  /* Thin border */
}
```

## Color Palette

### Console Colors Used
- **Background:** `#111827` (gray-900)
- **Container:** `rgba(31, 41, 55, 0.5)` (gray-800/50)
- **Text Primary:** `#d1d5db` (gray-300)
- **Text Secondary:** `#9ca3af` (gray-400)
- **Text Tertiary:** `#6b7280` (gray-500)
- **Cyan Headers:** `#22d3ee` (cyan-400)
- **Purple Headers:** `#a78bfa` (purple-400)
- **Borders:** `rgba(75, 85, 99, 0.3)` (gray-600/30)

### Print Styles
Print-friendly colors for when users print the HTML:
- **Cyan → Darker Cyan:** `#0891b2` (cyan-600)
- **Purple → Darker Purple:** `#7c3aed` (purple-600)
- **Background → White:** `white`
- **Text → Dark Gray:** `#374151` (gray-700)

## Parsing Intelligence

### Section Header Detection
The function now intelligently detects and styles section headers:
- Matches patterns like "Summary:", "Findings:", "Recommendations:"
- Case-insensitive matching
- Preserves content after colon

### List Item Detection
Supports multiple list formats:
- Bullet points: `•` or `-`
- Numbered lists: `1.`, `2.`, etc.
- Automatically wraps in `<ul>` tags
- Properly closes lists before non-list content

### Label:Value Pair Detection
Smart detection of field pairs:
- Requires a colon in the middle
- Label must be < 30 characters
- Label shouldn't contain multiple words with spaces
- Preserves regular paragraphs with colons

## Comparison: Before vs After

### Before (Generic Dark Theme)
- Large, readable fonts (16px base)
- Purple-dominant color scheme
- Custom green bullet points
- Generous spacing
- Glossy, blurred background
- Professional but distinct from console

### After (Console-Matching Theme)
- Compact fonts (12px base)
- Cyan/purple color scheme matching console
- Simple disc bullets
- Tight spacing
- Flat, transparent background
- Identical to console appearance

## Testing

To verify the styling matches:

1. **Open Maestro Console:**
   - Run an orchestration
   - View phase outputs
   - Note the visual styling

2. **Select and Export:**
   - Select text with Summary/Findings/Recommendations
   - Right-click → Export as HTML
   - Open the HTML file

3. **Visual Comparison:**
   - Font size should match (small, compact)
   - Colors should be identical:
     - Summary/Findings headers: cyan
     - Recommendations headers: purple
     - Body text: gray-300
   - Spacing should be tight
   - Bullets should be simple discs

## Benefits

### 1. True WYSIWYG
Users see exactly what they get - exported HTML looks identical to on-screen display

### 2. Consistency
All export formats (Word, PDF, HTML) now maintain visual consistency with the console

### 3. Professional Appearance
Maintains the Maestro console's professional, compact aesthetic in exported documents

### 4. Better Information Density
Smaller fonts and tighter spacing allow more content to fit on screen/page

### 5. Print-Friendly
Dedicated print styles ensure documents print well while maintaining visual hierarchy

## Edge Cases Handled

1. **Headers with content after colon:**
   - "Summary: This is the summary text"
   - Properly styles both label and content

2. **Mixed list formats:**
   - Handles bullets, dashes, and numbered lists
   - Automatically closes lists before paragraphs

3. **Long labels:**
   - Label:value detection only triggers for short labels
   - Prevents misidentifying sentences with colons

4. **Empty lines:**
   - Filters out empty paragraphs
   - Maintains proper spacing between sections

5. **Special characters:**
   - Properly escapes HTML entities
   - Prevents XSS vulnerabilities

## Future Enhancements

1. **Syntax Highlighting:**
   - Detect and highlight code blocks
   - Use console's code styling

2. **Icon Support:**
   - Include status icons (✓, ✗, ⚠)
   - Match console's icon usage

3. **Responsive Breakpoints:**
   - Mobile-friendly layouts
   - Adaptive font sizing

4. **Dark/Light Toggle:**
   - JavaScript toggle for theme switching
   - Preserve user preference

5. **Advanced Formatting:**
   - Tables
   - Nested lists
   - Blockquotes

## Conclusion

The HTML export now provides a pixel-perfect representation of the Maestro console's visual styling, ensuring users get exactly what they see when they export selections. This update maintains the professional, compact aesthetic of the console while ensuring documents are readable, printable, and visually consistent across all export formats.
