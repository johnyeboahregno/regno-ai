# Regno AI Chat Widget

This application can be used both as a standalone SvelteKit app and as an embeddable widget for any website.

## 🚀 Quick Start

### Standalone Mode
```bash
npm run dev
# Access at http://localhost:5173
```

### Widget Mode
```bash
npm run build:widget
# Files will be generated in dist/widget/
```

## 📦 Building

### Build All Versions
```bash
npm run build:all
```

### Build Standalone Only
```bash
npm run build:standalone
```

### Build Widget Only
```bash
npm run build:widget
```

## 🔧 Widget Integration

### Method 1: Auto-initialization with Data Attributes
```html
<div id="my-widget" data-regno-ai-widget 
     data-theme="default" 
     data-position="bottom-right"></div>

<script src="https://yoursite.com/dist-widget/regno-ai-widget.js"></script>
```

### Method 2: Manual Initialization
```html
<script src="https://yoursite.com/dist-widget/regno-ai-widget.js"></script>
<script>
  const widget = new RegnoAIChatWidget({
    theme: 'default',
    position: 'bottom-right',
    serverEndpoint: 'https://your-api.com/regno-ai',
    debug: false
  });
</script>
```

### Method 3: Container-based Embedding
```html
<div id="regno-ai-container"></div>

<script src="https://yoursite.com/dist-widget/regno-ai-widget.js"></script>
<script>
  const widget = new RegnoAIChatWidget({
    containerId: 'regno-ai-container',
    theme: 'default'
  });
</script>
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `theme` | string | 'default' | Widget theme ('default', 'dark', 'light') |
| `position` | string | 'bottom-right' | Position for floating widget |
| `containerId` | string | null | ID of container element for embedded mode |
| `serverEndpoint` | string | null | Custom server endpoint URL |
| `debug` | boolean | false | Enable debug mode |
| `autoInit` | boolean | true | Auto-initialize on load |

### Position Options
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

## 🎮 API Methods

```javascript
// Create widget instance
const widget = new RegnoAIChatWidget(options);

// Control methods
widget.open();          // Open the chat widget
widget.close();         // Close the chat widget
widget.toggle();        // Toggle widget open/closed
widget.destroy();       // Remove widget from page
widget.updateOptions(newOptions); // Update configuration
```

## 🎨 Styling & CSS Isolation

The widget uses CSS isolation to prevent conflicts with parent site styles:

- All widget styles are scoped within `.regno-ai-widget-container`
- Uses CSS reset to prevent style inheritance
- Responsive design with mobile optimizations
- High contrast and reduced motion support

## 📱 Responsive Design

The widget automatically adapts to different screen sizes:

- Desktop: Full-featured interface
- Tablet: Optimized touch interactions
- Mobile: Compact design with larger touch targets

## 🔧 Development

### Project Structure
```
src/
├── lib/                    # Shared components and utilities
│   ├── components/         # Svelte components
│   ├── stores/            # Application state
│   └── services/          # API services
├── routes/                # SvelteKit routes (standalone mode)
└── widget/                # Widget-specific files
    ├── widget-entry.js    # Widget entry point
    ├── WidgetApp.svelte   # Widget wrapper component
    └── widget-styles.css  # Widget-specific styles
```

### Adding New Features

1. Add components to `src/lib/components/`
2. Update widget wrapper in `src/widget/WidgetApp.svelte`
3. Test in both standalone and widget modes

### Testing

```bash
# Test standalone mode
npm run dev

# Test widget mode
npm run build:widget
# Open static/widget.html in browser
```

## 🚀 Deployment

### CDN Deployment
1. Build the widget: `npm run build:widget`
2. Upload `dist/widget/` contents to your CDN
3. Reference the files in your integration code

### Self-hosted
1. Build: `npm run build:all`
2. Deploy both `dist/` (standalone) and `dist/widget/` (widget) to your server

## 🔒 Security

- CORS headers are properly configured
- Content Security Policy compatible
- No external dependencies loaded at runtime
- Sanitized user inputs

## 🐛 Troubleshooting

### Widget Not Loading
1. Check console for JavaScript errors
2. Verify script and CSS paths are correct
3. Ensure CORS is properly configured

### Styling Issues
1. Check for CSS conflicts with parent site
2. Verify widget container has proper z-index
3. Test with browser developer tools

### Integration Issues
1. Ensure DOM is ready before initialization
2. Check for JavaScript conflicts
3. Use debug mode for detailed logging

## 📞 Support

For technical support and questions:
- Check the demo at `/static/widget.html`
- Review integration examples above
- Enable debug mode for troubleshooting