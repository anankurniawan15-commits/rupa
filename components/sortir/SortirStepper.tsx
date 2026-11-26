'use client';
import { Stepper } from '@/components/ui/Stepper';
import { SORTIR_STEPS } from '@/lib/ai/sortir-engine';

/** Stepper 5 langkah AI Sortir — hanya langkah yang sudah dicapai yang bisa diklik. */
export function SortirStepper({ step, maxStep, onGo }: { step: number; maxStep: number; onGo: (n: number) => void }) {
  return <Stepper steps={SORTIR_STEPS} step={step} maxStep={maxStep} onGo={onGo} label="Langkah AI Sortir" />;
}
