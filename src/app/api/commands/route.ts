import { NextResponse } from "next/server";
import { runCommand } from "@/lib/commands";

export async function POST(request: Request) {
  const { command } = await request.json();
  if (!command || typeof command !== "string") {
    return NextResponse.json({ message: "Command missing" }, { status: 400 });
  }
  try {
    const message = await runCommand(command);
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
