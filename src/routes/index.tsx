import { createFileRoute } from "@tanstack/react-router";
import { TileCollector } from "@/components/tile-collector";
import { getBoard } from "@/lib/board-api";

function BoardPending() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-3 py-5 sm:px-6 sm:py-10">
      <section className="board-panel rounded-3xl p-6">
        <h1 className="font-display text-2xl font-semibold">Mr. D's Links</h1>
        <p className="mt-2 text-sm text-muted">Loading your board…</p>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/")({
  loader: () => getBoard(),
  pendingComponent: BoardPending,
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  return <TileCollector initial={initial} />;
}
