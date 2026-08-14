import { ThingDetail } from "@/components/thing-detail";

export default async function ThingPage({ params, searchParams }: { params: Promise<{ thingId: string }>; searchParams: Promise<{ returnTo?: string; item?: string }> }) {
  const { thingId } = await params;
  const { returnTo, item } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/things") ? returnTo : "/things";
  return <ThingDetail id={thingId} returnTo={safeReturnTo} initialItem={item} />;
}
