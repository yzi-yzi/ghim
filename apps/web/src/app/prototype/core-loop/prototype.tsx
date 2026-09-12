"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ghim/ui";
import { Progress } from "@ghim/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ghim/ui/components/select";
import { Separator } from "@ghim/ui/components/separator";
import { Spinner } from "@ghim/ui/components/spinner";

const variants = ["A", "B", "C"] as const;
type Variant = (typeof variants)[number];
type CaptureStage = "selected" | "enriching" | "ready";
type ReviewResult = "forgot" | "remembered" | null;

const variantNames: Record<Variant, string> = {
  A: "Một đường thẳng",
  B: "Không gian làm việc",
  C: "Tập trung từng việc",
};

function isVariant(value: string | undefined): value is Variant {
  return variants.includes(value as Variant);
}

export function CoreLoopPrototype({
  initialVariant,
}: {
  initialVariant: string | undefined;
}) {
  const [variant, setVariant] = useState<Variant>(
    isVariant(initialVariant) ? initialVariant : "A",
  );
  const [captureStage, setCaptureStage] = useState<CaptureStage>("selected");
  const [deck, setDeck] = useState("Từ khi đọc báo");
  const [reviewRevealed, setReviewRevealed] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult>(null);
  const [mode, setMode] = useState<"capture" | "review">("capture");

  const state = useMemo(
    () => ({ captureStage, deck, mode, reviewResult, reviewRevealed }),
    [captureStage, deck, mode, reviewResult, reviewRevealed],
  );

  function changeVariant(next: Variant) {
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    window.history.replaceState(null, "", url);
  }

  function cycleVariant(direction: -1 | 1) {
    const index = variants.indexOf(variant);
    changeVariant(variants[(index + direction + variants.length) % variants.length]!);
  }

  function saveWord() {
    setCaptureStage("enriching");
    window.setTimeout(() => setCaptureStage("ready"), 900);
  }

  function openReview() {
    setMode("review");
    setReviewRevealed(false);
    setReviewResult(null);
  }

  function reset() {
    setCaptureStage("selected");
    setReviewRevealed(false);
    setReviewResult(null);
    setMode("capture");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
      if (direction === 0) return;

      const index = variants.indexOf(variant);
      changeVariant(variants[(index + direction + variants.length) % variants.length]!);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant]);

  const actions: PrototypeActions = {
    answer: setReviewResult,
    openReview,
    reset,
    reveal: () => setReviewRevealed(true),
    saveWord,
    setDeck,
    setMode,
  };

  return (
    <main className="min-h-svh pb-24">
      {variant === "A" && <VariantA state={state} actions={actions} />}
      {variant === "B" && <VariantB state={state} actions={actions} />}
      {variant === "C" && <VariantC state={state} actions={actions} />}

      <StateLedger state={state} />

      {process.env.NODE_ENV !== "production" && (
        <Card className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <CardContent className="flex items-center gap-3 py-2">
            <Button size="icon-sm" variant="ghost" onClick={() => cycleVariant(-1)} aria-label="Phương án trước">←</Button>
            <span className="min-w-44 text-center text-sm"><strong>{variant}</strong> · {variantNames[variant]}</span>
            <Button size="icon-sm" variant="ghost" onClick={() => cycleVariant(1)} aria-label="Phương án sau">→</Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

type PrototypeState = {
  captureStage: CaptureStage;
  deck: string;
  mode: "capture" | "review";
  reviewResult: ReviewResult;
  reviewRevealed: boolean;
};

type PrototypeActions = {
  answer: (result: Exclude<ReviewResult, null>) => void;
  openReview: () => void;
  reset: () => void;
  reveal: () => void;
  saveWord: () => void;
  setDeck: (deck: string) => void;
  setMode: (mode: "capture" | "review") => void;
};

function VariantA({ state, actions }: { state: PrototypeState; actions: PrototypeActions }) {
  const progress = state.captureStage === "selected" ? 33 : state.captureStage === "enriching" ? 66 : 100;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <PrototypeHeader kicker="Phương án A · Một đường thẳng" />
      <section className="space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground"><span>Bắt gặp</span><span>Ghim lại</span><span>Ôn lần đầu</span></div>
        <Progress value={progress} />
      </section>
      {state.mode === "capture" ? <CaptureCard state={state} actions={actions} showContext /> : <ReviewCard state={state} actions={actions} />}
      <Button variant="ghost" onClick={actions.reset}>Bắt đầu lại kịch bản</Button>
    </div>
  );
}

function VariantB({ state, actions }: { state: PrototypeState; actions: PrototypeActions }) {
  return (
    <div className="mx-auto grid min-h-svh max-w-7xl md:grid-cols-[16rem_1fr]">
      <aside className="space-y-8 border-r p-4">
        <PrototypeHeader kicker="Phương án B · Không gian làm việc" />
        <nav className="grid gap-2" aria-label="Khu vực prototype">
          <Button className="justify-between" variant={state.mode === "capture" ? "secondary" : "ghost"} onClick={() => actions.setMode("capture")}>
            Hộp thư từ mới <Badge variant="outline">1</Badge>
          </Button>
          <Button className="justify-between" variant={state.mode === "review" ? "secondary" : "ghost"} onClick={actions.openReview}>
            Bàn ôn hôm nay <Badge variant="outline">12</Badge>
          </Button>
        </nav>
        <Card><CardHeader><CardDescription>Chuỗi hiện tại</CardDescription><CardTitle>7 ngày</CardTitle></CardHeader></Card>
      </aside>

      <div className="grid gap-8 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,1fr)] lg:p-8">
        <section className="space-y-4">
          <Badge variant="secondary">Ngữ cảnh đang đọc</Badge>
          <h1 className="text-3xl font-bold tracking-tight">On attention and generosity</h1>
          <p className="leading-7 text-muted-foreground">We give our attention to the things we care about. Attention is the rarest and purest form of <mark>generosity</mark>.</p>
          <p className="text-sm text-muted-foreground">the-marginalian.com · lưu riêng tư</p>
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{state.mode === "capture" ? "Từ mới" : "Ôn 03/12"}</Badge>
            <Button size="sm" variant="ghost" onClick={actions.reset}>Làm lại</Button>
          </div>
          {state.mode === "capture" ? <CaptureCard state={state} actions={actions} /> : <ReviewCard state={state} actions={actions} />}
        </section>
      </div>
    </div>
  );
}

function VariantC({ state, actions }: { state: PrototypeState; actions: PrototypeActions }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col px-4 py-8">
      <div className="flex items-center justify-between">
        <PrototypeHeader kicker="Phương án C · Tập trung từng việc" />
        <Badge variant="outline">{state.mode === "capture" ? "1 / 2" : "2 / 2"}</Badge>
      </div>
      <div className="my-auto py-12">
        {state.mode === "capture" ? <CaptureCard state={state} actions={actions} showContext /> : <ReviewCard state={state} actions={actions} />}
      </div>
      <Button className="self-center" variant="ghost" onClick={actions.reset}>Thoát kịch bản</Button>
    </div>
  );
}

function PrototypeHeader({ kicker }: { kicker: string }) {
  return <div><p className="text-lg font-semibold">Ghim</p><p className="text-sm text-muted-foreground">{kicker}</p></div>;
}

function CaptureCard({ state, actions, showContext = false }: { state: PrototypeState; actions: PrototypeActions; showContext?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4"><Badge variant="secondary">Bạn vừa gặp từ này</Badge>{showContext && <Badge variant="outline">Có câu gốc</Badge>}</div>
        <CardTitle className="text-4xl">generosity</CardTitle>
        <CardDescription>/ˌdʒen.əˈrɒs.ə.ti/ · noun</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showContext && <p className="text-sm text-muted-foreground">“Attention is the rarest and purest form of generosity.”</p>}
        <DeckPicker value={state.deck} onChange={actions.setDeck} />
        <CaptureResult stage={state.captureStage} onReview={actions.openReview} />
      </CardContent>
      {state.captureStage === "selected" && <CardFooter className="justify-end"><Button onClick={actions.saveWord}>Ghim vào “{state.deck}”</Button></CardFooter>}
    </Card>
  );
}

function DeckPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Lưu vào bộ từ</p>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Từ khi đọc báo">Từ khi đọc báo</SelectItem>
          <SelectItem value="Công việc">Công việc</SelectItem>
          <SelectItem value="Du lịch">Du lịch</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function CaptureResult({ stage, onReview }: { stage: CaptureStage; onReview: () => void }) {
  if (stage === "selected") return null;
  if (stage === "enriching") return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> Đang tìm đúng nghĩa trong ngữ cảnh…</div>;

  return (
    <div className="space-y-4">
      <Separator />
      <div className="space-y-2">
        <Badge>Đã ghim</Badge>
        <h3 className="font-semibold">sự hào phóng; lòng rộng lượng</h3>
        <p className="text-sm text-muted-foreground">Ví dụ và phát âm đã sẵn sàng. Bạn có thể thử nhớ ngay hoặc quay lại đọc tiếp.</p>
      </div>
      <Button onClick={onReview}>Ôn lần đầu</Button>
    </div>
  );
}

function ReviewCard({ state, actions }: { state: PrototypeState; actions: PrototypeActions }) {
  if (state.reviewResult) {
    return (
      <Card>
        <CardHeader>
          <Badge className="w-fit">Hoàn thành</Badge>
          <CardTitle>{state.reviewResult === "remembered" ? "Tốt lắm, hẹn gặp lại sau." : "Không sao, từ này sẽ quay lại sớm."}</CardTitle>
          <CardDescription>{state.reviewResult === "remembered" ? "FSRS đã xếp lần ôn tiếp theo sau 3 ngày." : "Ghim sẽ cho bạn gặp lại trong phiên hôm nay."}</CardDescription>
        </CardHeader>
        <CardFooter><Button variant="outline" onClick={actions.reset}>Xem lại từ đầu</Button></CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Ôn 03 / 12 · Nhận diện</CardDescription>
        <CardTitle className="text-4xl">{state.reviewRevealed ? "sự hào phóng; lòng rộng lượng" : "generosity"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">“Attention is the rarest and purest form of generosity.”</p>
        {state.reviewRevealed && <p className="text-sm">Bạn có nhận ra đúng nghĩa này trước khi mở đáp án không?</p>}
      </CardContent>
      <CardFooter className="gap-2">
        {!state.reviewRevealed ? <Button onClick={actions.reveal}>Xem nghĩa</Button> : <><Button variant="outline" onClick={() => actions.answer("forgot")}>Quên</Button><Button onClick={() => actions.answer("remembered")}>Nhớ</Button></>}
      </CardFooter>
    </Card>
  );
}

function StateLedger({ state }: { state: PrototypeState }) {
  return <details className="fixed right-4 bottom-4 z-40 w-60 rounded-lg border bg-card p-3 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium">Prototype state</summary><pre className="mt-2 overflow-auto">{JSON.stringify(state, null, 2)}</pre></details>;
}
