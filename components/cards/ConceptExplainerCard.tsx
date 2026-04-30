"use client";

import type { ConceptExplainerParams } from "@/lib/cards/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ConceptExplainerCard({
  params,
  onContinue,
}: {
  params: ConceptExplainerParams;
  onContinue: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{params.title}</CardTitle>
        <CardDescription>Read, then continue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-base leading-relaxed text-ink-soft">
          {params.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <Button type="button" variant="rust" onClick={onContinue}>
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}
