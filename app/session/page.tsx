import { SessionRunner } from "@/components/session/SessionRunner";

type Props = {
  searchParams?: { quick?: string; minutes?: string };
};

function parseMinutes(
  quick: string | undefined,
  minutes: string | undefined,
): 5 | 15 | 30 {
  if (quick === "1") return 5;
  const n = minutes ? parseInt(minutes, 10) : NaN;
  if (n <= 5) return 5;
  if (n <= 15) return 15;
  return 30;
}

export default function SessionPage({ searchParams }: Props) {
  const sessionMinutes = parseMinutes(
    searchParams?.quick,
    searchParams?.minutes,
  );
  return <SessionRunner sessionMinutes={sessionMinutes} />;
}
