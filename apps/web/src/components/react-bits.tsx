import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

import "./react-bits.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type CssVariables = CSSProperties & Record<string, string | number | undefined>;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

type ShapeGridProps = {
  direction?: "diagonal" | "up" | "right" | "down" | "left";
  speed?: number;
  borderColor?: string;
  squareSize?: number;
  hoverFillColor?: string;
  hoverTrailAmount?: number;
  className?: string;
};

export function ShapeGrid({
  direction = "right",
  speed = 1,
  borderColor = "#d8cfb6",
  squareSize = 40,
  hoverFillColor = "#0172e4",
  hoverTrailAmount = 0,
  className = "",
}: ShapeGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const gridOffset = { x: 0, y: 0 };
    const hoveredCell = { x: Number.NaN, y: Number.NaN };
    const trail: Array<{ x: number; y: number }> = [];
    const opacity = new Map<string, number>();
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const updateHover = () => {
      const targets = new Map<string, number>();
      if (Number.isFinite(hoveredCell.x)) {
        targets.set(hoveredCell.x + "," + hoveredCell.y, 1);
      }
      for (let index = 0; index < trail.length; index += 1) {
        targets.set(trail[index]!.x + "," + trail[index]!.y, (trail.length - index) / (trail.length + 1));
      }
      for (const [key, target] of targets) {
        const current = opacity.get(key) ?? 0;
        opacity.set(key, current + (target - current) * 0.2);
      }
      for (const [key, current] of opacity) {
        if (targets.has(key)) continue;
        const next = current * 0.78;
        if (next < 0.01) opacity.delete(key);
        else opacity.set(key, next);
      }
    };

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      context.clearRect(0, 0, width, height);
      const offsetX = ((gridOffset.x % squareSize) + squareSize) % squareSize;
      const offsetY = ((gridOffset.y % squareSize) + squareSize) % squareSize;
      const columns = Math.ceil(width / squareSize) + 3;
      const rows = Math.ceil(height / squareSize) + 3;

      for (let column = -2; column < columns; column += 1) {
        for (let row = -2; row < rows; row += 1) {
          const x = column * squareSize + offsetX;
          const y = row * squareSize + offsetY;
          const alpha = opacity.get(column + "," + row) ?? 0;
          if (alpha > 0) {
            context.globalAlpha = alpha * 0.42;
            context.fillStyle = hoverFillColor;
            context.fillRect(x, y, squareSize, squareSize);
          }
          context.globalAlpha = 1;
          context.strokeStyle = borderColor;
          context.lineWidth = 1;
          context.strokeRect(x, y, squareSize, squareSize);
        }
      }
    };

    const tick = () => {
      const effectiveSpeed = Math.max(speed, 0.1);
      if (!reducedMotion) {
        if (direction === "left" || direction === "diagonal") gridOffset.x += effectiveSpeed;
        if (direction === "right") gridOffset.x -= effectiveSpeed;
        if (direction === "up") gridOffset.y += effectiveSpeed;
        if (direction === "down" || direction === "diagonal") gridOffset.y -= effectiveSpeed;
        updateHover();
      }
      draw();
      if (!reducedMotion) frame = requestAnimationFrame(tick);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left - (((gridOffset.x % squareSize) + squareSize) % squareSize)) / squareSize);
      const y = Math.floor((event.clientY - rect.top - (((gridOffset.y % squareSize) + squareSize) % squareSize)) / squareSize);
      if (x === hoveredCell.x && y === hoveredCell.y) return;
      if (Number.isFinite(hoveredCell.x) && hoverTrailAmount > 0) {
        trail.unshift({ x: hoveredCell.x, y: hoveredCell.y });
        trail.length = Math.min(trail.length, hoverTrailAmount);
      }
      hoveredCell.x = x;
      hoveredCell.y = y;
    };

    const handlePointerLeave = () => {
      if (Number.isFinite(hoveredCell.x) && hoverTrailAmount > 0) {
        trail.unshift({ x: hoveredCell.x, y: hoveredCell.y });
        trail.length = Math.min(trail.length, hoverTrailAmount);
      }
      hoveredCell.x = Number.NaN;
      hoveredCell.y = Number.NaN;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    resize();
    tick();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [borderColor, direction, hoverFillColor, hoverTrailAmount, reducedMotion, speed, squareSize]);

  return <canvas ref={canvasRef} className={"shape-grid " + className} aria-hidden="true" />;
}

