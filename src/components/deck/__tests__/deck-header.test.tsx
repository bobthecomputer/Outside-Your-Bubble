import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeckHeader } from "@/components/deck";

describe("DeckHeader", () => {
  it("invokes mode select and toggles", async () => {
    const user = userEvent.setup();
    const onSelectMode = vi.fn();
    const onToggleContrast = vi.fn();
    const onToggleAchievements = vi.fn();
    const onRefreshDeck = vi.fn();

    render(
      <DeckHeader
        achievementsEnabled
        deckMode="discover"
        highContrast={false}
        instructionsId="instructions"
        onRandomSubject={() => undefined}
        onRefreshDeck={onRefreshDeck}
        onSelectMode={onSelectMode}
        onToggleAchievements={onToggleAchievements}
        onToggleContrast={onToggleContrast}
        randomError={null}
        randomLoading={false}
        randomSubject={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Study/i }));
    await user.click(screen.getByRole("button", { name: /High contrast/i }));
    await user.click(screen.getByRole("button", { name: /Toasts on/i }));
    await user.click(screen.getByRole("button", { name: /Refresh deck/i }));

    expect(onSelectMode).toHaveBeenCalledWith("study");
    expect(onToggleContrast).toHaveBeenCalledTimes(1);
    expect(onToggleAchievements).toHaveBeenCalledTimes(1);
    expect(onRefreshDeck).toHaveBeenCalledTimes(1);
  });

  it("shows random subject info", () => {
    render(
      <DeckHeader
        achievementsEnabled
        deckMode="random"
        highContrast={false}
        instructionsId="instructions"
        onRandomSubject={() => undefined}
        onRefreshDeck={() => undefined}
        onSelectMode={() => undefined}
        onToggleAchievements={() => undefined}
        onToggleContrast={() => undefined}
        randomError={null}
        randomLoading={false}
        randomSubject={{ slug: "s1", label: "Subject", group: "world", tags: ["a", "b"], professional: false, parents: [] }}
      />,
    );

    expect(screen.getByText(/Subject/)).toBeInTheDocument();
  });
});
