import { assessmentHistoryEntryVisible } from "../assessmentFeatures.js";
import { useMemo } from "react";
import { accessibleChangeLogEntries } from "../accessViews";
import { canAccess } from "../accessPolicy";
import { ChangeLog } from "../components/ActivityTimeline";
import { PageHeading, Panel } from "../components/UI";
import { useStore } from "../store";

export default function GlobalChangeLog({ navigate }) {
  const { state } = useStore();
  const entries = useMemo(() => accessibleChangeLogEntries(state).filter(entry => assessmentHistoryEntryVisible(entry, state.settings,
    state.people.flatMap(person => person.episodes.flatMap(episode => episode.appointments || [])))), [state]);

  return (
    <>
      <PageHeading
        title="Change log"
        subtitle="Field-level changes in the people and care periods you can access. Open a change to see its before and after values."
      />
      <Panel
        className="global-change-log-panel"
        title={canAccess(state, 'view_global') ? "Changes at Northside Centre" : "Changes for your assigned young people"}
        action={<span className="muted">{entries.length} changes</span>}
      >
        <ChangeLog entries={entries} navigate={navigate} />
      </Panel>
    </>
  );
}
