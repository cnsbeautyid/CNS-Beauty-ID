"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox, RadioGroup } from "@/components/ui/choice";
import { LoadingState } from "@/components/ui/states";
import { BUDGET_OPTIONS, GOAL_OPTIONS, MAX_CONCERNS, SENSITIVITY_OPTIONS, UNSURE_SKIN_TYPE, type QuizAnswers } from "@/services/quiz/schema";
import { useQuizStore, type QuizDraft } from "@/stores/quiz-store";

import { submitSkinQuizAction } from "./actions";
import { QuizResultView } from "./quiz-result";

type Option = { slug: string; name: string };
export type QuizFlowOptions = { skinTypes: Option[]; concerns: Option[]; steps: Option[] };

type StepSpec = { title: string; description?: string; valid: (answers: QuizDraft) => boolean };

const STEPS: StepSpec[] = [
  { title: "Apa jenis kulitmu?", description: "Pilih yang paling menggambarkan kulit wajahmu sehari-hari.", valid: (a) => Boolean(a.skinType) },
  { title: "Apa kebutuhan utama kulitmu?", description: `Pilih 1–${MAX_CONCERNS} yang paling penting.`, valid: (a) => a.concerns.length > 0 },
  { title: "Seberapa sensitif kulitmu?", valid: (a) => Boolean(a.sensitivity) },
  { title: "Langkah apa saja yang sudah kamu lakukan?", description: "Boleh dikosongkan jika belum punya rutinitas.", valid: () => true },
  { title: "Hasil apa yang kamu harapkan?", description: "Boleh pilih lebih dari satu, atau lewati.", valid: () => true },
  { title: "Berapa budget per produk?", valid: (a) => Boolean(a.budget) },
];

function CheckboxList({ name, options, selected, onChange, max }: { name: string; options: { value: string; label: string }[]; selected: string[]; onChange: (next: string[]) => void; max?: number }) {
  return (
    <div className="grid gap-3 tablet:grid-cols-2">
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <Checkbox
            key={option.value}
            id={`${name}-${option.value}`}
            label={option.label}
            checked={checked}
            disabled={!checked && max !== undefined && selected.length >= max}
            onChange={() => onChange(checked ? selected.filter((value) => value !== option.value) : [...selected, option.value])}
          />
        );
      })}
    </div>
  );
}

/** Six-step Skin Quiz (PRD §19). Scoring happens on the server. */
export function QuizFlow({ options }: { options: QuizFlowOptions }) {
  const { step, answers, result, setStep, setAnswer, setResult } = useQuizStore();
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    void Promise.resolve(useQuizStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  // Move focus to the new question (not on first load) for keyboard and screen-reader users.
  useEffect(() => {
    if (moved.current) headingRef.current?.focus();
  }, [step, result]);

  if (!hydrated) return <LoadingState label="Menyiapkan Skin Quiz…" />;
  if (result) return <QuizResultView result={result} answers={answers as QuizAnswers} />;

  const spec = STEPS[step] ?? STEPS[0]!;
  const last = step === STEPS.length - 1;
  const go = (next: number) => {
    moved.current = true;
    setError(undefined);
    setStep(next);
  };

  const submit = () =>
    startTransition(async () => {
      const outcome = await submitSkinQuizAction(answers as QuizAnswers);
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      moved.current = true;
      setResult(outcome.result, outcome.saved);
    });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-caption tracking-eyebrow text-text-secondary uppercase">
          Langkah {step + 1} dari {STEPS.length}
        </p>
        <div
          role="progressbar"
          aria-label="Progres Skin Quiz"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          className="h-1 overflow-hidden rounded-pill bg-secondary"
        >
          <div className="h-full bg-brand-cocoa transition-[width] duration-(--duration-base)" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <section aria-labelledby="quiz-question" className="flex flex-col gap-5">
        <div>
          <h2 id="quiz-question" ref={headingRef} tabIndex={-1} className="font-display text-h2 text-brand-cocoa-dark focus:outline-none">
            {spec.title}
          </h2>
          {spec.description && <p className="mt-2 text-body-s text-text-secondary">{spec.description}</p>}
        </div>

        {step === 0 && (
          <RadioGroup
            name="skin-type"
            legend="Jenis kulit"
            value={answers.skinType}
            onChange={(value) => setAnswer("skinType", value)}
            options={[...options.skinTypes.map((type) => ({ value: type.slug, label: type.name })), { value: UNSURE_SKIN_TYPE, label: "Belum yakin" }]}
          />
        )}
        {step === 1 && (
          <fieldset>
            <legend className="sr-only">Kebutuhan kulit</legend>
            <CheckboxList
              name="concern"
              max={MAX_CONCERNS}
              selected={answers.concerns}
              onChange={(next) => setAnswer("concerns", next)}
              options={options.concerns.map((concern) => ({ value: concern.slug, label: concern.name }))}
            />
          </fieldset>
        )}
        {step === 2 && (
          <RadioGroup
            name="sensitivity"
            legend="Sensitivitas kulit"
            value={answers.sensitivity}
            onChange={(value) => setAnswer("sensitivity", value as QuizAnswers["sensitivity"])}
            options={SENSITIVITY_OPTIONS.map((option) => ({ value: option.value, label: option.label, hint: option.hint }))}
          />
        )}
        {step === 3 && (
          <fieldset>
            <legend className="sr-only">Rutinitas saat ini</legend>
            <CheckboxList
              name="routine"
              selected={answers.routine}
              onChange={(next) => setAnswer("routine", next)}
              options={options.steps.map((routineStep) => ({ value: routineStep.slug, label: routineStep.name }))}
            />
          </fieldset>
        )}
        {step === 4 && (
          <fieldset>
            <legend className="sr-only">Hasil yang diharapkan</legend>
            <CheckboxList name="goal" selected={answers.goals} onChange={(next) => setAnswer("goals", next)} options={GOAL_OPTIONS.map((goal) => ({ value: goal.value, label: goal.label }))} />
          </fieldset>
        )}
        {step === 5 && (
          <RadioGroup
            name="budget"
            legend="Budget per produk"
            value={answers.budget}
            onChange={(value) => setAnswer("budget", value)}
            options={BUDGET_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-body-s text-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
        <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || pending}>
          Kembali
        </Button>
        {last ? (
          <Button onClick={submit} loading={pending} disabled={!spec.valid(answers)}>
            Lihat hasil
          </Button>
        ) : (
          <Button onClick={() => go(step + 1)} disabled={!spec.valid(answers)}>
            Lanjut
          </Button>
        )}
      </div>
      <p className="text-caption text-text-secondary">Skin Quiz memberi saran perawatan, bukan diagnosis medis.</p>
    </div>
  );
}
