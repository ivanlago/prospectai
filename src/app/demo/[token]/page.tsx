import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComposedSitePreview } from "@/components/composed-site-preview";
import { demoPreview } from "@/features/public-demo";
import { getPublicDemo } from "@/features/site-sharing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Demonstração independente", robots: { index: false, follow: false, nocache: true },
};

export default async function PublicDemoPage({ params }: { params: Promise<{ token: string }> }) {
  const snapshot = await getPublicDemo((await params).token);
  if (!snapshot) notFound();
  return <main className="main">
    <h1 className="sr-only">Demonstração independente</h1>
    <ComposedSitePreview content={demoPreview(snapshot)} template={snapshot.template} />
  </main>;
}
