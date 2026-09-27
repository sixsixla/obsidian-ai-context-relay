# AI Context Relay

An Obsidian desktop plugin that turns the current note selection into a precise handoff for local AI agents.

## Why

When an AI agent needs to continue work from an Obsidian note, pasting only a relative path loses the important context. AI Context Relay copies the file location together with the selected text and the strongest location hints Obsidian can provide.

## Features

- Works from both Editing view and Reading view.
- Copies the absolute local file path.
- Includes the nearest heading when it can be resolved.
- Includes source line ranges in Editing view.
- Includes the selected rendered text in Reading view.
- Adds a 6000-character limit and marks truncated selections.
- Provides a path-only command for quick file handoffs.
- Keeps the output plain text so it can be pasted into any agent, terminal, issue, or chat.

## Output

Editing view:

```text
File: C:\Notes\Project\design.md
Mode: editing
Heading: Runtime loading
Lines: 42-58
Selection:
The selected source text...
```

Reading view:

```text
File: C:\Notes\Project\design.md
Mode: reading
Heading: Runtime loading
Selection:
The selected rendered text...
```

Reading view does not invent source line numbers. Rendered Markdown does not expose a stable mapping to source lines, so the plugin uses the absolute path, nearest heading, and selected text as the location anchors.

## Usage

1. Select the note content you want to hand off.
2. Right-click and choose **Copy AI handoff**.
3. Paste the result into your AI agent.

The command palette provides **Copy AI handoff** and **Copy AI handoff path** as alternatives.

## Installation

### Community plugins

Search for **AI Context Relay** in Obsidian's Community plugins browser.

### Manual installation

Copy `main.js` and `manifest.json` into:

```text
<vault>/.obsidian/plugins/ai-context-relay/
```

Then enable **AI Context Relay** in Settings -> Community plugins.

## Development

```bash
npm install
npm run check
npm run build
```

The build writes the release files to `main.js` and keeps the Obsidian API external.

## Privacy

The plugin has no network code and sends nothing anywhere. It reads the active note and writes the generated handoff to the local clipboard.

## License

MIT. See [LICENSE](LICENSE).
