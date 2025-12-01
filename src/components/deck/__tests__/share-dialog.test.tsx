import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareDialog } from "@/components/deck";
import type { DeckCard, ShareDialogState } from "@/types/deck";
import type { ItemTier } from "@prisma/client";
import { vi } from "vitest";

const baseCard: DeckCard = {
  cardId: "card-1",
  itemId: "item-1",
  headline: "Sample headline",
  summary: "Summary body",
  bullets: [],
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
  channels: ["newswire"],
};

const partnerOptions = [
  { code: "p1", name: "Partner One", description: "Desc", regions: ["EU"], languages: ["en"] },
  { code: "p2", name: "Partner Two", description: "Desc", regions: ["NA"], languages: ["en"] },
];

const shareStateBase: ShareDialogState = {
  title: "A great headline",
  summary: "Summary",
  url: "https://example.com",
  noveltyAngle: "Angle",
  partners: [],
  contextSummary: "",
  studyPromptsText: "",
  channels: [],
  originalLanguage: "en",
  translationProvider: "google-translate",
  metadata: null,
  status: "idle",
  message: null,
};

describe("ShareDialog", () => {
  it("submits when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const setShareState = vi.fn();
    const togglePartner = vi.fn();

    render(
      <ShareDialog
        open
        onOpenChange={() => undefined}
        card={baseCard}
        shareState={shareStateBase}
        setShareState={setShareState}
        partnerOptions={partnerOptions}
        onSubmit={onSubmit}
        togglePartner={togglePartner}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Send to partner mesh/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("calls togglePartner when partner checkbox is clicked", async () => {
    const user = userEvent.setup();
    const togglePartner = vi.fn();

    render(
      <ShareDialog
        open
        onOpenChange={() => undefined}
        card={baseCard}
        shareState={{ ...shareStateBase, partners: [] }}
        setShareState={vi.fn()}
        partnerOptions={partnerOptions}
        onSubmit={vi.fn()}
        togglePartner={togglePartner}
      />,
    );

    await user.click(screen.getByLabelText(/Partner One/i));
    expect(togglePartner).toHaveBeenCalledWith("p1");
  });

  it("accepts keyboard enter on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ShareDialog
        open
        onOpenChange={() => undefined}
        card={baseCard}
        shareState={shareStateBase}
        setShareState={vi.fn()}
        partnerOptions={partnerOptions}
        onSubmit={onSubmit}
        togglePartner={vi.fn()}
      />,
    );

    const submit = screen.getByRole("button", { name: /Send to partner mesh/i });
    await user.keyboard("{Enter}");
    await user.click(submit);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows fallback message when no card is present", () => {
    render(
      <ShareDialog
        open
        onOpenChange={() => undefined}
        card={null}
        shareState={shareStateBase}
        setShareState={vi.fn()}
        partnerOptions={partnerOptions}
        onSubmit={vi.fn()}
        togglePartner={vi.fn()}
      />,
    );

    expect(screen.getByText(/Load a card from the deck/i)).toBeInTheDocument();
  });
});
