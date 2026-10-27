/**
 * Index Exports Tests
 */

import {
  HTMLEditor,
  fontNames,
  setTranslate,
  getTranslate,
  resetTranslate,
  setGetFileSrc,
  getGetFileSrc,
  Toolbar,
  FontSize,
  LineHeight,
  TextDirection,
  CharacterMap,
  CHAR_MAP,
  EmojiPicker,
  EMOJI_CATEGORIES,
  SearchReplace,
  ResizableImage,
  computeImageResize,
  isImageResizable,
  MarkedQuote,
  ImageMap,
  StyledTable,
  StyledTableRow,
  StyledTableCell,
  StyledTableHeader,
  StyledTableView,
  TABLE_STYLE_RULES,
  ROW_STYLE_RULES,
  CELL_STYLE_RULES,
  TableCommands,
  TableDialog,
  TableMenu,
  TABLE_ACTIONS,
  TABLE_BUTTON_NAMES,
  TableToolbar,
  ContextMenu,
  DEFAULT_TABLE_TOOLBAR,
} from '../src';
import type {
  ObjectResizeEvent,
  ImageResizeHandle,
  ResizableImageOptions,
  EditorEvents,
  ImageMapArea,
  TableModifiedEvent,
  NewRowEvent,
  NewCellEvent,
  StyledTableOptions,
  TableClipboard,
  TableDialogKind,
  TableAction,
} from '../src';

