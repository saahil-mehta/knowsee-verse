import { put } from "@vercel/blob";
import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/auth";
import { slidesToPptx } from "@/lib/documents";
import type { ChatMessage } from "@/lib/types";

type GeneratePptxProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const generatePptx = ({ session: _session }: GeneratePptxProps) =>
  tool({
    description:
      "Generate a professional PowerPoint presentation (.pptx). Use when the user asks for a presentation, slide deck, or pitch deck. Structure content as slides with titles and bullet points. The generated file is uploaded and a download URL is returned.",
    inputSchema: z.object({
      title: z.string().describe("The title of the presentation"),
      slides: z.array(
        z.object({
          title: z.string().describe("Slide title"),
          content: z.array(z.string()).describe("Bullet points for this slide"),
          notes: z
            .string()
            .optional()
            .describe("Optional speaker notes for this slide"),
          layout: z
            .enum(["title", "content", "section"])
            .optional()
            .describe(
              "Slide layout: title (for first/title slides), section (for dividers), content (default for body slides)"
            ),
        })
      ),
    }),
    execute: async ({ title, slides }) => {
      const buffer = await slidesToPptx(slides, { title });
      const filename = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim()}.pptx`;
      const blob = await put(filename, buffer, { access: "public" });

      return {
        url: blob.url,
        filename,
        slideCount: slides.length,
        message: `Presentation "${title}" created with ${slides.length} slides. [Download here](${blob.url})`,
      };
    },
  });
