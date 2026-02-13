# MDHTMLEditor

A TinyMCE-compatible HTML editor built on TipTap. This is the core vanilla TypeScript package - for React usage, see `@mdaemon/html-editor-react`.

## Installation

```bash
npm install @mdaemon/html-editor
```

## Usage

### Vanilla JavaScript/TypeScript

```typescript
import { HTMLEditor, setTranslate } from '@mdaemon/html-editor';
import '@mdaemon/html-editor/styles';

// Optional: Set up translation function
setTranslate((key) => myTranslationFunction(key));

// Create editor
const container = document.getElementById('editor');
const editor = new HTMLEditor(container, {
  height: 400,
  basicEditor: false, // Full toolbar
  includeTemplates: true,
  templates: [
    { title: 'Greeting', content: '<p>Hello!</p>' }
  ],
  fontName: 'Arial',
  fontSize: '12pt',
});

// Get/set content
const html = editor.getContent();
editor.setContent('<p>New content</p>');

// Insert content at cursor
editor.insertContent('<b>Bold text</b>');

// Execute commands (TinyMCE compatible)
editor.execCommand('bold');
editor.execCommand('fontsize', false, '14pt');

// Listen to events
editor.on('change', (content) => {
  console.log('Content changed:', content);
});

editor.on('dirty', (isDirty) => {
  console.log('Editor dirty state:', isDirty);
});

// Clean up
editor.destroy();
```

### Custom Toolbar Buttons

```typescript
const editor = new HTMLEditor(container, {
  setup: (ed) => {
    ed.ui.registry.addButton('myButton', {
      tooltip: 'My Custom Button',
      text: 'Click Me',
      onAction: () => {
        ed.insertContent('<p>Custom content!</p>');
      },
    });
  },
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `basicEditor` | boolean | false | Use simplified toolbar for notes/tasks |
| `includeTemplates` | boolean | false | Show template dropdown |
| `templates` | Template[] | [] | Array of templates |
| `dropbox` | boolean | false | Enable Dropbox integration |
| `images_upload_url` | string | - | URL for image uploads |
| `font_family_formats` | string | - | Font family options |
| `font_size_formats` | string | - | Font size options |
| `fontName` | string | - | Default font family |
| `fontSize` | string | - | Default font size |
| `directionality` | 'ltr' \| 'rtl' | 'ltr' | Text direction |
| `language` | string | 'en' | UI language |
| `height` | string \| number | 300 | Editor height |
| `skin` | 'oxide' \| 'oxide-dark' | 'oxide' | Theme |
| `toolbar_mode` | 'sliding' \| 'wrap' | 'sliding' | Toolbar overflow behavior |

## API Reference

### Methods

- `getContent(): string` - Get HTML content
- `setContent(html: string): void` - Set HTML content
- `insertContent(html: string): void` - Insert HTML at cursor
- `execCommand(cmd: string, ui?: boolean, value?: any): boolean` - Execute editor command
- `isDirty(): boolean` - Check if content has changed
- `setDirty(state: boolean): void` - Set dirty state
- `focus(): void` - Focus the editor
- `hasFocus(): boolean` - Check if editor has focus
- `destroy(): void` - Clean up and remove editor

### Events

- `init` - Editor initialized
- `change` - Content changed (debounced)
- `dirty` - Dirty state changed
- `focus` - Editor focused
- `blur` - Editor blurred

### Supported Commands

The following TinyMCE-compatible commands are supported:

- `bold`, `italic`, `underline`, `strikethrough`
- `fontname`, `fontsize`, `lineheight`
- `forecolor`, `backcolor`
- `justifyleft`, `justifycenter`, `justifyright`, `justifyfull`
- `insertunorderedlist`, `insertorderedlist`
- `indent`, `outdent`
- `undo`, `redo`
- `removeformat`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

UNLICENSED - MDaemon Technologies
