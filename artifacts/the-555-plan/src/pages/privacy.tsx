import { PublicFrame } from '@/components/public-frame';
import { TextLink } from '@/components/brand';

const blocks = [
  ['Your practice videos', 'In this first release the app does not record video. When recording arrives, your practice videos will stay in your own browser and will never be uploaded to our servers.'],
  ['What we collect', 'Your name and email, the answers you give in Fear Check and My Video Plan, which missions you finish, and how each one felt. We use this to show your progress and guide your next step.'],
  ['Email', 'You agreed to receive emails from Mark Harbert when you set up your account. Every email carries a way to opt out.'],
  ['How we remember you', 'We use a secure sign-in cookie so you stay signed in. We keep your progress so you can return on any device.'],
  ['Who can see your data', 'Only you can see your answers and scores. Mark sees account level information to support the program.'],
];

export default function Privacy() {
  return (
    <PublicFrame>
      <div className="mx-auto max-w-[680px] px-5 py-20 sm:px-8">
        <p className="eyebrow mb-3">Privacy</p>
        <h1 className="h-display text-[38px] sm:text-[52px]">Your practice stays yours</h1>
        <div className="mt-12 space-y-10">
          {blocks.map(([t, b]) => (
            <section key={t}><h2 className="font-display text-[20px] font-bold uppercase text-navy">{t}</h2><p className="mt-2 text-slate-brand">{b}</p></section>
          ))}
        </div>
        <p className="mt-12"><TextLink href="/">Back to the home page</TextLink></p>
      </div>
    </PublicFrame>
  );
}
