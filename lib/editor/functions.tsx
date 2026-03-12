"use client";

import {
  defaultMarkdownSerializer,
  MarkdownSerializer,
} from "prosemirror-markdown";
import { DOMParser, type Node } from "prosemirror-model";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";
import { renderToString } from "react-dom/server";

import { Response } from "@/components/elements/response";

import { documentSchema } from "./config";
import { createSuggestionWidget, type UISuggestion } from "./suggestions";

const markdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    table(state, node) {
      let isFirstRow = true;
      for (let r = 0; r < node.childCount; r++) {
        const row = node.child(r);
        const cells: string[] = [];
        for (let c = 0; c < row.childCount; c++) {
          cells.push(row.child(c).textContent.replace(/\|/g, "\\|").trim());
        }
        state.write(`| ${cells.join(" | ")} |`);
        state.ensureNewLine();

        if (isFirstRow) {
          state.write(`| ${cells.map(() => "---").join(" | ")} |`);
          state.ensureNewLine();
          isFirstRow = false;
        }
      }
      state.closeBlock(node);
    },
    // Handled by the table serialiser above
    table_row() {
      /* no-op: serialised by table() */
    },
    table_header() {
      /* no-op: serialised by table() */
    },
    table_cell() {
      /* no-op: serialised by table() */
    },
  },
  defaultMarkdownSerializer.marks
);

export const buildDocumentFromContent = (content: string) => {
  const parser = DOMParser.fromSchema(documentSchema);
  const stringFromMarkdown = renderToString(
    <Response mode="static">{content}</Response>
  );
  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = stringFromMarkdown;
  return parser.parse(tempContainer);
};

export const buildContentFromDocument = (document: Node) => {
  return markdownSerializer.serialize(document);
};

export const createDecorations = (
  suggestions: UISuggestion[],
  view: EditorView
) => {
  const decorations: Decoration[] = [];

  for (const suggestion of suggestions) {
    decorations.push(
      Decoration.inline(
        suggestion.selectionStart,
        suggestion.selectionEnd,
        {
          class: "suggestion-highlight",
        },
        {
          suggestionId: suggestion.id,
          type: "highlight",
        }
      )
    );

    decorations.push(
      Decoration.widget(
        suggestion.selectionStart,
        (currentView) => {
          const { dom } = createSuggestionWidget(suggestion, currentView);
          return dom;
        },
        {
          suggestionId: suggestion.id,
          type: "widget",
        }
      )
    );
  }

  return DecorationSet.create(view.state.doc, decorations);
};
