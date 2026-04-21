import { notFound } from "next/navigation";
import { getDocumentById } from "@/lib/db/queries";
import { verifyPrintToken } from "@/lib/documents/print-token";
import { PrintDocument } from "./print-document";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function PrintPage({ params, searchParams }: Props) {
  const { documentId } = await params;
  const { token } = await searchParams;

  if (!verifyPrintToken(documentId, token)) {
    notFound();
  }

  const doc = await getDocumentById({ id: documentId });
  if (!doc?.content) {
    notFound();
  }

  return <PrintDocument content={doc.content} kind={doc.kind} />;
}
