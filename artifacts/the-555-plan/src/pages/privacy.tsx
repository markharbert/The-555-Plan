import { PublicFrame } from '@/components/public-frame';
import { TextLink } from '@/components/brand';

const blocks = [
  ['Your practice videos', 'Your camera and microphone are used only when you press Enable Camera on a mission page, and the camera shows a live preview that only you see. Videos and thumbnails are saved in this browser on this computer, in storage tied to your account. They are never uploaded to our servers, and they do not sync to other devices. Logging out does not delete them. Clearing your browser data or site data does, so download any video you want to keep.'],
  ['What we log about recordings', 'We save small details only: which mission you recorded, how long a kept take ran, when, whether it is your favorite, and when you downloaded or deleted it. We also log when you start a recording. These details power your counts on My Journey. We never receive the video itself.'],
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
