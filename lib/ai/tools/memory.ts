import { anthropic } from "@ai-sdk/anthropic";
import {
  createMemory,
  deleteMemoryByPath,
  getMemoriesByProjectId,
  getMemoryByPath,
  renameMemory,
  updateMemoryContent,
} from "@/lib/db/queries";

// ---------------------------------------------------------------------------
// Path validation — reject traversal attempts and enforce /memories scope.
// ---------------------------------------------------------------------------

function isValidMemoryPath(path: string): boolean {
  if (!path.startsWith("/memories")) {
    return false;
  }
  if (path.includes("../") || path.includes("..\\")) {
    return false;
  }
  if (decodeURIComponent(path) !== path) {
    return false;
  }
  return true;
}

function pathError(path: string): string {
  return `The path ${path} does not exist. Please provide a valid path.`;
}

// ---------------------------------------------------------------------------
// Format helpers — match Anthropic's expected memory tool return strings.
// ---------------------------------------------------------------------------

function formatFileWithLineNumbers(content: string): string {
  const lines = content.split("\n");
  return lines
    .map((line, i) => `${String(i + 1).padStart(6)}\t${line}`)
    .join("\n");
}

function formatSnippet(
  content: string,
  targetLine: number,
  contextLines = 4
): string {
  const lines = content.split("\n");
  const start = Math.max(0, targetLine - contextLines);
  const end = Math.min(lines.length, targetLine + contextLines + 1);
  return lines
    .slice(start, end)
    .map((line, i) => `${String(start + i + 1).padStart(6)}\t${line}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Memory tool factory — returns an Anthropic provider-defined tool backed
// by Postgres via Drizzle queries. Scoped per brand project.
// ---------------------------------------------------------------------------

export function createMemoryTool({ projectId }: { projectId: string }) {
  return anthropic.tools.memory_20250818({
    execute: async (action) => {
      const { command } = action;

      // --- view ---
      if (command === "view") {
        const path = action.path as string;
        if (!isValidMemoryPath(path)) {
          return pathError(path);
        }

        // Directory listing
        if (path === "/memories" || path === "/memories/") {
          const files = await getMemoriesByProjectId({ projectId });
          if (files.length === 0) {
            return `Here're the files and directories up to 2 levels deep in ${path}, excluding hidden items and node_modules:\n(empty directory)`;
          }
          const listing = files
            .map((f) => `${Buffer.byteLength(f.content, "utf-8")}\t${f.path}`)
            .join("\n");
          return `Here're the files and directories up to 2 levels deep in ${path}, excluding hidden items and node_modules:\n${listing}`;
        }

        // File contents
        const file = await getMemoryByPath({ projectId, path });
        if (!file) {
          return pathError(path);
        }

        const viewRange = (action as Record<string, unknown>).view_range as
          | [number, number]
          | undefined;
        if (viewRange) {
          const lines = file.content.split("\n");
          const [start, end] = viewRange;
          const slice = lines.slice(start - 1, end);
          const numbered = slice
            .map((line, i) => `${String(start + i).padStart(6)}\t${line}`)
            .join("\n");
          return `Here's the content of ${path} with line numbers:\n${numbered}`;
        }

        return `Here's the content of ${path} with line numbers:\n${formatFileWithLineNumbers(file.content)}`;
      }

      // --- create ---
      if (command === "create") {
        const path = action.path as string;
        const fileText = (action as Record<string, unknown>)
          .file_text as string;
        if (!isValidMemoryPath(path)) {
          return pathError(path);
        }

        const existing = await getMemoryByPath({ projectId, path });
        if (existing) {
          return `Error: File already exists at: ${path}. Use str_replace to edit it.`;
        }

        await createMemory({ projectId, path, content: fileText });
        return `File created successfully at: ${path}`;
      }

      // --- str_replace ---
      if (command === "str_replace") {
        const path = action.path as string;
        const oldStr = (action as Record<string, unknown>).old_str as string;
        const newStr = (action as Record<string, unknown>).new_str as string;
        if (!isValidMemoryPath(path)) {
          return pathError(path);
        }

        const file = await getMemoryByPath({ projectId, path });
        if (!file) {
          return pathError(path);
        }

        const occurrences = file.content.split(oldStr).length - 1;
        if (occurrences === 0) {
          return `Error: No match found for the provided old_str in ${path}. Ensure the old_str is an exact match of the existing content.`;
        }
        if (occurrences > 1) {
          return `Error: Multiple matches (${occurrences}) found for the provided old_str in ${path}. Please provide a more unique string to replace.`;
        }

        const updated = file.content.replace(oldStr, newStr);
        await updateMemoryContent({ projectId, path, content: updated });

        const replaceLine = updated
          .split("\n")
          .findIndex((l) => l.includes(newStr));
        return `The memory file has been edited.\n${formatSnippet(updated, replaceLine)}`;
      }

      // --- insert ---
      if (command === "insert") {
        const path = action.path as string;
        const insertLine = (action as Record<string, unknown>)
          .insert_line as number;
        const insertText = (action as Record<string, unknown>)
          .insert_text as string;
        if (!isValidMemoryPath(path)) {
          return pathError(path);
        }

        const file = await getMemoryByPath({ projectId, path });
        if (!file) {
          return pathError(path);
        }

        const lines = file.content.split("\n");
        lines.splice(insertLine, 0, insertText);
        const updated = lines.join("\n");
        await updateMemoryContent({ projectId, path, content: updated });
        return `The file ${path} has been edited.`;
      }

      // --- delete ---
      if (command === "delete") {
        const path = action.path as string;
        if (!isValidMemoryPath(path)) {
          return pathError(path);
        }

        const file = await getMemoryByPath({ projectId, path });
        if (!file) {
          return pathError(path);
        }

        await deleteMemoryByPath({ projectId, path });
        return `Successfully deleted ${path}`;
      }

      // --- rename ---
      if (command === "rename") {
        const oldPath = (action as Record<string, unknown>).old_path as string;
        const newPath = (action as Record<string, unknown>).new_path as string;
        if (!isValidMemoryPath(oldPath)) {
          return pathError(oldPath);
        }
        if (!isValidMemoryPath(newPath)) {
          return pathError(newPath);
        }

        const file = await getMemoryByPath({ projectId, path: oldPath });
        if (!file) {
          return pathError(oldPath);
        }

        await renameMemory({ projectId, oldPath, newPath });
        return `Successfully renamed ${oldPath} to ${newPath}`;
      }

      return `Error: Unknown command "${command}"`;
    },
  });
}
