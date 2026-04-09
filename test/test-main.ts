import { HTMLEditor } from '../src/core/HTMLEditor';
import '../src/styles/editor.scss';

// ── Helpers ─────────────────────────────────────────
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const log = (type: string, msg: string) => {
  const el = $('#event-log');
  const div = document.createElement('div');
  div.className = `log-${type}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${type}: ${msg}`;
  el.prepend(div);
};

// ── Custom-button APIs (used for sidebar enable/disable controls) ──
let customButtonApis: { name: string; api: { setEnabled: (v: boolean) => void } }[] = [];

// ── Create editor ───────────────────────────────────
const container = $('#editor-container');

// SVG data-URI for the timestamp button icon
const clockSvg =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  );

const editor = new HTMLEditor(container, {
  height: 400,
  skin: 'oxide',
  content_css: 'default',
  directionality: 'ltr',
  browser_spellcheck: true,

  // Templates
  includeTemplates: true,
  templates: [
    {
      id: 1,
      title: 'Greeting',
      description: 'A simple greeting message',
      content: '<h2>Hello!</h2><p><img src="https://picsum.photos/seed/greeting/300/120" alt="Greeting banner" style="max-width:100%;" /></p><p>Thank you for reaching out. We appreciate your message and will get back to you shortly.</p>',
    },
    {
      id: 2,
      title: 'Meeting Notes',
      description: 'Template for meeting minutes',
      content: '<h2>Meeting Notes</h2><p><strong>Date:</strong> [date]</p><p><strong>Attendees:</strong> [names]</p><h3>Agenda</h3><ol><li>Item 1</li><li>Item 2</li></ol><h3>Action Items</h3><ul><li>Action 1</li><li>Action 2</li></ul>',
    },
    {
      id: 3,
      title: 'Status Update',
      description: 'Weekly status update template',
      content: '<h2>Status Update</h2><h3>Completed</h3><ul><li>Task 1</li></ul><h3>In Progress</h3><ul><li>Task 2</li></ul><h3>Blocked</h3><ul><li>None</li></ul>',
    },
  ],

  // Include custom button names in the toolbar string
  toolbar:
    'bold italic underline strikethrough | bullist numlist outdent indent blockquote | fontfamily fontsize ' +
    '|| lineheight alignleft aligncenter alignright alignjustify | forecolor backcolor | removeformat copy cut paste ' +
    '| undo redo | image charmap emoticons | fullscreen preview | code link codesample | ltr rtl | searchreplace ' +
    '| template | wordcount timestamp markpen',

  setup: (ed) => {
    // ── Custom button 1: Word Count (text label) ──────────
    ed.ui.registry.addButton('wordcount', {
      text: '💬 Words',
      tooltip: 'Show word count',
      onAction: () => {
        const html = ed.getContent();
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const text = tmp.textContent || '';
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const chars = text.length;
        alert(`Words: ${words}\nCharacters: ${chars}`);
        log('info', `word count: ${words} words, ${chars} chars`);
      },
    });

    // ── Custom button 2: Timestamp (icon via data-URI) ────
    ed.ui.registry.addButton('timestamp', {
      icon: clockSvg,
      tooltip: 'Insert timestamp',
      onAction: () => {
        const ts = new Date().toLocaleString();
        ed.insertContent(`<em>${ts}</em>&nbsp;`);
        log('info', `inserted timestamp: ${ts}`);
      },
    });

    // ── Custom button 3: Mark Pen toggle (active state) ───
    ed.ui.registry.addButton('markpen', {
      text: '🖍️',
      tooltip: 'Toggle mark-pen highlight on selection',
      onSetup: (api) => {
        customButtonApis.push({ name: 'markpen', api });
        api.setActive(false);
      },
      onAction: (api) => {
        const isActive = !api.isActive();
        api.setActive(isActive);

        if (isActive) {
          // Apply a bright-yellow mark to current selection
          const tiptap = ed.getTipTap();
          tiptap?.chain().focus().setHighlight({ color: '#ffe066' }).run();
          log('info', 'mark-pen ON – highlighting selection');
        } else {
          const tiptap = ed.getTipTap();
          tiptap?.chain().focus().unsetHighlight().run();
          log('info', 'mark-pen OFF');
        }
      },
    });

    // ── Standard event wiring ─────────────────────────────
    ed.on('init', () => {
      log('init', 'Editor initialized (id=' + ed.id + ')');
      ed.setContent(
        '<h2>Welcome to the Test Page</h2>' +
        '<p>Start typing or use the sidebar controls to test features.</p>' +
        '<p>Try <strong>bold</strong>, <em>italic</em>, <u>underline</u>, and <s>strikethrough</s>.</p>' +
        '<ul><li>Bullet one</li><li>Bullet two</li></ul>' +
        '<blockquote><p>A block quote for testing.</p></blockquote>'
      );
      refreshHtml();
    });

    ed.on('change', (html) => {
      log('change', `length=${html.length}`);
      refreshHtml();
    });

    ed.on('dirty', (dirty) => {
      log('dirty', String(dirty));
      $('#state-dirty').textContent = String(dirty);
    });

    ed.on('focus', () => {
      log('focus', 'editor focused');
      $('#state-focus').textContent = 'true';
    });

    ed.on('blur', () => {
      log('focus', 'editor blurred');
      $('#state-focus').textContent = 'false';
    });

    ed.on('languagechange', (code) => {
      log('info', `language changed to: ${code}`);
    });

    ed.on('templatechange', (template) => {
      log('info', `template applied: "${template.title}" (id=${template.id})`);
    });
  },
});

