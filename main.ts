import {
  Editor,
  FileSystemAdapter,
  MarkdownView,
  Menu,
  Notice,
  Platform,
  Plugin,
  TFile,
} from "obsidian";

const MAX_EXCERPT_CHARS = 6000;

type CopyMode = "editing" | "reading";

interface ContextData {
  file: TFile;
  mode: CopyMode;
  heading?: string;
  lineRange?: string;
  selection: string;
}

export default class AIContextCopyPlugin extends Plugin {
  private readonly previewContainers = new Set<HTMLElement>();

  async onload(): Promise<void> {
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => {
        if (!info.file || !(info.file instanceof TFile)) {
          return;
        }
        this.addEditorMenu(menu, editor, info.file);
      }),
    );

    this.app.workspace.onLayoutReady(() => {
      this.attachPreviewMenus();
    });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.attachPreviewMenus();
      }),
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.attachPreviewMenus();
      }),
    );

    this.addCommand({
      id: "copy-ai-context",
      name: "Copy AI handoff",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view?.file) {
          return false;
        }
        if (!checking) {
          void this.copyFromActiveView(view);
        }
        return true;
      },
    });

    this.addCommand({
      id: "copy-ai-context-path",
      name: "Copy AI handoff path",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
          return false;
        }
        if (!checking) {
          void this.copyText(`File: ${this.absolutePath(file)}`);
        }
        return true;
      },
    });

    this.attachPreviewMenus();
  }

  private addEditorMenu(menu: Menu, editor: Editor, file: TFile): void {
    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle("Copy AI handoff")
        .setIcon("clipboard-copy")
        .onClick(() => {
          void this.copyText(this.formatContext(this.getEditorContext(editor, file)));
        });
    });
  }

  private attachPreviewMenus(): void {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) {
        continue;
      }

      const container = view.previewMode.containerEl;
      if (!(container instanceof HTMLElement) || this.previewContainers.has(container)) {
        continue;
      }
      this.previewContainers.add(container);

      this.registerDomEvent(
        container,
        "contextmenu",
        (event: MouseEvent) => {
          if (view.getMode() !== "preview") {
            return;
          }

          const selection = window.getSelection();
          if (
            !selection ||
            selection.isCollapsed ||
            selection.rangeCount === 0 ||
            !container.contains(selection.anchorNode)
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          const menu = new Menu();
          menu.addItem((item) => {
            item
              .setTitle("Copy AI handoff")
              .setIcon("clipboard-copy")
              .onClick(() => {
                void this.copyText(this.formatContext(this.getReadingContext(view, container)));
              });
          });
          menu.addItem((item) => {
            item
              .setTitle("Copy AI handoff path")
              .setIcon("file")
              .onClick(() => {
                const file = view.file;
                if (file) {
                  void this.copyText(`File: ${this.absolutePath(file)}`);
                }
              });
          });
          menu.showAtMouseEvent(event);
        },
        true,
      );
    }
  }

  private async copyFromActiveView(view: MarkdownView): Promise<void> {
    const file = view.file;
    if (!file) {
      return;
    }

    if (view.getMode() === "preview") {
      const container = view.previewMode.containerEl;
      await this.copyText(this.formatContext(this.getReadingContext(view, container)));
      return;
    }

    const editor = view.editor;
    await this.copyText(this.formatContext(this.getEditorContext(editor, file)));
  }

  private getEditorContext(editor: Editor, file: TFile): ContextData {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const endLine = to.ch === 0 && to.line > from.line ? to.line - 1 : to.line;
    const heading = this.headingAtLine(file, from.line);

    return {
      file,
      mode: "editing",
      heading,
      lineRange: `${from.line + 1}-${endLine + 1}`,
      selection: editor.getSelection(),
    };
  }

  private getReadingContext(view: MarkdownView, container: HTMLElement): ContextData {
    const file = view.file;
    if (!file) {
      throw new Error("No active note is open.");
    }

    const selection = window.getSelection();
    const selectionText = selection?.toString() ?? "";
    const anchorElement = selection?.anchorNode
      ? this.elementForNode(selection.anchorNode)
      : null;

    return {
      file,
      mode: "reading",
      heading: anchorElement ? this.headingBefore(container, anchorElement) : undefined,
      selection: selectionText,
    };
  }

  private headingAtLine(file: TFile, line: number): string | undefined {
    const headings = this.app.metadataCache.getFileCache(file)?.headings ?? [];
    let result: string | undefined;
    for (const heading of headings) {
      if (heading.position.start.line > line) {
        break;
      }
      result = heading.heading;
    }
    return result;
  }

  private headingBefore(container: HTMLElement, element: HTMLElement): string | undefined {
    const headings = Array.from(container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6"));
    let result: string | undefined;
    for (const heading of headings) {
      if (heading === element) {
        result = heading.textContent?.trim() || result;
        break;
      }
      if (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) {
        break;
      }
      result = heading.textContent?.trim() || result;
    }
    return result;
  }

  private elementForNode(node: Node): HTMLElement | null {
    if (node instanceof HTMLElement) {
      return node;
    }
    return node.parentElement;
  }

  private formatContext(context: ContextData): string {
    const lines = [
      `File: ${this.absolutePath(context.file)}`,
      `Mode: ${context.mode}`,
    ];
    if (context.heading) {
      lines.push(`Heading: ${context.heading}`);
    }
    if (context.lineRange) {
      lines.push(`Lines: ${context.lineRange}`);
    }

    const excerpt = context.selection.trim();
    if (!excerpt) {
      lines.push("Selection: <none>");
    } else if (excerpt.length > MAX_EXCERPT_CHARS) {
      lines.push("Selection:");
      lines.push(`${excerpt.slice(0, MAX_EXCERPT_CHARS)}\n[Selection truncated at 6000 characters]`);
    } else {
      lines.push("Selection:");
      lines.push(excerpt);
    }
    return lines.join("\n");
  }

  private absolutePath(file: TFile): string {
    if (Platform.isDesktop && this.app.vault.adapter instanceof FileSystemAdapter) {
      const base = this.app.vault.adapter.getBasePath().replace(/[\\/]+$/, "");
      const relative = file.path.replace(/\//g, "\\");
      return `${base}\\${relative}`;
    }
    return file.path;
  }

  private async copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      new Notice("AI handoff copied");
    } catch (error) {
      console.error("AI Context Relay: failed to write clipboard", error);
      new Notice("AI handoff copy failed");
    }
  }
}