describe('Package Exports', () => {
  describe('Core Exports', () => {
    it('should export HTMLEditor class', () => {
      expect(HTMLEditor).toBeDefined();
      expect(typeof HTMLEditor).toBe('function');
    });

    it('should export Toolbar class', () => {
      expect(Toolbar).toBeDefined();
      expect(typeof Toolbar).toBe('function');
    });

    it('should export fontNames constant', () => {
      expect(fontNames).toBeDefined();
      expect(typeof fontNames).toBe('string');
    });

    it('should export setTranslate function', () => {
      expect(setTranslate).toBeDefined();
      expect(typeof setTranslate).toBe('function');
    });

    it('should export getTranslate function', () => {
      expect(getTranslate).toBeDefined();
      expect(typeof getTranslate).toBe('function');
    });

    it('should export setGetFileSrc function', () => {
      expect(setGetFileSrc).toBeDefined();
      expect(typeof setGetFileSrc).toBe('function');
    });

    it('should export getGetFileSrc function', () => {
      expect(getGetFileSrc).toBeDefined();
      expect(typeof getGetFileSrc).toBe('function');
    });
  });

  describe('Extension Exports', () => {
    it('should export FontSize extension', () => {
      expect(FontSize).toBeDefined();
      expect(FontSize.name).toBe('fontSize');
    });

    it('should export LineHeight extension', () => {
      expect(LineHeight).toBeDefined();
      expect(LineHeight.name).toBe('lineHeight');
    });

    it('should export TextDirection extension', () => {
      expect(TextDirection).toBeDefined();
      expect(TextDirection.name).toBe('textDirection');
    });

    it('should export the ResizableImage extension and its helpers', () => {
      expect(ResizableImage.name).toBe('image');
      expect(computeImageResize({ handle: 'e', startWidth: 100, startHeight: 50, dx: 10, dy: 0, proportional: true }))
        .toEqual({ width: 110, height: 50 });
      expect(isImageResizable(document.createElement('img'), 'img')).toBe(true);

      const handle: ImageResizeHandle = 'se';
      const event: ObjectResizeEvent = { target: document.createElement('img'), width: 1, height: 1, handle };
      const options: Partial<ResizableImageOptions> = { proportional: false };
      const events: EditorEvents = { objectresizestart: () => {}, objectresized: () => {} };
      expect(event.handle).toBe('se');
      expect(options.proportional).toBe(false);
      expect(Object.keys(events)).toEqual(['objectresizestart', 'objectresized']);
    });

    it('should export the MarkedQuote extension', () => {
      expect(MarkedQuote.name).toBe('blockquote');
      expect(MarkedQuote.configure({ markerClass: 'quoted-original' }).options.markerClass).toBe('quoted-original');
    });

    it('should export the ImageMap extension', () => {
      expect(ImageMap.name).toBe('imageMap');
      const area: ImageMapArea = { shape: 'rect', coords: '0,0,1,1', href: 'https://example.com/' };
      expect(area.shape).toBe('rect');
    });

    it('should export the table extensions, rules and types', () => {
      expect(StyledTable.name).toBe('table');
      expect(StyledTableRow.name).toBe('tableRow');
      expect(StyledTableCell.name).toBe('tableCell');
      expect(StyledTableHeader.name).toBe('tableHeader');
      expect(typeof StyledTableView).toBe('function');
      expect(TableCommands.name).toBe('tableCommands');
      for (const rules of [TABLE_STYLE_RULES, ROW_STYLE_RULES, CELL_STYLE_RULES]) {
        expect(rules.some(([property]) => property === 'background-color')).toBe(true);
      }
      const options: Partial<StyledTableOptions> = { defaultAttributes: { border: '1' } };
      const kind: TableDialogKind = 'cell';
      const clipboard: TableClipboard | null = null;
      expect([options.defaultAttributes, kind, clipboard]).toEqual([{ border: '1' }, 'cell', null]);
    });
  });

  describe('UI Component Exports', () => {
    it('should export the table UI components', () => {
      expect(typeof TableDialog).toBe('function');
      expect(typeof TableMenu).toBe('function');
      expect(typeof TableToolbar).toBe('function');
      expect(typeof ContextMenu).toBe('function');
      const action: TableAction = TABLE_ACTIONS.tableprops;
      expect(action.command).toBe('mceTableProps');
      expect(TABLE_BUTTON_NAMES).toContain('tablecellbackgroundcolor');
      expect(DEFAULT_TABLE_TOOLBAR).toContain('tableprops');
    });

    it('should type the table events', () => {
      const table = document.createElement('table');
      const modified: TableModifiedEvent = { table, structure: true, style: false };
      const row: NewRowEvent = { node: document.createElement('tr') };
      const cell: NewCellEvent = { node: document.createElement('td') };
      const handlers: EditorEvents = { tablemodified: () => {}, newrow: () => {}, newcell: () => {} };
      expect([modified.structure, row.node.tagName, cell.node.tagName, Object.keys(handlers)]).toEqual([
        true,
        'TR',
        'TD',
        ['tablemodified', 'newrow', 'newcell'],
      ]);
    });

    it('should export CharacterMap class', () => {
      expect(CharacterMap).toBeDefined();
      expect(typeof CharacterMap).toBe('function');
    });

    it('should export CHAR_MAP data', () => {
      expect(CHAR_MAP).toBeDefined();
      expect(Array.isArray(CHAR_MAP)).toBe(true);
    });

    it('should export EmojiPicker class', () => {
      expect(EmojiPicker).toBeDefined();
      expect(typeof EmojiPicker).toBe('function');
    });

    it('should export EMOJI_CATEGORIES data', () => {
      expect(EMOJI_CATEGORIES).toBeDefined();
      expect(Array.isArray(EMOJI_CATEGORIES)).toBe(true);
    });

    it('should export SearchReplace class', () => {
      expect(SearchReplace).toBeDefined();
      expect(typeof SearchReplace).toBe('function');
    });
  });

  describe('Editor Instantiation', () => {
    let container: HTMLElement;
    let editor: HTMLEditor;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      editor?.destroy();
      container?.remove();
    });

    it('should create HTMLEditor instance from export', () => {
      editor = new HTMLEditor(container);
      expect(editor).toBeInstanceOf(HTMLEditor);
    });

    it('should be able to use setTranslate with editor', () => {
      const translate = (key: string) => `translated_${key}`;
      setTranslate(translate);
      
      editor = new HTMLEditor(container);
      
      const currentTranslate = getTranslate();
      expect(currentTranslate('test')).toBe('translated_test');
      
      // Reset
      resetTranslate();
    });
  });
});

describe('Type Exports', () => {
  // These tests verify that types can be imported without errors
  // The actual type checking is done by TypeScript compiler
  
  it('should be able to import types without errors', async () => {
    // Dynamic import to test types
    const types = await import('../src/types');
    
    // Verify the module loaded
    expect(types).toBeDefined();
  });
});
