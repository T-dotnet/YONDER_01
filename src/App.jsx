import { lazy, Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { useStore } from "./store";
import Shell from "./components/Shell";
import { accessibleQualityIssues } from "./accessViews";
import { canEnterCollection, TODAY } from "./model";
import { canAccess } from "./accessPolicy";
import { Empty, Button } from "./components/UI";
const Forms = lazy(() => import("./components/Forms"));
const Worklist = lazy(() => import("./features/Worklist"));
const People = lazy(() => import("./features/People"));
const Person = lazy(() => import("./features/Person"));
const OrganisationAccess = lazy(() => import("./features/OrganisationAccess"));
const SampleClientPreview = lazy(() => import("./features/SampleClientPreview"));
const AssessmentReviewRecord = lazy(() => import("./features/AssessmentReviewRecord"));
const Quality = lazy(() => import("./features/Operations").then(module => ({ default: module.Quality })));
const Administration = lazy(() => import("./features/Operations").then(module => ({ default: module.Administration })));
const Help = lazy(() => import("./features/Operations").then(module => ({ default: module.Help })));
const AssessmentFeatures = lazy(() => import("./features/AssessmentFeatures"));
const GeneralReport = lazy(() => import("./features/GeneralReport"));
const GlobalChangeLog = lazy(() => import("./features/GlobalChangeLog"));
const Questionnaire = lazy(() => import("./features/Questionnaire"));
const BundleQuestionnaire = lazy(() => import("./components/BundleQuestionnaire"));
const ConsentRequest = lazy(() => import("./features/ConsentRequest"));
const routeFallback = <div className="boot" role="status">Opening view…</div>;
export default function App() {
  const path = usePathname(),
    router = useRouter(),
    { state, storageError } = useStore();
  const [modal, setModal] = useState(null),
    [toast, setToast] = useState("");
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("yscc-session"));
    } catch {
      return null;
    }
  });
  const navigate = (href, options) => {
    router.push(href, options);
  };
  useEffect(() => {
    setModal(null);
  }, [path]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const startQuestionnaire = (context) => {
    const value = { ...context, id: crypto.randomUUID() };
    setSession(value);
    try {
      sessionStorage.setItem("yscc-session", JSON.stringify(value));
    } catch {}
    navigate("/questionnaire");
  };
  const startConsentRequest = (context) => {
    const value = { ...context, kind: "consent", id: crypto.randomUUID() };
    setSession(value);
    try {
      sessionStorage.setItem("yscc-session", JSON.stringify(value));
    } catch {}
    navigate("/consent");
  };
  const finishSession = () => {
    try {
      sessionStorage.removeItem("yscc-session");
    } catch {}
  };
  const questionnaireParams = path === "/questionnaire"
    ? new URLSearchParams(window.location.search)
    : null;
  const linkedPersonId = questionnaireParams?.get("person");
  const linkedEpisodeId = questionnaireParams?.get("episode");
  const linkedCollectionId = questionnaireParams?.get("collection");
  const linkedCollection = state.people.find((person) => person.id === linkedPersonId)
    ?.episodes.find((episode) => episode.id === linkedEpisodeId)
    ?.collections.find((collection) => collection.id === linkedCollectionId);
  const linkedQuestionnaireSession = linkedCollection ? {
    personId: linkedPersonId,
    episodeId: linkedEpisodeId,
    collectionId: linkedCollectionId,
    channel: linkedCollection.channel,
    respondent: linkedCollection.respondent,
    assistance: linkedCollection.assistance,
    attemptId: linkedCollection.attempts?.at(-1)?.id,
  } : null;
  if (path === "/consent")
    return (
      <Suspense fallback={routeFallback}>
        <ConsentRequest
          session={session?.kind === "consent" ? session : null}
          navigate={navigate}
          onEnd={finishSession}
        />
      </Suspense>
    );
  const activeQuestionnaireSession = linkedCollectionId ? linkedQuestionnaireSession : session;
  const bundlePerson = state.people.find(person => person.id === activeQuestionnaireSession?.personId);
  const bundleEpisode = bundlePerson?.episodes.find(episode => episode.id === activeQuestionnaireSession?.episodeId);
  const bundleCollection = bundleEpisode?.collections.find(collection => collection.id === activeQuestionnaireSession?.collectionId);
  if (path === '/questionnaire' && linkedCollectionId && questionnaireParams?.get('overview') === '1' &&
      !canAccess(state, 'collect_response', { person: bundlePerson, episode: bundleEpisode, collection: bundleCollection }))
    return <Empty title="Collect response unavailable for your role" />;
  if (path === '/questionnaire' && linkedCollectionId && !canAccess(state, 'view_all_packs') &&
      !canEnterCollection(state, bundlePerson, bundleEpisode, bundleCollection))
    return <Empty title="Assessment Pack unavailable" />;
  if (path === "/questionnaire" && (bundleCollection?.bundleId || bundleCollection?.scheduleRuleId || (bundleCollection && new URLSearchParams(window.location.search).get("overview") === "1")))
    return <Suspense fallback={routeFallback}><BundleQuestionnaire key={bundleCollection.id} person={bundlePerson} episode={bundleEpisode}
      collection={bundleCollection} participant initialAttemptId={activeQuestionnaireSession?.attemptId} onClose={() => {
        finishSession();
        navigate(`/people/${encodeURIComponent(bundlePerson.id)}?${new URLSearchParams({tab:'assessment',episode:bundleEpisode.id})}`);
      }} /></Suspense>;
  if (path === "/preview" || path === "/questionnaire")
    return (
      <Suspense fallback={routeFallback}>
        <Questionnaire
          key={path}
          session={path === "/preview" ? null : linkedCollectionId
            ? linkedQuestionnaireSession || { unavailable: true }
            : session || { unavailable: true }}
          navigate={navigate}
          onEnd={finishSession}
        />
      </Suspense>
    );
  const shared = { navigate, openModal: setModal };
  const manager = canAccess(state, 'view_global');
  const personId = path.startsWith('/people/') ? decodeURIComponent(path.split('/')[2]) : null;
  const requestedPerson = personId && state.people.find(person => person.id === personId);
  const qualityCount = accessibleQualityIssues(state, TODAY).filter(
    (issue) => !["Resolved", "Closed"].includes(issue.status),
  ).length;
  const assessmentReviewMatch = path.match(
    /^\/people\/([^/]+)\/assessment-review\/([^/]+)$/,
  );
  const sampleClientMatch = path.match(/^\/(?:administration|people)\/sample\/([^/]+)$/);
  let page =
    path === "/" ? (
      manager ? <Worklist {...shared} /> : <People {...shared} />
    ) : path === "/people" ? (
      <People {...shared} />
    ) : sampleClientMatch ? (
      <SampleClientPreview id={sampleClientMatch[1]} navigate={navigate} />
    ) : assessmentReviewMatch ? (
      <AssessmentReviewRecord
        personId={assessmentReviewMatch[1]}
        collectionId={assessmentReviewMatch[2]}
        navigate={navigate}
        openModal={setModal}
      />
    ) : path.startsWith("/people/") ? (
      canAccess(state, 'view_person', { person: requestedPerson })
        ? <Person key={path} id={personId} {...shared} />
        : <Empty title="Person record unavailable"><Button onClick={() => navigate('/people')}>Back to people</Button></Empty>
    ) : path === "/general-report" ? (
      <GeneralReport />
    ) : path === "/quality" ? (
      <Quality {...shared} />
    ) : path === "/change-log" ? (
      <GlobalChangeLog {...shared} />
    ) : path === "/administration" ? (
      <Administration {...shared} />
    ) : path === "/organisation-access" ? (
      <OrganisationAccess />
    ) : (path === "/assessment-features" || path === "/settings") ? (
      <AssessmentFeatures {...shared} />
    ) : path === "/help" ? (
      <Help {...shared} />
    ) : (
      <Empty title="This view is unavailable">
        <Button onClick={() => navigate("/")}>Go to My work</Button>
      </Empty>
    );
  if (!manager && !['/', '/people', '/help'].includes(path) &&
      !(path === '/quality' && canAccess(state, 'view_quality')) &&
      !(path === '/change-log' && canAccess(state, 'view_change_log')) &&
      !(path.startsWith('/people/') && canAccess(state, 'view_person', { person: requestedPerson })))
    page = <Empty title="This view is unavailable for your role"><Button onClick={() => navigate('/people')}>Go to people</Button></Empty>;
  if (!canAccess(state, 'view_all_packs') && assessmentReviewMatch) {
    const reviewPerson = state.people.find(person => person.id === assessmentReviewMatch[1]);
    const reviewEpisode = reviewPerson?.episodes.find(episode =>
      episode.collections?.some(record => record.id === assessmentReviewMatch[2]));
    const reviewRecord = reviewEpisode?.collections.find(record => record.id === assessmentReviewMatch[2]);
    if (!canAccess(state, 'view_collection', { person: reviewPerson, episode: reviewEpisode, collection: reviewRecord }))
      page = <Empty title="Assessment Pack unavailable"><Button onClick={() => navigate('/people')}>Back to people</Button></Empty>;
  }
  return (
    <>
      <Shell
        path={path}
        {...shared}
        qualityCount={qualityCount}
        storageError={storageError}
      >
        <Suspense fallback={routeFallback}>{page}</Suspense>
      </Shell>
      {modal && <Suspense fallback={routeFallback}>
        <Forms
          key={JSON.stringify(modal)}
          modal={modal}
          openModal={setModal}
          onClose={() =>
            setModal(
              modal.returnToCollection ||
                modal.returnToReview ||
                modal.returnToDetails
                ? {
                    type: modal.returnToCollection
                      ? "collection"
                      : modal.returnToReview
                        ? "review"
                        : "collection-details",
                    reviewDraft: modal.reviewDraft,
                    collectionDraft: modal.collectionDraft,
                    personId: modal.personId,
                    episodeId: modal.episodeId,
                    collectionId: modal.collectionId,
                    collectResponse: modal.collectResponse,
                  }
                : null,
            )
          }
          navigate={navigate}
          startQuestionnaire={startQuestionnaire}
          startConsentRequest={startConsentRequest}
          notify={setToast}
        />
      </Suspense>}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <CheckCircle2 size={20} />
            <span>{toast}</span>
            <button aria-label="Dismiss message" onClick={() => setToast("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
