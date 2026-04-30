import { SessionRunner } from "@/components/session/SessionRunner";

type Props = { searchParams?: { quick?: string } };

export default function SessionPage({ searchParams }: Props) {
  const quick = searchParams?.quick === "1";
  return <SessionRunner quick={quick} />;
}
