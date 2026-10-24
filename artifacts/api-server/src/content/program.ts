// Single editable source for the coaching content. Admin overrides are stored in app_settings.
export const fearOptions = [
  "Being judged by others", "Being vulnerable", "Not knowing what to say",
  "Negative comments and trolls", "Perfectionism (it has to be just right)", "Not being techie",
];

export const rounds = [
  { id: 1, name: "Just Me", intro: "These five videos are for your eyes only. Nobody else sees them. Keep each one to 1 minute or less. The goal is simple: get comfortable on camera.", maxSeconds: 60 },
  { id: 2, name: "Test Group", intro: "Now you'll post five 1-minute videos in a private Facebook group where you are the only member. Still private, but you're building the habit of hitting post.", maxSeconds: 60 },
  { id: 3, name: "Going Live", intro: "Five short live videos, 1 to 2 minutes each, in your private test group. Do a practice take here first if you want, then go live on Facebook.", maxSeconds: 120 },
];

const topics = [
  { title: "Share your why", prompt: "Share the passion and reasons driving your business.", cues: ["The moment you decided to start", "Who you're doing this for", "What life looks like when it works", "One word that sums up your why"] },
  { title: "A peek into your day", prompt: "Share a snapshot of your daily life with a personal touch.", cues: ["One ordinary moment from today", "What makes that moment yours", "A small detail people might relate to", "Something you're looking forward to"] },
  { title: "A book that shaped you", prompt: "Talk about a book that changed your life or business.", cues: ["The book and how you found it", "One idea that stayed with you", "How you put that idea into practice", "Who you would recommend it to"] },
  { title: "A hobby that sparks you", prompt: "Share something that recharges and inspires you.", cues: ["What you love doing outside work", "How you got started", "Why it helps you recharge", "One small way to try it"] },
  { title: "A challenge you overcame", prompt: "Share a personal challenge and how you got through it.", cues: ["A challenge you're comfortable sharing", "The first step you took", "Someone or something that helped", "What you learned about yourself"] },
  { title: "Your biggest business lesson", prompt: "Share a lesson that changed how you approach your business.", cues: ["Something you once believed about business", "The experience that changed your mind", "What you do differently now", "One takeaway for someone getting started"] },
  { title: "A mentor who made a difference", prompt: "Tell us about someone whose guidance helped you grow.", cues: ["Who helped you see things differently", "One piece of advice they shared", "A moment you used that advice", "Why you're grateful for their influence"] },
  { title: "Advice to your earlier self", prompt: "Share what you wish you knew when you started.", cues: ["Where you were when you started", "Something you worried about unnecessarily", "The advice you needed to hear", "What you would tell a beginner today"] },
  { title: "Your go-to productivity tip", prompt: "Share one simple habit that helps you get things done.", cues: ["A distraction that used to slow you down", "The small change that helped", "How you make that habit stick", "A simple way someone could try it"] },
  { title: "Something you're learning right now", prompt: "Share something new you're exploring in your life or business.", cues: ["The skill or idea you're exploring", "Why it caught your attention", "Something surprising you've learned", "Your next small step"], alternateTitle: "Why building an email list matters", alternateCues: ["Why staying connected to your audience matters", "What you share with your email community", "A simple way to start a list", "One lesson from growing your audience"] },
  { title: "Your morning routine", prompt: "Share how you start your day.", cues: ["The first thing you do each morning", "A habit that helps you feel grounded", "How your routine changes on busy days", "One thing you would like to improve"] },
  { title: "Work-life harmony", prompt: "Share how you balance it all, or how you're trying to.", cues: ["What balance looks like in your life", "A boundary you're learning to set", "What still feels like a work in progress", "One small change that has helped"] },
  { title: "Your favorite quote", prompt: "Share a quote that guides you and why.", cues: ["The quote and who said it", "When you first heard it", "A moment it helped you through", "What it means to you today"] },
  { title: "Learning on the go", prompt: "Talk about a new skill you're picking up in your business.", cues: ["A skill you're practicing in your business", "How you fit learning into your day", "One mistake that taught you something", "What progress looks like right now"] },
  { title: "Your values in business", prompt: "Share how your personal values or faith shape your decisions.", cues: ["A value that matters most to you", "Where that value comes from", "A decision it helped you make", "How you want others to feel working with you"] },
];

export const missions = topics.map((topic, i) => ({
  ...topic, id: i + 1, round: Math.floor(i / 5) + 1, position: i % 5 + 1,
  maxSeconds: i < 10 ? 60 : 120,
  completed: false, unlocked: false, canUndo: false,
  feelingScore: null as number | null, completedAt: null as string | null, posted: false, wentLive: false,
}));

export const mindset = [
  { id: 1, title: "It's about them, not you.", body: 'Every viewer speaks one language: "What\'s in it for me?" When you focus on helping the person watching, the fear gets quieter.', fears: [fearOptions[0]!] },
  { id: 2, title: "Not everyone will like you. Good.", body: "Good marketing attracts the right people and repels the rest. If 100 people watch and 2 respond, your video did its job.", fears: [fearOptions[0]!] },
  { id: 3, title: "Vulnerable is relatable.", body: "Share real challenges you've faced. People connect with what they can relate to. Use good judgment on what stays private.", fears: [fearOptions[1]!] },
  { id: 4, title: "You already know what to say.", body: "You could talk about your passion for hours with a friend. The red light on the camera doesn't change what you know.", fears: [fearOptions[2]!] },
  { id: 5, title: "Trolls are about them.", body: "People who attack you usually aren't at peace with themselves. Have compassion, then block and delete. Blocking and deleting is a money-making activity.", fears: [fearOptions[3]!] },
  { id: 6, title: "Lock in who you are.", body: 'When you know your identity, comments can\'t shake it. Watch your "I am" and "I always" statements. What you focus on grows.', fears: [fearOptions[0]!, fearOptions[3]!] },
  { id: 7, title: "Perfectionism is a cover for insecurity.", body: "Imperfect action beats perfect inaction every single day. You can't steer a parked car.", fears: [fearOptions[4]!] },
  { id: 8, title: "Embrace the suck.", body: "Your first video will be bad. So was everyone's. Jump out of the plane and figure out the parachute on the way down.", fears: [fearOptions[4]!, fearOptions[1]!] },
  { id: 9, title: "You don't need to be techie.", body: "If you can post a photo, you can post a video. Same button.", fears: [fearOptions[5]!] },
];

export const defaultProgram = { rounds, missions, mindset, fears: fearOptions };
export const defaultTags: Record<string, string> = {
  registered: "555 Plan - Registered",
  onboarding: "555 Plan - Onboarding Done",
  round1: "555 Plan - Round 1 Done",
  round2: "555 Plan - Round 2 Done",
  round3: "555 Plan - Round 3 Done",
  graduated: "555 Plan - Graduated",
  challenge_started: "555 Plan - 30 Day Challenge Started",
  challenge_done: "555 Plan - 30 Day Challenge Done",
};
