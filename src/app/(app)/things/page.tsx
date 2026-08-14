import { ThingsIndex } from "@/components/things-index";
import { parseThingFilter } from "@/lib/domain";

export default async function ThingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string) =>
    typeof params[key] === "string" ? params[key] : undefined;

  return (
    <ThingsIndex
      initialFilter={parseThingFilter(single("filter"))}
      initialQuery={single("q") ?? ""}
      initialCategory={single("category") ?? "All"}
      initialSort={single("sort") ?? "recent"}
    />
  );
}
