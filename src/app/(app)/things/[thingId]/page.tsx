import { ThingDetail } from "@/components/thing-detail";

export default async function ThingPage({ params }: { params: Promise<{ thingId: string }> }) {
  const { thingId } = await params;
  return <ThingDetail id={thingId} />;
}
