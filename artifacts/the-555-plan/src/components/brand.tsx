import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Lock, RotateCcw } from 'lucide-react';
import { asset } from '@/lib/base';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-display font-bold uppercase tracking-[0.04em] transition-[background-color,transform,color] duration-200 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none text-center';
const variants = {
  primary: 'bg-brand-red text-white hover:bg-red-hover min-h-[52px] px-8 py-4 text-[16px]',
  secondary: 'bg-white text-navy border-2 border-navy hover:bg-coolwhite min-h-[52px] px-8 py-4 text-[16px]',
  onNavy: 'bg-navy text-white border-2 border-white/30 hover:border-white min-h-[52px] px-8 py-4 text-[16px]',
  small: 'bg-white text-navy border-2 border-coolgray hover:border-navy min-h-[40px] px-4 py-2 text-[13px]',
};

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  href?: string;
};

export function Btn({ variant = 'primary', href, className = '', children, ...rest }: BtnProps) {
  const cls = `${base} ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} data-testid={rest['data-testid' as keyof typeof rest] as string | undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

export function TextLink({ href, children, onNavy = false, className = '' }: { href: string; children: ReactNode; onNavy?: boolean; className?: string }) {
  return (
    <Link href={href} className={`underline underline-offset-4 font-medium ${onNavy ? 'text-sky' : 'text-linkblue'} hover:opacity-80 ${className}`}>
      {children}
    </Link>
  );
}

export function Wordmark({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <span className={`font-display font-extrabold uppercase tracking-tight leading-none ${light ? 'text-white' : 'text-navy'} ${className}`}>
      The <span className="text-sky">555</span> Plan
    </span>
  );
}

export function MarkLogo({ className = 'h-10' }: { className?: string }) {
  return <img src={asset('mark-harbert-logo.png')} alt="Mark Harbert" className={`w-auto ${className}`} />;
}

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string; 'data-testid'?: string }) {
  return <div className={`rounded-xl border border-coolgray bg-white ${className}`} {...rest}>{children}</div>;
}

export function PageHeader({ eyebrow, title, intro, step }: { eyebrow?: string; title: string; intro?: string; step?: number }) {
  return (
    <header className="rise mb-10 max-w-[680px]">
      {eyebrow && <p className="eyebrow mb-3">{step ? `Step ${step} · ` : ''}{eyebrow}</p>}
      <h1 className="h-display text-[34px] sm:text-[44px]">{title}</h1>
      {intro && <p className="mt-4 text-slate-brand">{intro}</p>}
    </header>
  );
}

export function ProgressBar({ value, tone = 'navy', className = 'h-2' }: { value: number; tone?: 'navy' | 'sky'; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full overflow-hidden rounded-full ${tone === 'sky' ? 'bg-white/15' : 'bg-coolgray'} ${className}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill h-full w-full rounded-full ${tone === 'sky' ? 'bg-sky' : 'bg-navy'}`} style={{ transform: `scaleX(${v / 100})` }} />
    </div>
  );
}

export function AnimatedCheck({ size = 28, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${filled ? 'bg-teal-brand text-white' : 'border-2 border-teal-brand text-teal-brand'}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
      </svg>
    </span>
  );
}

export function Burst() {
  const dots = Array.from({ length: 16 });
  const colors = ['bg-sky', 'bg-teal-brand', 'bg-navy', 'bg-coolgray'];
  return (
    <div className="pointer-events-none absolute left-1/2 top-10 h-0 w-0" aria-hidden>
      {dots.map((_, i) => {
        const a = (i / dots.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className={`absolute h-2 w-2 rounded-full ${colors[i % colors.length]}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 110, y: Math.sin(a) * 80, opacity: 0, scale: 0.4 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}

export function Skel({ className = '' }: { className?: string }) {
  return <div className={`skel ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skel className="h-5 w-32" />
      <Skel className="h-12 w-3/4 max-w-[520px]" />
      <Skel className="h-40 w-full" />
      <Skel className="h-64 w-full" />
    </div>
  );
}

export function ErrorState({ message = 'We could not load this just now.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Card className="mx-auto max-w-[560px] p-8 text-center">
      <AlertCircle className="mx-auto mb-4 h-8 w-8 text-teal-brand" strokeWidth={1.75} />
      <h2 className="h-display text-[22px]">Something got in the way</h2>
      <p className="mt-2 text-slate-brand">{message} Your progress is safe.</p>
      {onRetry && (
        <div className="mt-6">
          <Btn variant="secondary" onClick={onRetry} data-testid="button-retry">
            <RotateCcw className="h-4 w-4" strokeWidth={2} /> Try again
          </Btn>
        </div>
      )}
    </Card>
  );
}

export function LockedPanel({ title = 'Not open yet', message, to, label = 'Go to your next step' }: { title?: string; message: string; to?: string; label?: string }) {
  return (
    <Card className="rise mx-auto max-w-[620px] p-8 sm:p-10">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-coolwhite text-navy">
        <Lock className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h1 className="h-display text-[28px]">{title}</h1>
      <p className="mt-3 text-slate-brand">{message}</p>
      {to && (
        <div className="mt-8">
          <Btn href={to} data-testid="link-locked-next">
            {label}
          </Btn>
        </div>
      )}
    </Card>
  );
}

export function Tick({ className = '' }: { className?: string }) {
  return <Check className={className} strokeWidth={2.5} />;
}
