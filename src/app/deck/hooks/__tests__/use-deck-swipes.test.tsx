import { fireEvent, render } from "@testing-library/react";
import { useEffect } from "react";
import { vi } from "vitest";

import { useDeckSwipes } from "@/app/deck/hooks/use-deck-swipes";

function SwipesHarness({ onAction }: { onAction: (action: string) => void }) {
  const { handlePointerDown, handlePointerUp } = useDeckSwipes({
    onAction: onAction as never,
  });

  useEffect(() => {
    // noop to keep component mounted
  }, []);

  return <div data-testid="target" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} />;
}

describe("useDeckSwipes", () => {
  it("fires action on pointer swipe", () => {
    const onAction = vi.fn();
    const { getByTestId } = render(<SwipesHarness onAction={onAction} />);
    const target = getByTestId("target");

    fireEvent.pointerDown(target, { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(target, { clientX: 120, clientY: 0 });

    expect(onAction).toHaveBeenCalledWith("right");
  });

  it("handles keyboard arrow keys", () => {
    const onAction = vi.fn();
    render(<SwipesHarness onAction={onAction} />);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowUp" });

    expect(onAction).toHaveBeenCalledWith("left");
    expect(onAction).toHaveBeenCalledWith("up");
  });
});
