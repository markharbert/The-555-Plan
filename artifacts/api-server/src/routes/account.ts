import { Router, type IRouter } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db, usersTable, type AppUser, type ProfileAnswers } from "@workspace/db";
import { EnrollBody, EnrollResponse, GetMeResponse, UpdateProfileBody, UpdateProfileResponse, GetSettingsResponse } from "@workspace/api-zod";
import { requireMember } from "../middlewares/member";
import { event, enqueueSync } from "../lib/events";
import { getProgram, publicProfile } from "../lib/journey";
import { clickfunnelsConfigured } from "../lib/clickfunnels";

const router: IRouter = Router();
const enrollLimit = rateLimit({ windowMs: 3600000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Please wait a little before trying again." } });

router.get("/me", (_req, res) => {
  const user = res.locals.member as AppUser | undefined;
  res.json(GetMeResponse.parse(user ? { enrolled: true, profile: publicProfile(user) } : { enrolled: false }));
});

router.post("/enroll", enrollLimit, async (req, res): Promise<void> => {
  const parsed = EnrollBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.emailConsent || !parsed.data.firstName.trim() || !parsed.data.lastName.trim()) {
    res.status(400).json({ error: "Add your first and last name and agree to receive emails from Mark." }); return;
  }
  const { userId } = getAuth(req);
  if (res.locals.member) { res.json(EnrollResponse.parse(publicProfile(res.locals.member))); return; }
  const identity = await clerkClient.users.getUser(userId!);
  const emailAddress = identity.emailAddresses.find(e => e.id === identity.primaryEmailAddressId);
  if (!emailAddress || emailAddress.verification?.status !== "verified") {
    res.status(400).json({ error: "Please verify your email address before continuing." }); return;
  }
  const email = emailAddress.emailAddress.trim().toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  const utm = Object.fromEntries(Object.entries(parsed.data.utm ?? {})
    .filter(([k, v]) => /^utm_(source|medium|campaign|term|content)$/.test(k) && v.length <= 500));
  try {
    const user = await db.transaction(async tx => {
      const [created] = await tx.insert(usersTable).values({
        id: userId!, firstName: parsed.data.firstName.trim(), lastName: parsed.data.lastName.trim(),
        email, emailConsent: true, role: adminEmails.includes(email) ? "admin" : "user",
        source: parsed.data.source || "direct", utm,
      }).onConflictDoNothing().returning();
      if (!created) {
        const [existing] = await tx.select().from(usersTable).where(eq(usersTable.id, userId!));
        return existing;
      }
      await event(tx, created.id, "registered");
      await enqueueSync(tx, created.id, "registered");
      return created;
    });
    if (!user) { res.status(409).json({ error: "This email already has an account. Please log in." }); return; }
    res.json(EnrollResponse.parse(publicProfile(user)));
  } catch (error) {
    req.log.error({ code: (error as { code?: string }).code }, "Enrollment failed");
    res.status(503).json({ error: "We couldn't finish your account setup. Please try again." });
  }
});

router.patch("/profile", requireMember, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Please check your answers and try again." }); return; }
  const data = parsed.data;
  const program = await getProgram();
  if (data.fears?.some(f => !program.fears.includes(f)) || data.pockets?.some(p => !["morning", "lunch break", "evening", "weekends", "Morning", "Lunch break", "Evening", "Weekends"].includes(p))) {
    res.status(400).json({ error: "Choose one of the listed options." }); return;
  }
  const result = await db.transaction(async tx => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, res.locals.member.id)).for("update");
    if (!user) return { error: "Account not found." };
    const answers: ProfileAnswers = { ...user.answers };
    for (const key of ["fears", "business", "audience", "why", "commitment", "pockets", "delegate", "notifications", "partner"] as const) {
      const value = data[key];
      if (value !== undefined) {
        if (key === "fears" || key === "pockets") answers[key] = [...new Set(value as string[])];
        else answers[key] = (value as string).trim();
      }
    }
    if ((data.firstName !== undefined && !data.firstName.trim()) || (data.lastName !== undefined && !data.lastName.trim())) return { error: "Your first and last name cannot be blank." };
    for (const key of ["welcomeDone", "fearCheckDone", "planDone", "mindsetDone"] as const) {
      if (user[key] && data[key] === false) return { error: "Your completed journey steps stay completed." };
    }
    // Each transition requires the previous step to have been saved already.
    if (data.fearCheckDone && !user.welcomeDone) return { error: "Finish Welcome before your Fear Check." };
    if (data.fearCheckDone && !(data.baselineComfort ?? user.baselineComfort)) return { error: "Choose your starting comfort score." };
    if (user.fearCheckDone && data.baselineComfort !== undefined && data.baselineComfort !== user.baselineComfort) return { error: "Your starting score stays the same so you can see your growth." };
    if (data.planDone && !user.fearCheckDone) return { error: "Finish your Fear Check before your video plan." };
    if (data.planDone && (!answers.business || !answers.audience || !answers.commitment || !answers.pockets.length)) return { error: "Tell us what you do, who you reach, and when you'll practice." };
    if (data.mindsetDone && !user.planDone) return { error: "Finish your video plan before Mindset." };
    const [updated] = await tx.update(usersTable).set({
      answers,
      ...(data.firstName !== undefined ? { firstName: data.firstName.trim() } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName.trim() } : {}),
      ...(data.baselineComfort !== undefined ? { baselineComfort: data.baselineComfort } : {}),
      ...(data.welcomeDone !== undefined ? { welcomeDone: data.welcomeDone } : {}),
      ...(data.fearCheckDone !== undefined ? { fearCheckDone: data.fearCheckDone } : {}),
      ...(data.planDone !== undefined ? { planDone: data.planDone } : {}),
      ...(data.mindsetDone !== undefined ? { mindsetDone: data.mindsetDone } : {}),
    }).where(eq(usersTable.id, user.id)).returning();
    if (!updated) return { error: "Account not found." };
    for (const key of ["welcomeDone", "fearCheckDone", "planDone", "mindsetDone"] as const) {
      if (!user[key] && updated[key]) await event(tx, user.id, `${key.replace("Done", "")}_completed`);
    }
    if (!user.mindsetDone && updated.mindsetDone) {
      await event(tx, user.id, "onboarding_completed");
      await enqueueSync(tx, user.id, "onboarding");
    }
    if (updated.firstName !== user.firstName || updated.lastName !== user.lastName) {
      // A new unique kind lets every profile edit be retried independently.
      await enqueueSync(tx, user.id, `profile_${crypto.randomUUID()}`);
    }
    await event(tx, user.id, "profile_saved");
    return { user: updated };
  });
  if ("error" in result) { res.status(400).json({ error: result.error }); return; }
  res.json(UpdateProfileResponse.parse(publicProfile(result.user)));
});

router.get("/settings", requireMember, (_req, res) => {
  const user = res.locals.member as AppUser;
  res.json(GetSettingsResponse.parse({
    profile: publicProfile(user), emailConsent: user.emailConsent,
    clickfunnelsConfigured: clickfunnelsConfigured(), phase: 2,
  }));
});

export default router;
