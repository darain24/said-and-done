import { useEffect } from "react";
import { Header, UnredactedBanner } from "./components/Header";
import { Stats } from "./components/Stats";
import { EmptyState, Timeline } from "./components/Timeline";
import type { Loaded } from "./lib/loadStory";

/** DESIGN §5: bad story data. */
function DamagedPanel() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:px-6">
      <p className="rounded-xl border border-line bg-surface p-5 text-base">This Build Story file is damaged. Re-run said build.</p>
    </main>
  );
}

export default function App({ loaded }: { loaded: Loaded }) {
  const title = loaded.ok ? loaded.story.title : null;
  useEffect(() => {
    if (title) document.title = `${title} · Build Story`;
  }, [title]);

  if (!loaded.ok) return <DamagedPanel />;
  const { story } = loaded;

  return (
    <>
      <Header story={story} />
      {!story.redacted && <UnredactedBanner />}
      <main>
        <Stats stats={story.stats} />
        {story.prompts.length === 0 ? <EmptyState /> : <Timeline story={story} />}
      </main>
    </>
  );
}
