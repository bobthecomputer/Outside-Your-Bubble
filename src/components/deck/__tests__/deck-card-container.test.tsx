import { render, screen } from "@testing-library/react";
import type { DeckCard } from "@/types/deck";
import { DeckCardContainer } from "@/components/deck";
import { vi } from "vitest";
import type { ItemTier } from "@prisma/client";

vi.mock("@/components/deck", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/deck")>();
  return {
    ...actual,
    DeckCardPanel: () => <div data-testid="deck-card-panel" />,
  };
});

const baseCard: DeckCard = {
  cardId: "card-1",
  itemId: "item-1",
  headline: "Sample headline",
  summary: "Summary body",
  bullets: ["Point A"],
  reason: "Because",
  tier: "BRONZE" as ItemTier,
  rank: 1,
  topic: { id: "t1", slug: "slug", label: "Topic" },
  topicDetails: {
    slug: "slug",
    label: "Topic",
    group: "world",
    tags: [],
    professional: false,
    defaultMode: "quen-3.4b",
  },
  publishedAt: "2025-01-01T00:00:00Z",
  source: { url: "https://example.com", title: "Example", countryCode: null, language: "en" },
  citations: [],
  contextBullets: [],
  studyPrompts: [],
  channels: [],
};

const noop = () => undefined;

describe("DeckCardContainer", () => {
  it("renders loading state", () => {
    render(
      <DeckCardContainer
        loading
        error={null}
        card={null}
        contextChips={[]}
        deckMode="discover"
        expanded={false}
        onToggleExpand={noop}
        cardAnimation={{ initial: {}, animate: {}, exit: {}, transition: {} }}
        prefersReducedMotion={false}
        instructionsId="instructions"
        onOpenEvidence={noop}
        onShareOpen={noop}
        shareEnabled
        focusTargetSeconds={0}
        focusDashOffset={0}
        dwellSeconds={0}
        dwellProgress={0}
        noteFieldId="note"
        noteHintId="note-hint"
        noteValue=""
        onNoteChange={noop}
        studyTopic=""
        setStudyTopic={noop}
        studyModel="model"
        setStudyModel={noop}
        studySuggestion={null}
        studyLoading={false}
        studyError={null}
        onStudySuggestion={noop}
        professionalPersona="strategist"
        setProfessionalPersona={noop}
        professionalModel="model"
        setProfessionalModel={noop}
        professionalBrief={null}
        professionalLoading={false}
        professionalError={null}
        onProfessionalBrief={noop}
      />,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <DeckCardContainer
        loading={false}
        error="Boom"
        card={null}
        contextChips={[]}
        deckMode="discover"
        expanded={false}
        onToggleExpand={noop}
        cardAnimation={{ initial: {}, animate: {}, exit: {}, transition: {} }}
        prefersReducedMotion={false}
        instructionsId="instructions"
        onOpenEvidence={noop}
        onShareOpen={noop}
        shareEnabled
        focusTargetSeconds={0}
        focusDashOffset={0}
        dwellSeconds={0}
        dwellProgress={0}
        noteFieldId="note"
        noteHintId="note-hint"
        noteValue=""
        onNoteChange={noop}
        studyTopic=""
        setStudyTopic={noop}
        studyModel="model"
        setStudyModel={noop}
        studySuggestion={null}
        studyLoading={false}
        studyError={null}
        onStudySuggestion={noop}
        professionalPersona="strategist"
        setProfessionalPersona={noop}
        professionalModel="model"
        setProfessionalModel={noop}
        professionalBrief={null}
        professionalLoading={false}
        professionalError={null}
        onProfessionalBrief={noop}
      />,
    );

    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("renders card content when card is present", () => {
    render(
      <DeckCardContainer
        loading={false}
        error={null}
        card={baseCard}
        contextChips={[]}
        deckMode="discover"
        expanded={false}
        onToggleExpand={noop}
        cardAnimation={{ initial: {}, animate: {}, exit: {}, transition: {} }}
        publishedAtText="Today"
        prefersReducedMotion={false}
        instructionsId="instructions"
        onOpenEvidence={noop}
        onShareOpen={noop}
        shareEnabled
        focusTargetSeconds={0}
        focusDashOffset={0}
        dwellSeconds={0}
        dwellProgress={0}
        noteFieldId="note"
        noteHintId="note-hint"
        noteValue=""
        onNoteChange={noop}
        studyTopic=""
        setStudyTopic={noop}
        studyModel="model"
        setStudyModel={noop}
        studySuggestion={null}
        studyLoading={false}
        studyError={null}
        onStudySuggestion={noop}
        professionalPersona="strategist"
        setProfessionalPersona={noop}
        professionalModel="model"
        setProfessionalModel={noop}
        professionalBrief={null}
        professionalLoading={false}
        professionalError={null}
        onProfessionalBrief={noop}
      />,
    );

    expect(screen.getByText("Sample headline")).toBeInTheDocument();
    expect(screen.getByText("Summary body")).toBeInTheDocument();
  });

  it("renders empty state when no card", () => {
    render(
      <DeckCardContainer
        loading={false}
        error={null}
        card={null}
        contextChips={[]}
        deckMode="discover"
        expanded={false}
        onToggleExpand={noop}
        cardAnimation={{ initial: {}, animate: {}, exit: {}, transition: {} }}
        prefersReducedMotion={false}
        instructionsId="instructions"
        onOpenEvidence={noop}
        onShareOpen={noop}
        shareEnabled
        focusTargetSeconds={0}
        focusDashOffset={0}
        dwellSeconds={0}
        dwellProgress={0}
        noteFieldId="note"
        noteHintId="note-hint"
        noteValue=""
        onNoteChange={noop}
        studyTopic=""
        setStudyTopic={noop}
        studyModel="model"
        setStudyModel={noop}
        studySuggestion={null}
        studyLoading={false}
        studyError={null}
        onStudySuggestion={noop}
        professionalPersona="strategist"
        setProfessionalPersona={noop}
        professionalModel="model"
        setProfessionalModel={noop}
        professionalBrief={null}
        professionalLoading={false}
        professionalError={null}
        onProfessionalBrief={noop}
      />,
    );

    expect(screen.getByText(/You have swiped through everything/i)).toBeInTheDocument();
  });
});
