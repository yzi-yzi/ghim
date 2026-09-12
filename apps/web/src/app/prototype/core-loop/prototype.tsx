"use client";

// Three variants of the Capture + Daily Review loop, switchable via ?variant=, on the throwaway /prototype/core-loop route.

import { useEffect, useMemo, useState } from "react";

import { Badge, Button } from "@ghim/ui";

import "./prototype.css";

const variants = ["A", "B", "C"] as const;
type Variant = (typeof variants)[number];
type CaptureStage = "selected" | "enriching" | "ready";
type ReviewResult = "forgot" | "remembered" | null;

const variantNames: Record<Variant, string> = {
  A: "Một đường thẳng",
  B: "Bàn thủ thư",
  C: "Nghi thức tập trung",
};

function isVariant(value: string | undefined): value is Variant {
  return variants.includes(value as Variant);
}

export function CoreLoopPrototype({ initialVariant }: { initialVariant: string | undefined }) {
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
      if (event.key === "ArrowLeft") cycleVariant(-1);
      if (event.key === "ArrowRight") cycleVariant(1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const actions = {
    answer: setReviewResult,
    openReview,
    reset,
    reveal: () => setReviewRevealed(true),
    saveWord,
    setDeck,
    setMode,
  };

  return (
    <main className={`core-prototype variant-${variant.toLowerCase()}`}>
      {variant === "A" && <VariantA state={state} actions={actions} />}
      {variant === "B" && <VariantB state={state} actions={actions} />}
      {variant === "C" && <VariantC state={state} actions={actions} />}

      <StateLedger state={state} />

      {process.env.NODE_ENV !== "production" && (
        <nav className="prototype-switcher" aria-label="Chọn phương án prototype">
          <button type="button" onClick={() => cycleVariant(-1)} aria-label="Phương án trước">←</button>
          <span><strong>{variant}</strong> · {variantNames[variant]}</span>
          <button type="button" onClick={() => cycleVariant(1)} aria-label="Phương án sau">→</button>
        </nav>
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
  return (
    <div className="a-shell">
      <PrototypeHeader kicker="Phương án A · Một đường thẳng" />
      <div className="a-progress" aria-label="Tiến trình">
        {[
          ["01", "Bắt gặp"], ["02", "Ghim lại"], ["03", "Ôn lần đầu"],
        ].map(([number, label], index) => (
          <div className={index <= (state.captureStage === "selected" ? 0 : state.captureStage === "enriching" ? 1 : 2) ? "is-active" : ""} key={number}>
            <span>{number}</span><strong>{label}</strong>
          </div>
        ))}
      </div>
      <section className="a-stage">
        {state.mode === "capture" ? (
          <>
            <p className="source-line">The Marginalian · 8 phút đọc</p>
            <blockquote>“Attention is the rarest and purest form of <mark>generosity</mark>.”</blockquote>
            <div className="word-row"><div><span>Từ đã chọn</span><h1>generosity</h1><p>/ˌdʒen.əˈrɒs.ə.ti/ · noun</p></div><Badge variant="outline">Có câu gốc</Badge></div>
            <DeckPicker value={state.deck} onChange={actions.setDeck} />
            <CaptureAction deck={state.deck} stage={state.captureStage} onSave={actions.saveWord} onReview={actions.openReview} />
          </>
        ) : (
          <ReviewCard state={state} actions={actions} compact={false} />
        )}
      </section>
      <button className="text-action" type="button" onClick={actions.reset}>↺ Bắt đầu lại kịch bản</button>
    </div>
  );
}

function VariantB({ state, actions }: { state: PrototypeState; actions: PrototypeActions }) {
  return (
    <div className="b-shell">
      <aside className="b-sidebar">
        <PrototypeHeader kicker="Phương án B · Bàn thủ thư" />
        <nav aria-label="Khu vực prototype">
          <button className={state.mode === "capture" ? "active" : ""} onClick={() => actions.setMode("capture")} type="button">⌁ Hộp thư từ mới <span>1</span></button>
          <button className={state.mode === "review" ? "active" : ""} onClick={actions.openReview} type="button">◫ Bàn ôn hôm nay <span>12</span></button>
        </nav>
        <div className="streak-stamp"><strong>7</strong><span>ngày giữ nhịp</span></div>
      </aside>
      <section className="b-reading">
        <p className="eyebrow">Ngữ cảnh đang đọc</p>
        <h1>On attention and generosity</h1>
        <p>We give our attention to the things we care about. Attention is the rarest and purest form of <mark>generosity</mark>.</p>
        <small>the-marginalian.com · lưu riêng tư</small>
      </section>
      <section className="b-desk">
        <div className="desk-label"><span>{state.mode === "capture" ? "PHIẾU TỪ MỚI" : "PHIẾU ÔN 03/12"}</span><button type="button" onClick={actions.reset}>Làm lại</button></div>
        {state.mode === "capture" ? (
          <div className="catalog-card">
            <span className="catalog-index">G–019</span>
            <h2>generosity</h2><p className="pronunciation">/ˌdʒen.əˈrɒs.ə.ti/ · noun</p>
            <DeckPicker value={state.deck} onChange={actions.setDeck} />
            <CaptureAction deck={state.deck} stage={state.captureStage} onSave={actions.saveWord} onReview={actions.openReview} />
          </div>
        ) : <ReviewCard state={state} actions={actions} compact />}
      </section>
    </div>
  );
}

function VariantC({ state, actions }: { state: PrototypeState; actions: PrototypeActions }) {
  const captureReady = state.captureStage === "ready";
  return (
    <div className="c-shell">
      <header className="c-header"><PrototypeHeader kicker="Phương án C · Nghi thức tập trung" /><span>{state.mode === "capture" ? "1 / 2" : "2 / 2"}</span></header>
      <section className="c-focus">
        {state.mode === "capture" ? (
          <>
            <Badge variant="secondary">Bạn vừa gặp từ này</Badge>
            <h1>generosity</h1>
            <p className="c-context">“Attention is the rarest and purest form of generosity.”</p>
            {state.captureStage === "selected" && <><DeckPicker value={state.deck} onChange={actions.setDeck} /><Button size="lg" onClick={actions.saveWord}>Ghim từ này</Button></>}
            {state.captureStage === "enriching" && <div className="quiet-loader"><span />Đang tra nghĩa theo câu bạn đọc…</div>}
            {captureReady && <div className="c-reveal"><p className="eyebrow">Đã chuẩn bị xong</p><h2>sự hào phóng; lòng rộng lượng</h2><p>Cho đi nhiều hơn mức cần thiết, đặc biệt về thời gian, tiền bạc hoặc sự quan tâm.</p><Button size="lg" onClick={actions.openReview}>Thử nhớ ngay</Button></div>}
          </>
        ) : <ReviewCard state={state} actions={actions} compact={false} />}
      </section>
      <button className="text-action" type="button" onClick={actions.reset}>Thoát kịch bản</button>
    </div>
  );
}

function PrototypeHeader({ kicker }: { kicker: string }) {
  return <div className="prototype-brand"><span aria-hidden="true">G</span><div><strong>Ghim</strong><small>{kicker}</small></div></div>;
}

function DeckPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="deck-picker"><span>Lưu vào bộ từ</span><select value={value} onChange={(event) => onChange(event.target.value)}><option>Từ khi đọc báo</option><option>Công việc</option><option>Du lịch</option></select></label>;
}

function CaptureAction({ deck, stage, onSave, onReview }: { deck: string; stage: CaptureStage; onSave: () => void; onReview: () => void }) {
  if (stage === "enriching") return <div className="enrichment-status"><span />Đang tìm đúng nghĩa trong ngữ cảnh…</div>;
  if (stage === "ready") return <div className="enriched-result"><Badge>Đã ghim</Badge><h3>sự hào phóng; lòng rộng lượng</h3><p>Ví dụ và phát âm đã sẵn sàng. Bạn có thể thử nhớ ngay hoặc quay lại đọc tiếp.</p><Button onClick={onReview}>Ôn lần đầu</Button></div>;
  return <Button size="lg" onClick={onSave}>Ghim vào “{deck}”</Button>;
}

function ReviewCard({ state, actions, compact }: { state: PrototypeState; actions: PrototypeActions; compact: boolean }) {
  if (state.reviewResult) return <div className="review-complete"><span className="completion-mark">✓</span><h2>{state.reviewResult === "remembered" ? "Tốt lắm, hẹn gặp lại sau." : "Không sao, từ này sẽ quay lại sớm."}</h2><p>{state.reviewResult === "remembered" ? "FSRS đã xếp lần ôn tiếp theo sau 3 ngày." : "Ghim sẽ cho bạn gặp lại trong phiên hôm nay."}</p><Button variant="outline" onClick={actions.reset}>Xem lại từ đầu</Button></div>;
  return <div className={`review-card ${compact ? "is-compact" : ""}`}><p className="eyebrow">Ôn 03 / 12 · Nhận diện</p><h2>{state.reviewRevealed ? "sự hào phóng; lòng rộng lượng" : "generosity"}</h2><blockquote>“Attention is the rarest and purest form of generosity.”</blockquote>{!state.reviewRevealed ? <Button size="lg" onClick={actions.reveal}>Xem nghĩa</Button> : <><p className="answer-note">Bạn có nhận ra đúng nghĩa này trước khi mở đáp án không?</p><div className="answer-actions"><Button variant="outline" onClick={() => actions.answer("forgot")}>Quên</Button><Button onClick={() => actions.answer("remembered")}>Nhớ</Button></div></>}</div>;
}

function StateLedger({ state }: { state: PrototypeState }) {
  return <details className="state-ledger"><summary>Prototype state</summary><pre>{JSON.stringify(state, null, 2)}</pre></details>;
}
