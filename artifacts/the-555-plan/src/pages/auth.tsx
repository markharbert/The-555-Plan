import { SignIn, SignUp } from '@clerk/react';
import { Link } from 'wouter';
import { MarkLogo, Wordmark } from '@/components/brand';
import { basePath } from '@/lib/base';

function Frame({ children, line }: { children: React.ReactNode; line: string }) {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[minmax(380px,0.8fr)_1.2fr]">
      <div className="flex min-w-0 flex-col justify-between bg-navy px-8 py-10 text-white sm:px-12 lg:py-14">
        <Link href="/"><Wordmark light className="text-[24px]" /></Link>
        <div className="my-10 max-w-[420px] lg:my-0">
          <h1 className="h-display !text-white text-[34px] sm:text-[44px]">{line}</h1>
          <p className="mt-5 text-white/75">Fifteen small video missions. A private place to practice. One clear next step every time you return.</p>
        </div>
        <MarkLogo className="h-12 self-start" />
      </div>
      <div className="flex min-w-0 items-center justify-center bg-coolwhite px-4 py-12">{children}</div>
    </div>
  );
}

export function SignInPage() {
  return (
    <Frame line="Welcome back. Pick up where you left off">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/dashboard`} />
    </Frame>
  );
}

export function SignUpPage() {
  return (
    <Frame line="Set up your no-cost account and start your 555 Plan today">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/enroll`} />
    </Frame>
  );
}
