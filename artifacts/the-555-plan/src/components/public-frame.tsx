import { type ReactNode } from 'react';
import { Link } from 'wouter';
import { Btn, MarkLogo, TextLink, Wordmark } from '@/components/brand';

export function PublicHeader() {
  return (
    <header className="border-b border-coolgray bg-white">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" data-testid="link-logo"><Wordmark className="text-[20px]" /></Link>
        <div className="flex items-center gap-5">
          <TextLink href="/sign-in" className="hidden sm:inline">Sign in</TextLink>
          <Btn href="/sign-up" className="!min-h-[44px] !px-5 !py-2 !text-[14px]" data-testid="button-setup-top">Set Up My Account</Btn>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-navy px-5 py-14 text-white sm:px-8">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-4">
          <MarkLogo className="h-12" />
          <p className="max-w-[420px] text-[15px] text-white/70">The 555 Plan is a personal coaching space by Mark Harbert. Your practice stays yours.</p>
        </div>
        <div className="flex gap-6 text-[15px]">
          <TextLink href="/privacy" onNavy>Privacy</TextLink>
          <TextLink href="/sign-in" onNavy>Sign in</TextLink>
          <a href="https://markharbert.com" target="_blank" rel="noreferrer" className="text-sky underline underline-offset-4">markharbert.com</a>
        </div>
      </div>
    </footer>
  );
}

export function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-white">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