type BorderGlowProps = {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
};

export function BorderGlow({
  children,
  className = "",
  glowColor = "210 99% 45%",
  backgroundColor = "#fffdf5",
  borderRadius = 14,
  glowRadius = 30,
  glowIntensity = 1,
}: BorderGlowProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edgeX = Math.min(x, rect.width - x) / Math.max(rect.width / 2, 1);
    const edgeY = Math.min(y, rect.height - y) / Math.max(rect.height / 2, 1);
    const proximity = 1 - Math.min(edgeX, edgeY);
    card.style.setProperty("--pointer-x", x + "px");
    card.style.setProperty("--pointer-y", y + "px");
    card.style.setProperty("--edge-proximity", Math.max(0, proximity).toFixed(3));
  };

  const style: CssVariables = {
    "--border-glow-color": glowColor,
    "--border-glow-background": backgroundColor,
    "--border-glow-radius": borderRadius + "px",
    "--border-glow-spread": glowRadius + "px",
    "--border-glow-intensity": String(glowIntensity),
  };

  return (
    <div ref={ref} className={"border-glow-card " + className} style={style} onPointerMove={handlePointerMove}>
      <div className="border-glow-card__inner">{children}</div>
    </div>
  );
}

type SplitTextProps = {
  text: string;
  className?: string;
  tag?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  duration?: number;
  onLetterAnimationComplete?: () => void;
};

export function SplitText({
  text,
  className = "",
  tag = "h1",
  delay = 38,
  duration = 0.62,
  onLetterAnimationComplete,
}: SplitTextProps) {
  const root = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const Tag = tag;

  useGSAP(() => {
    if (reducedMotion || !root.current) return;
    const context = gsap.context(() => {
      const targets = root.current?.querySelectorAll(".split-text__character");
      if (!targets?.length) return;
      gsap.fromTo(
        targets,
        { opacity: 0, yPercent: 84, rotate: 4 },
        {
          opacity: 1,
          yPercent: 0,
          rotate: 0,
          duration,
          ease: "power3.out",
          stagger: delay / 1000,
          onComplete: onLetterAnimationComplete,
        },
      );
    }, root);
    return () => context.revert();
  }, { scope: root, dependencies: [delay, duration, reducedMotion, text] });

  return (
    <Tag ref={root as never} className={"split-text " + className}>
      {words.map((word, wordIndex) => (
        word.trim()
          ? (
            <span className="split-text__word" key={word + wordIndex}>
              {Array.from(word).map((character, characterIndex) => (
                <span className="split-text__clip" key={character + characterIndex}>
                  <span className="split-text__character">{character}</span>
                </span>
              ))}
            </span>
          )
          : word
      ))}
    </Tag>
  );
}

type ScrollRevealProps = {
  children: string;
  className?: string;
  baseOpacity?: number;
  enableBlur?: boolean;
  blurStrength?: number;
};

export function ScrollReveal({
  children,
  className = "",
  baseOpacity = 0.18,
  enableBlur = true,
  blurStrength = 7,
}: ScrollRevealProps) {
  const root = useRef<HTMLHeadingElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const words = useMemo(() => children.split(/(\s+)/), [children]);

  useGSAP(() => {
    if (reducedMotion || !root.current) return;
    const context = gsap.context(() => {
      const wordsToReveal = root.current?.querySelectorAll(".scroll-reveal__word");
      if (!wordsToReveal?.length) return;
      gsap.fromTo(
        wordsToReveal,
        { opacity: baseOpacity, filter: enableBlur ? "blur(" + blurStrength + "px)" : "none", y: 18 },
        {
          opacity: 1,
          filter: "blur(0px)",
          y: 0,
          stagger: 0.045,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 82%",
            end: "bottom 55%",
            scrub: true,
          },
        },
      );
    }, root);
    return () => context.revert();
  }, { scope: root, dependencies: [baseOpacity, blurStrength, children, enableBlur, reducedMotion] });

  return (
    <h2 ref={root} className={"scroll-reveal " + className}>
      {words.map((word, index) => (
        word.trim()
          ? <span className="scroll-reveal__word" key={word + index}>{word}</span>
          : word
      ))}
    </h2>
  );
}

