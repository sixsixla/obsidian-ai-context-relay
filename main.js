var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AIContextCopyPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var MAX_EXCERPT_CHARS = 6e3;
var AIContextCopyPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.previewContainers = /* @__PURE__ */ new Set();
  }
  async onload() {
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => {
        if (!info.file || !(info.file instanceof import_obsidian.TFile)) {
          return;
        }
        this.addEditorMenu(menu, editor, info.file);
      })
    );
    this.app.workspace.onLayoutReady(() => {
      this.attachPreviewMenus();
    });
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.attachPreviewMenus();
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-open", () => {
        this.attachPreviewMenus();
      })
    );
    this.addCommand({
      id: "copy-ai-context",
      name: "Copy AI handoff",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
        if (!(view == null ? void 0 : view.file)) {
          return false;
        }
        if (!checking) {
          void this.copyFromActiveView(view);
        }
        return true;
      }
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
      }
    });
    this.attachPreviewMenus();
  }
  addEditorMenu(menu, editor, file) {
    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle("Copy AI handoff").setIcon("clipboard-copy").onClick(() => {
        void this.copyText(this.formatContext(this.getEditorContext(editor, file)));
      });
    });
  }
  attachPreviewMenus() {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      const view = leaf.view;
      if (!(view instanceof import_obsidian.MarkdownView)) {
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
        (event) => {
          if (view.getMode() !== "preview") {
            return;
          }
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !container.contains(selection.anchorNode)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const menu = new import_obsidian.Menu();
          menu.addItem((item) => {
            item.setTitle("Copy AI handoff").setIcon("clipboard-copy").onClick(() => {
              void this.copyText(this.formatContext(this.getReadingContext(view, container)));
            });
          });
          menu.addItem((item) => {
            item.setTitle("Copy AI handoff path").setIcon("file").onClick(() => {
              const file = view.file;
              if (file) {
                void this.copyText(`File: ${this.absolutePath(file)}`);
              }
            });
          });
          menu.showAtMouseEvent(event);
        },
        true
      );
    }
  }
  async copyFromActiveView(view) {
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
  getEditorContext(editor, file) {
    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    const endLine = to.ch === 0 && to.line > from.line ? to.line - 1 : to.line;
    const heading = this.headingAtLine(file, from.line);
    return {
      file,
      mode: "editing",
      heading,
      lineRange: `${from.line + 1}-${endLine + 1}`,
      selection: editor.getSelection()
    };
  }
  getReadingContext(view, container) {
    var _a;
    const file = view.file;
    if (!file) {
      throw new Error("No active note is open.");
    }
    const selection = window.getSelection();
    const selectionText = (_a = selection == null ? void 0 : selection.toString()) != null ? _a : "";
    const anchorElement = (selection == null ? void 0 : selection.anchorNode) ? this.elementForNode(selection.anchorNode) : null;
    return {
      file,
      mode: "reading",
      heading: anchorElement ? this.headingBefore(container, anchorElement) : void 0,
      selection: selectionText
    };
  }
  headingAtLine(file, line) {
    var _a, _b;
    const headings = (_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.headings) != null ? _b : [];
    let result;
    for (const heading of headings) {
      if (heading.position.start.line > line) {
        break;
      }
      result = heading.heading;
    }
    return result;
  }
  headingBefore(container, element) {
    var _a, _b;
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    let result;
    for (const heading of headings) {
      if (heading === element) {
        result = ((_a = heading.textContent) == null ? void 0 : _a.trim()) || result;
        break;
      }
      if (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) {
        break;
      }
      result = ((_b = heading.textContent) == null ? void 0 : _b.trim()) || result;
    }
    return result;
  }
  elementForNode(node) {
    if (node instanceof HTMLElement) {
      return node;
    }
    return node.parentElement;
  }
  formatContext(context) {
    const lines = [
      `File: ${this.absolutePath(context.file)}`,
      `Mode: ${context.mode}`
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
      lines.push(`${excerpt.slice(0, MAX_EXCERPT_CHARS)}
[Selection truncated at 6000 characters]`);
    } else {
      lines.push("Selection:");
      lines.push(excerpt);
    }
    return lines.join("\n");
  }
  absolutePath(file) {
    if (import_obsidian.Platform.isDesktop && this.app.vault.adapter instanceof import_obsidian.FileSystemAdapter) {
      const base = this.app.vault.adapter.getBasePath().replace(/[\\/]+$/, "");
      const relative = file.path.replace(/\//g, "\\");
      return `${base}\\${relative}`;
    }
    return file.path;
  }
  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      new import_obsidian.Notice("AI handoff copied");
    } catch (error) {
      console.error("AI Context Relay: failed to write clipboard", error);
      new import_obsidian.Notice("AI handoff copy failed");
    }
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHtcbiAgRWRpdG9yLFxuICBGaWxlU3lzdGVtQWRhcHRlcixcbiAgTWFya2Rvd25WaWV3LFxuICBNZW51LFxuICBOb3RpY2UsXG4gIFBsYXRmb3JtLFxuICBQbHVnaW4sXG4gIFRGaWxlLFxufSBmcm9tIFwib2JzaWRpYW5cIjtcblxuY29uc3QgTUFYX0VYQ0VSUFRfQ0hBUlMgPSA2MDAwO1xuXG50eXBlIENvcHlNb2RlID0gXCJlZGl0aW5nXCIgfCBcInJlYWRpbmdcIjtcblxuaW50ZXJmYWNlIENvbnRleHREYXRhIHtcbiAgZmlsZTogVEZpbGU7XG4gIG1vZGU6IENvcHlNb2RlO1xuICBoZWFkaW5nPzogc3RyaW5nO1xuICBsaW5lUmFuZ2U/OiBzdHJpbmc7XG4gIHNlbGVjdGlvbjogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBSUNvbnRleHRDb3B5UGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgcHJpdmF0ZSByZWFkb25seSBwcmV2aWV3Q29udGFpbmVycyA9IG5ldyBTZXQ8SFRNTEVsZW1lbnQ+KCk7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImVkaXRvci1tZW51XCIsIChtZW51LCBlZGl0b3IsIGluZm8pID0+IHtcbiAgICAgICAgaWYgKCFpbmZvLmZpbGUgfHwgIShpbmZvLmZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hZGRFZGl0b3JNZW51KG1lbnUsIGVkaXRvciwgaW5mby5maWxlKTtcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeSgoKSA9PiB7XG4gICAgICB0aGlzLmF0dGFjaFByZXZpZXdNZW51cygpO1xuICAgIH0pO1xuICAgIHRoaXMucmVnaXN0ZXJFdmVudChcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImxheW91dC1jaGFuZ2VcIiwgKCkgPT4ge1xuICAgICAgICB0aGlzLmF0dGFjaFByZXZpZXdNZW51cygpO1xuICAgICAgfSksXG4gICAgKTtcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub24oXCJmaWxlLW9wZW5cIiwgKCkgPT4ge1xuICAgICAgICB0aGlzLmF0dGFjaFByZXZpZXdNZW51cygpO1xuICAgICAgfSksXG4gICAgKTtcblxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJjb3B5LWFpLWNvbnRleHRcIixcbiAgICAgIG5hbWU6IFwiQ29weSBBSSBoYW5kb2ZmXCIsXG4gICAgICBjaGVja0NhbGxiYWNrOiAoY2hlY2tpbmcpID0+IHtcbiAgICAgICAgY29uc3QgdmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XG4gICAgICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNoZWNraW5nKSB7XG4gICAgICAgICAgdm9pZCB0aGlzLmNvcHlGcm9tQWN0aXZlVmlldyh2aWV3KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiY29weS1haS1jb250ZXh0LXBhdGhcIixcbiAgICAgIG5hbWU6IFwiQ29weSBBSSBoYW5kb2ZmIHBhdGhcIixcbiAgICAgIGNoZWNrQ2FsbGJhY2s6IChjaGVja2luZykgPT4ge1xuICAgICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICAgICAgaWYgKCFmaWxlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY2hlY2tpbmcpIHtcbiAgICAgICAgICB2b2lkIHRoaXMuY29weVRleHQoYEZpbGU6ICR7dGhpcy5hYnNvbHV0ZVBhdGgoZmlsZSl9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hdHRhY2hQcmV2aWV3TWVudXMoKTtcbiAgfVxuXG4gIHByaXZhdGUgYWRkRWRpdG9yTWVudShtZW51OiBNZW51LCBlZGl0b3I6IEVkaXRvciwgZmlsZTogVEZpbGUpOiB2b2lkIHtcbiAgICBtZW51LmFkZFNlcGFyYXRvcigpO1xuICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xuICAgICAgaXRlbVxuICAgICAgICAuc2V0VGl0bGUoXCJDb3B5IEFJIGhhbmRvZmZcIilcbiAgICAgICAgLnNldEljb24oXCJjbGlwYm9hcmQtY29weVwiKVxuICAgICAgICAub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgdm9pZCB0aGlzLmNvcHlUZXh0KHRoaXMuZm9ybWF0Q29udGV4dCh0aGlzLmdldEVkaXRvckNvbnRleHQoZWRpdG9yLCBmaWxlKSkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXR0YWNoUHJldmlld01lbnVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgbGVhZiBvZiB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFwibWFya2Rvd25cIikpIHtcbiAgICAgIGNvbnN0IHZpZXcgPSBsZWFmLnZpZXc7XG4gICAgICBpZiAoISh2aWV3IGluc3RhbmNlb2YgTWFya2Rvd25WaWV3KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY29udGFpbmVyID0gdmlldy5wcmV2aWV3TW9kZS5jb250YWluZXJFbDtcbiAgICAgIGlmICghKGNvbnRhaW5lciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB8fCB0aGlzLnByZXZpZXdDb250YWluZXJzLmhhcyhjb250YWluZXIpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5wcmV2aWV3Q29udGFpbmVycy5hZGQoY29udGFpbmVyKTtcblxuICAgICAgdGhpcy5yZWdpc3RlckRvbUV2ZW50KFxuICAgICAgICBjb250YWluZXIsXG4gICAgICAgIFwiY29udGV4dG1lbnVcIixcbiAgICAgICAgKGV2ZW50OiBNb3VzZUV2ZW50KSA9PiB7XG4gICAgICAgICAgaWYgKHZpZXcuZ2V0TW9kZSgpICE9PSBcInByZXZpZXdcIikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhc2VsZWN0aW9uIHx8XG4gICAgICAgICAgICBzZWxlY3Rpb24uaXNDb2xsYXBzZWQgfHxcbiAgICAgICAgICAgIHNlbGVjdGlvbi5yYW5nZUNvdW50ID09PSAwIHx8XG4gICAgICAgICAgICAhY29udGFpbmVyLmNvbnRhaW5zKHNlbGVjdGlvbi5hbmNob3JOb2RlKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICBjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcbiAgICAgICAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGl0ZW1cbiAgICAgICAgICAgICAgLnNldFRpdGxlKFwiQ29weSBBSSBoYW5kb2ZmXCIpXG4gICAgICAgICAgICAgIC5zZXRJY29uKFwiY2xpcGJvYXJkLWNvcHlcIilcbiAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5jb3B5VGV4dCh0aGlzLmZvcm1hdENvbnRleHQodGhpcy5nZXRSZWFkaW5nQ29udGV4dCh2aWV3LCBjb250YWluZXIpKSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgaXRlbVxuICAgICAgICAgICAgICAuc2V0VGl0bGUoXCJDb3B5IEFJIGhhbmRvZmYgcGF0aFwiKVxuICAgICAgICAgICAgICAuc2V0SWNvbihcImZpbGVcIilcbiAgICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSB2aWV3LmZpbGU7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGUpIHtcbiAgICAgICAgICAgICAgICAgIHZvaWQgdGhpcy5jb3B5VGV4dChgRmlsZTogJHt0aGlzLmFic29sdXRlUGF0aChmaWxlKX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIG1lbnUuc2hvd0F0TW91c2VFdmVudChldmVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIHRydWUsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY29weUZyb21BY3RpdmVWaWV3KHZpZXc6IE1hcmtkb3duVmlldyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGZpbGUgPSB2aWV3LmZpbGU7XG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHZpZXcuZ2V0TW9kZSgpID09PSBcInByZXZpZXdcIikge1xuICAgICAgY29uc3QgY29udGFpbmVyID0gdmlldy5wcmV2aWV3TW9kZS5jb250YWluZXJFbDtcbiAgICAgIGF3YWl0IHRoaXMuY29weVRleHQodGhpcy5mb3JtYXRDb250ZXh0KHRoaXMuZ2V0UmVhZGluZ0NvbnRleHQodmlldywgY29udGFpbmVyKSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGVkaXRvciA9IHZpZXcuZWRpdG9yO1xuICAgIGF3YWl0IHRoaXMuY29weVRleHQodGhpcy5mb3JtYXRDb250ZXh0KHRoaXMuZ2V0RWRpdG9yQ29udGV4dChlZGl0b3IsIGZpbGUpKSk7XG4gIH1cblxuICBwcml2YXRlIGdldEVkaXRvckNvbnRleHQoZWRpdG9yOiBFZGl0b3IsIGZpbGU6IFRGaWxlKTogQ29udGV4dERhdGEge1xuICAgIGNvbnN0IGZyb20gPSBlZGl0b3IuZ2V0Q3Vyc29yKFwiZnJvbVwiKTtcbiAgICBjb25zdCB0byA9IGVkaXRvci5nZXRDdXJzb3IoXCJ0b1wiKTtcbiAgICBjb25zdCBlbmRMaW5lID0gdG8uY2ggPT09IDAgJiYgdG8ubGluZSA+IGZyb20ubGluZSA/IHRvLmxpbmUgLSAxIDogdG8ubGluZTtcbiAgICBjb25zdCBoZWFkaW5nID0gdGhpcy5oZWFkaW5nQXRMaW5lKGZpbGUsIGZyb20ubGluZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmlsZSxcbiAgICAgIG1vZGU6IFwiZWRpdGluZ1wiLFxuICAgICAgaGVhZGluZyxcbiAgICAgIGxpbmVSYW5nZTogYCR7ZnJvbS5saW5lICsgMX0tJHtlbmRMaW5lICsgMX1gLFxuICAgICAgc2VsZWN0aW9uOiBlZGl0b3IuZ2V0U2VsZWN0aW9uKCksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0UmVhZGluZ0NvbnRleHQodmlldzogTWFya2Rvd25WaWV3LCBjb250YWluZXI6IEhUTUxFbGVtZW50KTogQ29udGV4dERhdGEge1xuICAgIGNvbnN0IGZpbGUgPSB2aWV3LmZpbGU7XG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBhY3RpdmUgbm90ZSBpcyBvcGVuLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG4gICAgY29uc3Qgc2VsZWN0aW9uVGV4dCA9IHNlbGVjdGlvbj8udG9TdHJpbmcoKSA/PyBcIlwiO1xuICAgIGNvbnN0IGFuY2hvckVsZW1lbnQgPSBzZWxlY3Rpb24/LmFuY2hvck5vZGVcbiAgICAgID8gdGhpcy5lbGVtZW50Rm9yTm9kZShzZWxlY3Rpb24uYW5jaG9yTm9kZSlcbiAgICAgIDogbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICBmaWxlLFxuICAgICAgbW9kZTogXCJyZWFkaW5nXCIsXG4gICAgICBoZWFkaW5nOiBhbmNob3JFbGVtZW50ID8gdGhpcy5oZWFkaW5nQmVmb3JlKGNvbnRhaW5lciwgYW5jaG9yRWxlbWVudCkgOiB1bmRlZmluZWQsXG4gICAgICBzZWxlY3Rpb246IHNlbGVjdGlvblRleHQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgaGVhZGluZ0F0TGluZShmaWxlOiBURmlsZSwgbGluZTogbnVtYmVyKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBoZWFkaW5ncyA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5oZWFkaW5ncyA/PyBbXTtcbiAgICBsZXQgcmVzdWx0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgZm9yIChjb25zdCBoZWFkaW5nIG9mIGhlYWRpbmdzKSB7XG4gICAgICBpZiAoaGVhZGluZy5wb3NpdGlvbi5zdGFydC5saW5lID4gbGluZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhlYWRpbmcuaGVhZGluZztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHByaXZhdGUgaGVhZGluZ0JlZm9yZShjb250YWluZXI6IEhUTUxFbGVtZW50LCBlbGVtZW50OiBIVE1MRWxlbWVudCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgY29uc3QgaGVhZGluZ3MgPSBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcImgxLCBoMiwgaDMsIGg0LCBoNSwgaDZcIikpO1xuICAgIGxldCByZXN1bHQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBmb3IgKGNvbnN0IGhlYWRpbmcgb2YgaGVhZGluZ3MpIHtcbiAgICAgIGlmIChoZWFkaW5nID09PSBlbGVtZW50KSB7XG4gICAgICAgIHJlc3VsdCA9IGhlYWRpbmcudGV4dENvbnRlbnQ/LnRyaW0oKSB8fCByZXN1bHQ7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGhlYWRpbmcuY29tcGFyZURvY3VtZW50UG9zaXRpb24oZWxlbWVudCkgJiBOb2RlLkRPQ1VNRU5UX1BPU0lUSU9OX1BSRUNFRElORykge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHJlc3VsdCA9IGhlYWRpbmcudGV4dENvbnRlbnQ/LnRyaW0oKSB8fCByZXN1bHQ7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBwcml2YXRlIGVsZW1lbnRGb3JOb2RlKG5vZGU6IE5vZGUpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAgIGlmIChub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZS5wYXJlbnRFbGVtZW50O1xuICB9XG5cbiAgcHJpdmF0ZSBmb3JtYXRDb250ZXh0KGNvbnRleHQ6IENvbnRleHREYXRhKTogc3RyaW5nIHtcbiAgICBjb25zdCBsaW5lcyA9IFtcbiAgICAgIGBGaWxlOiAke3RoaXMuYWJzb2x1dGVQYXRoKGNvbnRleHQuZmlsZSl9YCxcbiAgICAgIGBNb2RlOiAke2NvbnRleHQubW9kZX1gLFxuICAgIF07XG4gICAgaWYgKGNvbnRleHQuaGVhZGluZykge1xuICAgICAgbGluZXMucHVzaChgSGVhZGluZzogJHtjb250ZXh0LmhlYWRpbmd9YCk7XG4gICAgfVxuICAgIGlmIChjb250ZXh0LmxpbmVSYW5nZSkge1xuICAgICAgbGluZXMucHVzaChgTGluZXM6ICR7Y29udGV4dC5saW5lUmFuZ2V9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgZXhjZXJwdCA9IGNvbnRleHQuc2VsZWN0aW9uLnRyaW0oKTtcbiAgICBpZiAoIWV4Y2VycHQpIHtcbiAgICAgIGxpbmVzLnB1c2goXCJTZWxlY3Rpb246IDxub25lPlwiKTtcbiAgICB9IGVsc2UgaWYgKGV4Y2VycHQubGVuZ3RoID4gTUFYX0VYQ0VSUFRfQ0hBUlMpIHtcbiAgICAgIGxpbmVzLnB1c2goXCJTZWxlY3Rpb246XCIpO1xuICAgICAgbGluZXMucHVzaChgJHtleGNlcnB0LnNsaWNlKDAsIE1BWF9FWENFUlBUX0NIQVJTKX1cXG5bU2VsZWN0aW9uIHRydW5jYXRlZCBhdCA2MDAwIGNoYXJhY3RlcnNdYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpbmVzLnB1c2goXCJTZWxlY3Rpb246XCIpO1xuICAgICAgbGluZXMucHVzaChleGNlcnB0KTtcbiAgICB9XG4gICAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBwcml2YXRlIGFic29sdXRlUGF0aChmaWxlOiBURmlsZSk6IHN0cmluZyB7XG4gICAgaWYgKFBsYXRmb3JtLmlzRGVza3RvcCAmJiB0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGluc3RhbmNlb2YgRmlsZVN5c3RlbUFkYXB0ZXIpIHtcbiAgICAgIGNvbnN0IGJhc2UgPSB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmdldEJhc2VQYXRoKCkucmVwbGFjZSgvW1xcXFwvXSskLywgXCJcIik7XG4gICAgICBjb25zdCByZWxhdGl2ZSA9IGZpbGUucGF0aC5yZXBsYWNlKC9cXC8vZywgXCJcXFxcXCIpO1xuICAgICAgcmV0dXJuIGAke2Jhc2V9XFxcXCR7cmVsYXRpdmV9YDtcbiAgICB9XG4gICAgcmV0dXJuIGZpbGUucGF0aDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY29weVRleHQodGV4dDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRleHQpO1xuICAgICAgbmV3IE5vdGljZShcIkFJIGhhbmRvZmYgY29waWVkXCIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiQUkgQ29udGV4dCBSZWxheTogZmFpbGVkIHRvIHdyaXRlIGNsaXBib2FyZFwiLCBlcnJvcik7XG4gICAgICBuZXcgTm90aWNlKFwiQUkgaGFuZG9mZiBjb3B5IGZhaWxlZFwiKTtcbiAgICB9XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0JBU087QUFFUCxJQUFNLG9CQUFvQjtBQVkxQixJQUFxQixzQkFBckIsY0FBaUQsdUJBQU87QUFBQSxFQUF4RDtBQUFBO0FBQ0UsU0FBaUIsb0JBQW9CLG9CQUFJLElBQWlCO0FBQUE7QUFBQSxFQUUxRCxNQUFNLFNBQXdCO0FBQzVCLFNBQUs7QUFBQSxNQUNILEtBQUssSUFBSSxVQUFVLEdBQUcsZUFBZSxDQUFDLE1BQU0sUUFBUSxTQUFTO0FBQzNELFlBQUksQ0FBQyxLQUFLLFFBQVEsRUFBRSxLQUFLLGdCQUFnQix3QkFBUTtBQUMvQztBQUFBLFFBQ0Y7QUFDQSxhQUFLLGNBQWMsTUFBTSxRQUFRLEtBQUssSUFBSTtBQUFBLE1BQzVDLENBQUM7QUFBQSxJQUNIO0FBRUEsU0FBSyxJQUFJLFVBQVUsY0FBYyxNQUFNO0FBQ3JDLFdBQUssbUJBQW1CO0FBQUEsSUFDMUIsQ0FBQztBQUNELFNBQUs7QUFBQSxNQUNILEtBQUssSUFBSSxVQUFVLEdBQUcsaUJBQWlCLE1BQU07QUFDM0MsYUFBSyxtQkFBbUI7QUFBQSxNQUMxQixDQUFDO0FBQUEsSUFDSDtBQUNBLFNBQUs7QUFBQSxNQUNILEtBQUssSUFBSSxVQUFVLEdBQUcsYUFBYSxNQUFNO0FBQ3ZDLGFBQUssbUJBQW1CO0FBQUEsTUFDMUIsQ0FBQztBQUFBLElBQ0g7QUFFQSxTQUFLLFdBQVc7QUFBQSxN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
