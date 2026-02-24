import type { UIMessageStreamWriter } from "ai";
import type { Session } from "@/lib/auth";
import type { ChatMessage } from "@/lib/types";
import { createAnalyseCommerceTool } from "./analyse-commerce";
import { createBrowseSiteTool } from "./browse-site";
import { createExtractProductTool } from "./extract-product";

type CommerceToolsProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export function createCommerceTools({
  session,
  dataStream,
}: CommerceToolsProps) {
  return {
    browse_site: createBrowseSiteTool({ session, dataStream }),
    extract_product: createExtractProductTool({ session, dataStream }),
    analyse_commerce: createAnalyseCommerceTool({ session, dataStream }),
  };
}
