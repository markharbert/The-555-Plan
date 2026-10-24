import { type ComponentType, type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MemberGate } from '@/components/member-gate';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import { SignInPage, SignUpPage } from '@/pages/auth';
import Enroll from '@/pages/enroll';
import Privacy from '@/pages/privacy';
import Dashboard from '@/pages/dashboard';
import { Welcome, FearCheck } from '@/pages/steps';
import VideoPlan from '@/pages/video-plan';
import Mindset from '@/pages/mindset';
import Round from '@/pages/round';
import MissionPage from '@/pages/mission';
import { Videos, ProgressPage, FuturePage } from '@/pages/misc';
import SettingsPage from '@/pages/settings';
import { basePath } from '@/lib/base';

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#D5180C',
    colorForeground: '#1A1F3C',
    colorMutedForeground: '#5E6680',
    colorDanger: '#B5140A',
    colorBackground: '#FFFFFF',
    colorInput: '#FFFFFF',
    colorInputForeground: '#1A1F3C',
    colorNeutral: '#1A1F3C',
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px',
  },
  elements: {
    rootBox: 'w-full min-w-0 max-w-full flex justify-center',
    cardBox: 'bg-white rounded-xl border border-[#DCE3EC] w-full min-w-0 max-w-[440px] overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: { fontFamily: 'Inter Tight, sans-serif', fontWeight: 800, textTransform: 'uppercase', color: '#06092A' },
    headerSubtitle: { color: '#5E6680' },
    socialButtonsBlockButtonText: { color: '#1A1F3C', fontWeight: 600 },
    formFieldLabel: { color: '#1A1F3C', fontWeight: 600 },
    footerActionLink: { color: '#2073AC', textDecoration: 'underline', fontWeight: 600 },
    footerActionText: { color: '#5E6680' },
    dividerText: { color: '#5E6680' },
    identityPreviewEditButton: { color: '#2073AC', textDecoration: 'underline' },
    formFieldSuccessText: { color: '#004566' },
    alertText: { color: '#1A1F3C' },
    logoBox: 'mb-2',
    logoImage: 'h-9',
    socialButtonsBlockButton: 'border border-[#DCE3EC] rounded-lg',
    formButtonPrimary: { fontFamily: 'Inter Tight, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', minHeight: '48px', boxShadow: 'none', backgroundImage: 'none' },
    formFieldInput: 'rounded-lg border border-[#B9C4D4]',
    footerAction: '',
    dividerLine: 'bg-[#DCE3EC]',
    alert: 'rounded-lg',
    otpCodeFieldInput: 'rounded-lg',
    formFieldRow: '',
    main: '',
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Landing /></Show>
    </>
  );
}

function member(Page: ComponentType): () => ReactNode {
  return function MemberPage() {
    return <MemberGate><Page /></MemberGate>;
  };
}

const MDashboard = member(Dashboard);
const MWelcome = member(Welcome);
const MFear = member(FearCheck);
const MPlan = member(VideoPlan);
const MMindset = member(Mindset);
const MRound = member(Round);
const MMission = member(MissionPage);
const MVideos = member(Videos);
const MProgress = member(ProgressPage);
const MSettings = member(SettingsPage);
const MFirst = member(() => <FuturePage kind="first" />);
const MChallenge = member(() => <FuturePage kind="challenge" />);

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to continue your 555 Plan' } },
        signUp: { start: { title: 'Set up your account', subtitle: 'Your no-cost account takes about a minute' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <ErrorBoundaryRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function ErrorBoundaryRoutes() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/enroll" component={Enroll} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/dashboard" component={MDashboard} />
        <Route path="/welcome" component={MWelcome} />
        <Route path="/fear-check" component={MFear} />
        <Route path="/video-plan" component={MPlan} />
        <Route path="/mindset" component={MMindset} />
        <Route path="/round/:round" component={MRound} />
        <Route path="/mission/:id" component={MMission} />
        <Route path="/first-public-video" component={MFirst} />
        <Route path="/challenge" component={MChallenge} />
        <Route path="/videos" component={MVideos} />
        <Route path="/progress" component={MProgress} />
        <Route path="/settings" component={MSettings} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
