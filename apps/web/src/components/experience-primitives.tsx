import { useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import "./experience-primitives.css";

type TypeTextProps = {
  examples: readonly string[];
  className?: string;
};

const emphasizedTerms = /(under \$\d+|no soldering(?: required)?|beginner-friendly|intermediate level|battery-powered|using an? (?:Arduino|ESP32|Raspberry Pi(?: Pico| Zero)?|rotary encoder)|Arduino|ESP32|Raspberry Pi(?: Pico| Zero)?|OLED screen|e-ink display)/gi;
const emphasizedTermMatcher = /^(under \$\d+|no soldering(?: required)?|beginner-friendly|intermediate level|battery-powered|using an? (?:Arduino|ESP32|Raspberry Pi(?: Pico| Zero)?|rotary encoder)|Arduino|ESP32|Raspberry Pi(?: Pico| Zero)?|OLED screen|e-ink display)$/i;

function emphasizePlaceholder(text: string): ReactNode[] {
  return text.split(emphasizedTerms).filter(Boolean).map((part, index) => (
    emphasizedTermMatcher.test(part)
      ? <span className="text-type__accent" key={part + index}>{part}</span>
      : <span key={part + index}>{part}</span>
  ));
}

export function TextType({ examples, className = "" }: TypeTextProps) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [direction, setDirection] = useState<"typing" | "holding" | "deleting">("typing");
  const reducedMotion = useReducedMotion();

  const example = examples[exampleIndex] ?? "";
  const visibleText = example.slice(0, length);

  useEffect(() => {
    if (reducedMotion) {
      setLength(example.length);
      return;
    }
    const timeout = window.setTimeout(() => {
      if (direction === "typing") {
        if (length >= example.length) {
          setDirection("holding");
          return;
        }
        setLength((current) => current + 1);
        return;
      }
      if (direction === "holding") {
        setDirection("deleting");
        return;
      }
      if (length <= 0) {
        setDirection("typing");
        setExampleIndex((current) => (current + 1) % examples.length);
        return;
      }
      setLength((current) => current - 1);
    }, direction === "holding" ? 1900 : direction === "deleting" ? 15 : 23);
    return () => window.clearTimeout(timeout);
  }, [direction, example.length, examples.length, length, reducedMotion]);

  return (
    <span className={"text-type " + className} aria-hidden="true">
      {emphasizePlaceholder(visibleText)}
      <span className="text-type__cursor">|</span>
    </span>
  );
}

type CurvedInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helper?: string;
};

export function CurvedInput({ label, helper, id, className = "", ...props }: CurvedInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label className={"curved-input " + className} htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} {...props} />
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

type AnimatedListProps<T> = {
  items: readonly T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
};

export function AnimatedList<T>({ items, getKey, renderItem, className = "" }: AnimatedListProps<T>) {
  const reducedMotion = useReducedMotion();
  return (
    <ul className={"animated-list " + className}>
      {items.map((item, index) => (
        <motion.li
          key={getKey(item, index)}
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: reducedMotion ? 0 : index * 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderItem(item, index)}
        </motion.li>
      ))}
    </ul>
  );
}

type CountUpProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
};

export function CountUp({ value, prefix = "", suffix = "", decimals = 2, className = "" }: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }
    const start = performance.now();
    const duration = 820;
    let frame = 0;
    const draw = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, value]);

  return <span className={"count-up " + className}>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>;
}

export function Masonry({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"masonry " + className}>{children}</div>;
}

type StepperProps = {
  steps: readonly { id: string; title: string; order: number }[];
  activeIndex: number;
  completedStepIds: ReadonlySet<string>;
  showingOverview: boolean;
  onSelect: (index: number) => void;
  onShowOverview: () => void;
};

export function Stepper({
  steps,
  activeIndex,
  completedStepIds,
  showingOverview,
  onSelect,
  onShowOverview,
}: StepperProps) {
  return (
    <nav className="stepper" aria-label="Workshop steps">
      <button type="button" className={showingOverview ? "stepper__overview active" : "stepper__overview"} onClick={onShowOverview}>
        <span>Assembly</span>
        <small>Full model</small>
      </button>
      <ol>
        {steps.map((step, index) => {
          const completed = completedStepIds.has(step.id);
          const active = !showingOverview && index === activeIndex;
          return (
            <li key={step.id}>
              <button
                type="button"
                className={active ? "stepper__step active" : completed ? "stepper__step completed" : "stepper__step"}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(index)}
              >
                <span className="stepper__index">{String(step.order).padStart(2, "0")}</span>
                <span>{step.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
