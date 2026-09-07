import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto mb-12 max-w-2xl text-center", className)}>
      <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="text-3xl leading-tight font-medium tracking-[-0.04em] sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        {description}
      </p>
    </div>
  );
}
