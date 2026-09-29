import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "gold" | "outline" | "ghost" | "line";
const styles: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink-soft",
  gold: "bg-gold text-white hover:bg-gold-deep",
  outline: "border border-ink/80 text-ink hover:bg-ink hover:text-ivory",
  ghost: "text-ink hover:bg-ink/5",
  line: "bg-[#2e9d5b] text-white hover:bg-[#258049]",
};
const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-[15px]", lg: "h-14 px-7 text-base" };

type Props = {
  href?: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: keyof typeof sizes;
  icon?: IconName;
  className?: string;
  external?: boolean;
  full?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function CTAButton({ href, children, variant = "primary", size = "md", icon, className, external, full, ...rest }: Props) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-wider whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none",
    styles[variant],
    sizes[size],
    full && "w-full",
    className,
  );
  const inner = (
    <>
      {icon && <Icon name={icon} className="h-[1.1em] w-[1.1em]" />}
      <span>{children}</span>
    </>
  );
  if (href) {
    if (external || /^(https?:|tel:|mailto:)/.test(href)) {
      return (
        <a href={href} className={cls} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {inner}
    </button>
  );
}
