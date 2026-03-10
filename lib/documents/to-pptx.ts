import PptxGenJS from "pptxgenjs";
import { BRAND } from "./brand";

// ---------------------------------------------------------------------------
// Structured slide data → PPTX converter
// ---------------------------------------------------------------------------

export type SlideData = {
  title: string;
  content: string[];
  notes?: string;
  layout?: "title" | "content" | "section";
};

export type PptxOptions = {
  title: string;
  author?: string;
};

export async function slidesToPptx(
  slides: SlideData[],
  options: PptxOptions
): Promise<Buffer> {
  const pptx = new PptxGenJS();

  // Presentation metadata
  pptx.author = options.author ?? "Knowsee";
  pptx.title = options.title;
  pptx.subject = options.title;
  pptx.layout = "LAYOUT_WIDE"; // 16:9

  // Define master slides
  pptx.defineSlideMaster({
    title: "KNOWSEE_TITLE",
    background: { fill: BRAND.purple.replace("#", "") },
    objects: [
      {
        placeholder: {
          options: {
            name: "title",
            type: "title",
            x: 0.8,
            y: 2.0,
            w: 11.5,
            h: 1.5,
            fontSize: 36,
            fontFace: BRAND.headingFont,
            color: "FFFFFF",
            bold: true,
            align: "left",
            valign: "middle",
          },
          text: "",
        },
      },
      {
        placeholder: {
          options: {
            name: "subtitle",
            type: "body",
            x: 0.8,
            y: 3.6,
            w: 11.5,
            h: 0.8,
            fontSize: 18,
            fontFace: BRAND.bodyFont,
            color: "D4D4D4",
            align: "left",
          },
          text: "",
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: "KNOWSEE_CONTENT",
    background: { fill: "FFFFFF" },
    objects: [
      // Purple accent bar at top
      {
        rect: {
          x: 0,
          y: 0,
          w: "100%",
          h: 0.06,
          fill: { color: BRAND.purple.replace("#", "") },
        },
      },
      {
        placeholder: {
          options: {
            name: "title",
            type: "title",
            x: 0.8,
            y: 0.3,
            w: 11.5,
            h: 0.8,
            fontSize: 24,
            fontFace: BRAND.headingFont,
            color: BRAND.purple.replace("#", ""),
            bold: true,
            align: "left",
          },
          text: "",
        },
      },
      {
        placeholder: {
          options: {
            name: "body",
            type: "body",
            x: 0.8,
            y: 1.3,
            w: 11.5,
            h: 5.5,
            fontSize: 16,
            fontFace: BRAND.bodyFont,
            color: BRAND.darkGrey.replace("#", ""),
            align: "left",
            valign: "top",
            bullet: true,
          },
          text: "",
        },
      },
    ],
  });

  pptx.defineSlideMaster({
    title: "KNOWSEE_SECTION",
    background: { fill: BRAND.darkGrey.replace("#", "") },
    objects: [
      {
        placeholder: {
          options: {
            name: "title",
            type: "title",
            x: 0.8,
            y: 2.5,
            w: 11.5,
            h: 1.5,
            fontSize: 32,
            fontFace: BRAND.headingFont,
            color: "FFFFFF",
            bold: true,
            align: "left",
            valign: "middle",
          },
          text: "",
        },
      },
    ],
  });

  // Generate slides
  for (let i = 0; i < slides.length; i++) {
    const slideData = slides[i];
    const layout = slideData.layout ?? (i === 0 ? "title" : "content");

    if (layout === "title") {
      const slide = pptx.addSlide({ masterName: "KNOWSEE_TITLE" });
      slide.addText(slideData.title, {
        placeholder: "title",
      });
      if (slideData.content.length > 0) {
        slide.addText(slideData.content.join("\n"), {
          placeholder: "subtitle",
        });
      }
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    } else if (layout === "section") {
      const slide = pptx.addSlide({ masterName: "KNOWSEE_SECTION" });
      slide.addText(slideData.title, {
        placeholder: "title",
      });
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    } else {
      // content slide
      const slide = pptx.addSlide({ masterName: "KNOWSEE_CONTENT" });
      slide.addText(slideData.title, {
        placeholder: "title",
      });
      if (slideData.content.length > 0) {
        slide.addText(
          slideData.content.map((point) => ({
            text: point,
            options: {
              fontSize: 16,
              fontFace: BRAND.bodyFont,
              color: BRAND.darkGrey.replace("#", ""),
              bullet: true,
              breakLine: true,
            },
          })),
          {
            placeholder: "body",
          }
        );
      }
      if (slideData.notes) {
        slide.addNotes(slideData.notes);
      }
    }
  }

  // Generate buffer
  const output = await pptx.write({ outputType: "nodebuffer" });
  return output as Buffer;
}
