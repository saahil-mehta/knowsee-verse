import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDocumentById } from "@/lib/db/queries";
import { verifyPrintToken } from "@/lib/documents/print-token";
import { PrintDocument } from "./print-document";

type Props = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default function PrintPage(props: Props) {
  // Next.js 16 cacheComponents requires async data access (params,
  // searchParams, DB reads) to sit inside a Suspense boundary so the
  // shell can stream while dynamic sections resolve.
  return (
    <Suspense fallback={null}>
      <PrintContent {...props} />
    </Suspense>
  );
}

async function PrintContent({ params, searchParams }: Props) {
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
