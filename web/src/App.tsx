import { useEffect, useMemo } from "react";
import type { Story } from "../../src/story/model";
import { Header, UnredactedBanner } from "./components/Header";
import { ReplayBar } from "./components/ReplayBar";
import { Stats } from "./components/Stats";
import { EmptyState, Timeline } from "./components/Timeline";
import type { Loaded } from "./lib/loadStory";
import { revealedN, statsAt } from "./lib/replay";
import { commitAnchors } from "./lib/timeline";
import { useReplay } from "./lib/useReplay";

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
  return <StoryPage story={loaded.story} />;
}

function StoryPage({ story }: { story: Story }) {
  const replay = useReplay(story);
  const anchors = useMemo(() => commitAnchors(story), [story]);
  const live = useMemo(() => (replay.active ? statsAt(story, anchors, replay.cursor) : story.stats), [replay.active, replay.cursor, story, anchors]);

  return (
    <>
      <Header story={story} onReplay={replay.start} />
      {!story.redacted && <UnredactedBanner />}
      <main className={replay.active ? "pb-40" : undefined}>
        <Stats stats={story.stats} live={live} />
        {story.prompts.length === 0 ? <EmptyState /> : <Timeline story={story} revealed={replay.active ? revealedN(story, replay.cursor) : undefined} />}
      </main>
      {replay.active && <ReplayBar replay={replay} />}
    </>
  );
}
