import { useState } from 'react';
import useQueueView from '../useQueueView';
import AppearanceSampleSettings from '../components/AppearanceSampleSettings';
import { COLLECTION_METHOD_SETTING_LABEL, appTerm } from "../terminology.js";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useStore } from "../store";
import {
  assessmentSchedulingEnabled,
  assessmentDueDatesEnabled,
  assessmentContactLinkingEnabled,
  assessmentSmsEnabled,
  assessmentModalityEnabled,
  assessmentBundleGroupingEnabled,
  assessmentBundleAccordionsEnabled,
} from "../assessmentFeatures";
import { PageHeading, Panel, Switch, Tabs } from "../components/UI";
import { mvpAssessmentMode, mvpPathwayEnabled, mvpClinicianCreationEnabled, mvpBundleEditingEnabled } from '../mvpAssessmentPathway';

function ToggleDescription({ on, off }) {
  return <p><strong>On:</strong> {on}<br /><strong>Off:</strong> {off}</p>;
}

export default function AssessmentFeatures({navigate,openModal}) {
  const { state, commit } = useStore();
  const view=useQueueView();
  const [tab,setTab]=useState(() => view.params.get('tab') === 'preferences' ? 'preferences' : 'assessments');
  const tabs=[{value:'assessments',label:'Feature toggles'},{value:'preferences',label:'Appearance & sample data'}];
  const settings = state.settings || {};
  const mvp = mvpAssessmentMode(settings);
  const features = [
    ["groupAssessmentsByBundle", "Group measures into Collection Occasions", "Group measures and create a Collection Occasion from an Assessment Pack or selected measures.", "List measures separately.", assessmentBundleGroupingEnabled(settings)],
    ["bundleAccordions", "Assessment accordions", "Expand details in the table when measures are grouped into Collection Occasions.", "Open those details in a dialog.", assessmentBundleAccordionsEnabled(settings)],
    ["showAssessmentDueDates", "Assessment due dates", "Show due dates, due labels, and one upcoming measure per type while a response is in progress.", "Hide this display; scheduled due dates remain visible when scheduling is on.", assessmentDueDatesEnabled(settings)],
    ["scheduleAssessments", "Schedule assessments", "Allow future assessment due dates and planned contacts.", "Start assessments immediately, hide planned contacts, and record contacts without planning them.", assessmentSchedulingEnabled(settings)],
    ["linkAssessmentAppointments", "Link service contacts and assessments", "Choose and view links between service contacts and assessments.", "Hide those links and linking controls.", assessmentContactLinkingEnabled(settings)],
    ["assessmentModality", COLLECTION_METHOD_SETTING_LABEL, "Choose Clinician entry, Clinic tablet, or SMS link; SMS also requires SMS link collection.", "Open collection on the tablet path.", assessmentModalityEnabled(settings)],
  ];

  return (
    <>
      <PageHeading title="Settings" subtitle="Manage assessment features, appearance, and sample data." />
      <Tabs id="settings" label="Settings sections" items={tabs} value={tab} onChange={value=>{setTab(value);view.set('tab',value,'assessments');}} />
      <div role="tabpanel" id="settings-panel" aria-labelledby={`settings-tab-${tab === 'preferences' ? 1 : 0}`}>
      {tab === 'preferences' ? <AppearanceSampleSettings navigate={navigate} openModal={openModal} /> : <>
      {!mvp && <Panel title="Assessment Pack" className="admin-panel">
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div>
            <h3>Simple assessments</h3>
            <ToggleDescription on="Use the compact assessment list and response view." off="Use the standard Assessment Pack view." />
          </div>
          <Switch label="Simple assessments" checked={!!settings.simpleAssessments}
            onChange={(event) => commit({ type: "SET_SIMPLE_ASSESSMENTS", enabled: event.target.checked })} />
        </div>
        {features.map(([feature, title, on, off, enabled]) => (
          <div className="admin-row" key={feature}>
            <span className="admin-icon"><SlidersHorizontal size={24} /></span>
            <div><h3>{title}</h3><ToggleDescription on={on} off={off} /></div>
            <Switch label={title} checked={enabled}
              onChange={(event) => commit({ type: "SET_ASSESSMENT_FEATURE", feature, enabled: event.target.checked })} />
          </div>
        ))}
      </Panel>}
      {mvp && mvpPathwayEnabled(settings) && settings.packBasedRecordOutcomes !== true && <Panel title="Assessment display and outcomes" className="admin-panel">
        {mvpPathwayEnabled(settings) && settings.packBasedRecordOutcomes !== true && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Record assessment outcome</h3><ToggleDescription on="Show Record outcome for an initial assessment; the chosen outcome determines care episode status." off="Hide this built-in assessment outcome action." /></div>
          <Switch label="Record assessment outcome" checked={settings.mvpRecordAssessmentOutcome !== false}
            onChange={event => commit({type:'SET_MVP_RECORD_ASSESSMENT_OUTCOME',enabled:event.target.checked})} />
        </div>}
        {mvpPathwayEnabled(settings) && settings.packBasedRecordOutcomes !== true && <div className="admin-row admin-row-subsetting">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Link stage changes to Data dictionary values</h3><ToggleDescription on="Staff confirm a stage change when all linked Data dictionary values match." off="Use configured coded Record outcome options for stage changes." /></div>
          <Switch label="Link stage changes to Data dictionary values" checked={settings.dictionaryStageOutcomes === true}
            onChange={event => commit({ type: 'SET_DICTIONARY_STAGE_OUTCOMES', enabled: event.target.checked })} />
        </div>}
      </Panel>}
      <Panel title="Core feature toggles" className="admin-panel">
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div>
            <h3>General report</h3>
            <ToggleDescription on="Show General report in the sidebar, with illustrative REMIT year and comparison views." off="Hide the General report sidebar link." />
          </div>
          <Switch label="Show General report in sidebar" checked={settings.showGeneralReport !== false}
            onChange={(event) => commit({ type: 'SET_GENERAL_REPORT_VISIBILITY', enabled: event.target.checked })} />
        </div>
        {mvp && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Tags on person records</h3><ToggleDescription on="Show tags and Add tag beside each person's name." off="Hide tags and the Add tag action." /></div>
          <Switch label="Tags on person records" checked={settings.mvpShowPersonTags === true}
            onChange={event => commit({ type: 'SET_MVP_SHOW_PERSON_TAGS', enabled: event.target.checked })} />
        </div>}
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>SMS link collection</h3><ToggleDescription on="Let staff collect measure responses by SMS link." off="Hide SMS link as a choice; existing SMS measures wait until it is on again." /></div>
          <Switch label="SMS link collection" checked={assessmentSmsEnabled(settings)}
            onChange={(event) => commit({ type: 'SET_ASSESSMENT_FEATURE', feature: 'assessmentSms', enabled: event.target.checked })} />
        </div>
        {mvp && <>
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Show measure activity in Contacts</h3><ToggleDescription on={<>Show {appTerm("measures", "singular").toLowerCase()} activity alongside contacts; Add event opens the contact form.</>} off="Show the standard contact and event timeline." /></div>
          <Switch label="Show measure activity in Contacts" checked={!!settings.phase2CareActivity}
            onChange={(event) => commit({ type: "SET_PHASE2_CARE_ACTIVITY", enabled: event.target.checked })} />
        </div>
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Separate measures and contacts</h3><ToggleDescription on="Hide measure-to-contact links and save responses without contact details." off="Allow measures and contacts to be linked." /></div>
          <Switch label="Separate measures and contacts" checked={!!settings.mvpSeparateMeasuresContacts}
            onChange={(event) => commit({ type: "SET_MVP_SEPARATE_MEASURES_CONTACTS", enabled: event.target.checked })} />
        </div>
        {settings.phase2CareActivity && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Care point actions</h3><ToggleDescription on="Use secondary styling for Collect response and Show response in the Assessment Pack table." off="Make Collect response primary; Show response is primary unless an outcome is pending." /></div>
          <Switch label="Care point actions" checked={(settings.mvpCarePointActions ?? settings.mvpCarePointHeading) === true}
            onChange={event => commit({ type: 'SET_MVP_CARE_POINT_ACTIONS', enabled: event.target.checked })} />
        </div>}
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Record outcome from Assessment Packs</h3><ToggleDescription on="Packs with Record outcome enabled make the action available." off="Assessment and stage-change outcome rules control when it appears." /></div>
          <Switch label="Record outcome from Assessment Packs" checked={settings.packBasedRecordOutcomes === true}
            onChange={event => commit({ type: 'SET_PACK_BASED_RECORD_OUTCOMES', enabled: event.target.checked })} />
        </div>
        </>}
      </Panel>
      <details className="admin-panel settings-accordion">
        <summary><span>Other features</span><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div>
            <h3>Stage 2 assessment flexibility</h3>
            <ToggleDescription on="Use flexible assessment settings." off="Use MVP assessment settings, including separate controls for the initial assessment and 90-day review pathway." />
          </div>
          <Switch label="Stage 2 assessment flexibility" checked={!mvp}
            onChange={(event) => commit({ type: 'SET_ADVANCED_ASSESSMENT_OPTIONS', enabled: event.target.checked })} />
        </div>
        {mvp && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Record outcome in tab heading</h3><ToggleDescription on="Show Record outcome in the Assessment Pack heading." off="Show Record outcome below the table. The available outcomes stay the same." /></div>
          <Switch label="Record outcome in tab heading" checked={settings.mvpOutcomeBelowTable === false}
            onChange={event => commit({ type: 'SET_MVP_OUTCOME_BELOW_TABLE', enabled: !event.target.checked })} />
        </div>}
        {mvp && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div>
            <h3>Create initial and 90-day assessments</h3>
            <ToggleDescription on="Prepare initial assessments and scheduled 90-day reviews, with reminders in Notifications. Psychosis reviews use codebook fields; other streams use staff-completed reviews until approved measures are available." off="Stop preparing new pathway assessments; existing assessments and responses remain available." />
          </div>
          <Switch label="Create initial and 90-day assessments" checked={mvpPathwayEnabled(settings)}
            onChange={event => commit({type:'SET_MVP_ASSESSMENT_PATHWAY',enabled:event.target.checked})} />
        </div>}
        {mvp && settings.phase2CareActivity && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>MVP schedule presets</h3><ToggleDescription on="Choose care point presets for profiles, assessments, reviews, discharge, and referral or status events; only 90-day reviews repeat." off="Configure detailed schedules." /></div>
          <Switch label="MVP schedule presets" checked={settings.mvpSchedulePresets !== false}
            onChange={event => commit({ type: 'SET_MVP_SCHEDULE_PRESETS', enabled: event.target.checked })} />
        </div>}
        {mvp && settings.phase2CareActivity && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Care point heading</h3><ToggleDescription on="Use the selected care point name, such as Initial assessment, as the person Assessment tab heading." off="Use Assessment Pack as the heading." /></div>
          <Switch label="Care point heading" checked={settings.mvpCarePointHeading === true}
            onChange={event => commit({ type: 'SET_MVP_CARE_POINT_HEADING', enabled: event.target.checked })} />
        </div>}
      </details>
      {mvp && <details className="admin-panel settings-accordion">
        <summary><span>Collection and person record options</span><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Clinician-created Collection Occasions</h3><ToggleDescription on="Show New Collection Occasion and user-created collections in the Assessment Pack tab." off="Hide the creation action and user-created collections." /></div>
          <Switch label="Clinician-created assessments" checked={mvpClinicianCreationEnabled(settings)}
            onChange={event => commit({type:'SET_MVP_CLINICIAN_CREATION',enabled:event.target.checked})} />
        </div>
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Edit system-generated bundles</h3><ToggleDescription on="Let staff add or remove untouched measures in one person's system-generated Collection Occasion; included measures remain mandatory." off="Keep the occasion's measures fixed." /></div>
          <Switch label="Edit system-generated bundles" checked={mvpBundleEditingEnabled(settings)}
            onChange={event => commit({type:'SET_MVP_BUNDLE_EDITING',enabled:event.target.checked})} />
        </div>
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>Profile tab</h3><ToggleDescription on="Show Profile as a person record tab." off="Show More info in the person header, with a profile summary and Edit action." /></div>
          <Switch label="Show Profile tab" checked={settings.mvpProfileTab !== false}
            onChange={event => commit({ type: 'SET_MVP_PROFILE_TAB', enabled: event.target.checked })} />
        </div>
        {mvpPathwayEnabled(settings) && <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div><h3>New-profile Assessment Pack view</h3><ToggleDescription on="Show the Collect response workspace for new MVP profiles." off="Show the Assessment Pack table." /></div>
          <Switch label="Collect response view for new profiles" checked={settings.mvpNewProfileCollectWorkspace !== false}
            onChange={event => commit({ type: 'SET_MVP_NEW_PROFILE_COLLECT_WORKSPACE', enabled: event.target.checked })} />
        </div>}
        <div className="admin-row">
          <span className="admin-icon"><SlidersHorizontal size={24} /></span>
          <div>
            <h3>Highlight scheduled 90-day review</h3>
            <ToggleDescription on="Show a separate Scheduled review summary above the assessment list." off="Show scheduled reviews in the Assessment Pack table without that summary." />
          </div>
          <Switch label="Highlight scheduled 90-day review" checked={settings.mvpReviewHighlight !== false}
            onChange={(event) => commit({ type: 'SET_MVP_REVIEW_HIGHLIGHT', enabled: event.target.checked })} />
        </div>
      </details>}
      </>}
      </div>
    </>
  );
}