type SpotlightCardProps = {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
};

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgb(1 114 228 / 0.12)",
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--spotlight-x", event.clientX - rect.left + "px");
    card.style.setProperty("--spotlight-y", event.clientY - rect.top + "px");
  };

  return (
    <div
      ref={ref}
      className={"card-spotlight " + className}
      style={{ "--spotlight-color": spotlightColor } as CssVariables}
      onPointerMove={handlePointerMove}
    >
      {children}
    </div>
  );
}

type LineSidebarProps = {
  items: readonly string[];
  activeIndex?: number;
  onItemClick: (index: number, label: string) => void;
  className?: string;
};

export function LineSidebar({
  items,
  activeIndex = 0,
  onItemClick,
  className = "",
}: LineSidebarProps) {
  const list = useRef<HTMLUListElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const setEffect = (pointerY: number | undefined) => {
    for (const item of itemsRef.current) {
      if (!item) continue;
      const rect = item.getBoundingClientRect();
      const distance = pointerY === undefined ? Number.POSITIVE_INFINITY : Math.abs(pointerY - (rect.top + rect.height / 2));
      const effect = Math.max(0, 1 - distance / 112);
      item.style.setProperty("--line-effect", effect.toFixed(3));
    }
  };

  return (
    <nav className={"line-sidebar " + className} aria-label="Research categories">
      <ul
        ref={list}
        className="line-sidebar__list"
        onPointerMove={(event) => setEffect(event.clientY)}
        onPointerLeave={() => setEffect(undefined)}
      >
        {items.map((label, index) => (
          <li key={label}>
            <button
              ref={(element) => { itemsRef.current[index] = element; }}
              className={index === activeIndex ? "line-sidebar__item active" : "line-sidebar__item"}
              aria-current={index === activeIndex ? "page" : undefined}
              type="button"
              onClick={() => onItemClick(index, label)}
            >
              <span className="line-sidebar__marker" aria-hidden="true" />
              <span className="line-sidebar__number">{String(index + 1).padStart(2, "0")}</span>
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type TiltedCardProps = {
  children?: ReactNode;
  imageSrc?: string;
  altText?: string;
  className?: string;
  rotateAmplitude?: number;
  scaleOnHover?: number;
};

export function TiltedCard({
  children,
  imageSrc,
  altText = "",
  className = "",
  rotateAmplitude = 5,
  scaleOnHover = 1.02,
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const rotateX = useSpring(useMotionValue(0), { damping: 28, stiffness: 150, mass: 0.8 });
  const rotateY = useSpring(useMotionValue(0), { damping: 28, stiffness: 150, mass: 0.8 });
  const scale = useSpring(1, { damping: 28, stiffness: 150, mass: 0.8 });

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    rotateX.set(y * -rotateAmplitude);
    rotateY.set(x * rotateAmplitude);
  };

  const reset = () => {
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.article
      ref={ref}
      className={"tilted-card " + className}
      style={{ rotateX, rotateY, scale }}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => !reduceMotion && scale.set(scaleOnHover)}
      onPointerLeave={reset}
    >
      {imageSrc ? <img src={imageSrc} alt={altText} /> : children}
      <span className="tilted-card__reflection" aria-hidden="true" />
    </motion.article>
  );
}

type SpecularButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
};

export function SpecularButton({
  children,
  className = "",
  size = "md",
  ...props
}: SpecularButtonProps) {
  return (
    <button {...props} className={"specular-button specular-button--" + size + " " + className}>
      <span className="specular-button__shine" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </button>
  );
}
