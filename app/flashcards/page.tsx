"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteCustomCard,
  getAllStarred,
  getCustomCards,
  putCustomCard,
  unstarCard,
} from "@/lib/db/index";
import type { CustomCardRow, StarredCardRow } from "@/lib/db/schema";

type DrawerMode = { kind: "closed" } | { kind: "new" } | { kind: "edit"; id: string };

function uid(): string {
  return crypto.randomUUID();
}

export default function FlashcardsPage() {
  const [cards, setCards] = useState<CustomCardRow[]>([]);
  const [starred, setStarred] = useState<StarredCardRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });
  const [title, setTitle] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [tags, setTags] = useState("");

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([getCustomCards(), getAllStarred()]);
    setCards(c);
    setStarred(s);
    setHydrated(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const customOnly = useMemo(
    () => cards.filter((c) => !c.id.startsWith("star:")),
    [cards],
  );

  const openNew = () => {
    setTitle("");
    setFront("");
    setBack("");
    setTags("");
    setDrawer({ kind: "new" });
  };

  const openEdit = (c: CustomCardRow) => {
    setTitle(c.title);
    setFront(c.front);
    setBack(c.back);
    setTags((c.tags ?? []).join(", "));
    setDrawer({ kind: "edit", id: c.id });
  };

  const save = async () => {
    if (!front.trim() || !back.trim()) return;
    const now = new Date().toISOString();
    const id = drawer.kind === "edit" ? drawer.id : uid();
    const existing = drawer.kind === "edit" ? cards.find((c) => c.id === id) : undefined;
    await putCustomCard({
      id,
      title: title.trim() || front.trim().slice(0, 60),
      front: front.trim(),
      back: back.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    setDrawer({ kind: "closed" });
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this flashcard? Cannot be undone.")) return;
    await deleteCustomCard(id);
    await load();
  };

  const unstar = async (key: string) => {
    await unstarCard(key);
    // Best-effort: delete the mirror custom card too.
    await deleteCustomCard(`star:${key}`).catch(() => {});
    await load();
  };

  if (!hydrated) {
    return (
      <main className="px-4 py-8">
        <p className="text-sm text-ink-mute">Loading flashcards…</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
          Flashcards
        </p>
        <h1 className="font-display text-3xl text-ink">Your saved cards</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Author your own flashcards or drill the cards you&apos;ve starred
          inside sessions. Everything is stored locally — no account, no
          syncing.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Button type="button" variant="rust" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> New flashcard
        </Button>
        {customOnly.length > 0 ? (
          <Button asChild variant="outline">
            <Link href="/flashcards/drill">Drill all custom cards</Link>
          </Button>
        ) : null}
      </div>

      {drawer.kind !== "closed" ? (
        <Card className="mb-8 border-rust/30">
          <CardHeader>
            <CardTitle>
              {drawer.kind === "edit" ? "Edit flashcard" : "New flashcard"}
            </CardTitle>
            <CardDescription>
              Front is the prompt; back is the answer. Title is optional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. iiVI in C"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="front">Front (prompt)</Label>
              <textarea
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                className="w-full rounded-md border border-rule bg-paper-soft px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="back">Back (answer)</Label>
              <textarea
                id="back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                className="w-full rounded-md border border-rule bg-paper-soft px-3 py-2 text-sm text-ink shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="theory, voicings, scales"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="rust"
                onClick={() => void save()}
                disabled={!front.trim() || !back.trim()}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDrawer({ kind: "closed" })}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl text-ink">Custom cards</h2>
        {customOnly.length === 0 ? (
          <p className="text-sm text-ink-mute">
            No custom flashcards yet. Tap “New flashcard” to author one.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {customOnly.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    {c.tags && c.tags.length > 0 ? (
                      <CardDescription className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                        {c.tags.join(" · ")}
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-ink">
                        {c.front}
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap rounded-md border border-rule bg-paper-soft p-3 text-sm text-ink-soft">
                        {c.back}
                      </p>
                    </details>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(c)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void remove(c.id)}
                        className="text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-ink">Starred cards</h2>
        {starred.length === 0 ? (
          <p className="text-sm text-ink-mute">
            Star any card during a session and it shows up here.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {starred.map((s) => (
              <li key={s.cardKey}>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-rust">
                          {s.trackId ?? "?"}·{s.nodeId ?? "?"}
                        </p>
                        <CardTitle className="text-base">
                          {s.templateId ?? "card"}
                        </CardTitle>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void unstar(s.cardKey)}
                        title="Remove star"
                        className="text-gold-soft hover:text-rust"
                      >
                        <Star fill="currentColor" className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="text-xs text-ink-mute">
                      Starred {new Date(s.starredAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