// ── HTML output ──────────────────────────────────────
const htmlOutput = $<HTMLTextAreaElement>('#html-output');

function refreshHtml() {
  htmlOutput.value = editor.getContent();
}

$('#btn-refresh-html').addEventListener('click', refreshHtml);
$('#btn-copy-html').addEventListener('click', () => {
  navigator.clipboard.writeText(editor.getContent());
  log('info', 'HTML copied to clipboard');
});

// ── Content controls ─────────────────────────────────
$('#btn-set-content').addEventListener('click', () => {
  const val = $<HTMLTextAreaElement>('#set-content-input').value;
  editor.setContent(val);
  refreshHtml();
});

$('#btn-insert-content').addEventListener('click', () => {
  const val = $<HTMLTextAreaElement>('#set-content-input').value;
  editor.insertContent(val);
  refreshHtml();
});

$('#btn-clear').addEventListener('click', () => {
  editor.setContent('');
  refreshHtml();
});

// ── execCommand buttons ──────────────────────────────
document.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.cmd!;
    editor.execCommand(cmd);
    log('cmd', cmd);
    refreshHtml();
  });
});

$<HTMLSelectElement>('#cmd-fontname').addEventListener('change', (e) => {
  const val = (e.target as HTMLSelectElement).value;
  if (val) {
    editor.execCommand('fontname', false, val);
    log('cmd', `fontname → ${val}`);
  }
});

$<HTMLSelectElement>('#cmd-fontsize').addEventListener('change', (e) => {
  const val = (e.target as HTMLSelectElement).value;
  if (val) {
    editor.execCommand('fontsize', false, val);
    log('cmd', `fontsize → ${val}`);
  }
});

$<HTMLSelectElement>('#cmd-lineheight').addEventListener('change', (e) => {
  const val = (e.target as HTMLSelectElement).value;
  if (val) {
    editor.execCommand('lineheight', false, val);
    log('cmd', `lineheight → ${val}`);
  }
});

$<HTMLInputElement>('#cmd-forecolor').addEventListener('input', (e) => {
  const val = (e.target as HTMLInputElement).value;
  editor.execCommand('forecolor', false, val);
  log('cmd', `forecolor → ${val}`);
});

$<HTMLInputElement>('#cmd-backcolor').addEventListener('input', (e) => {
  const val = (e.target as HTMLInputElement).value;
  editor.execCommand('hilitecolor', false, val);
  log('cmd', `backcolor → ${val}`);
});

// ── State controls ───────────────────────────────────
$('#btn-reset-dirty').addEventListener('click', () => {
  editor.setDirty(false);
  $('#state-dirty').textContent = 'false';
  log('dirty', 'reset to false');
});

$('#btn-focus').addEventListener('click', () => {
  editor.focus();
});

// ── Event log ────────────────────────────────────────
$('#btn-clear-log').addEventListener('click', () => {
  $('#event-log').innerHTML = '';
});

// ── Language selector ────────────────────────────────
$<HTMLSelectElement>('#cmd-language').addEventListener('change', (e) => {
  const val = (e.target as HTMLSelectElement).value;
  if (val) {
    editor.setLanguage(val);
    log('info', `language → ${val}`);
  }
});

// ── Custom button sidebar controls ───────────────────
$('#btn-disable-custom').addEventListener('click', () => {
  document.querySelectorAll<HTMLButtonElement>('.md-toolbar-btn-custom').forEach((btn) => {
    btn.disabled = true;
  });
  log('info', 'all custom buttons disabled');
});

$('#btn-enable-custom').addEventListener('click', () => {
  document.querySelectorAll<HTMLButtonElement>('.md-toolbar-btn-custom').forEach((btn) => {
    btn.disabled = false;
  });
  log('info', 'all custom buttons enabled');
});
