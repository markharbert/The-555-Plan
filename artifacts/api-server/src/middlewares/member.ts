import { getAuth } from "@clerk/express";
import { db, usersTable, loginSessionsTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { event } from "../lib/events";

export async function requireIdentity(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth.userId) { res.status(401).json({ error: "Please sign in to continue." }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
  if (user && !user.active) { res.status(403).json({ error: "Your account is inactive. Please contact Mark's team." }); return; }
  if (user) {
    res.locals.member = user;
    if (auth.sessionId) {
      await db.transaction(async tx => {
        const inserted = await tx.insert(loginSessionsTable).values({
          sessionId: auth.sessionId!, userId: user.id,
        }).onConflictDoNothing().returning();
        if (inserted.length) {
          await event(tx, user.id, "logged_in");
          await tx.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));
        }
      });
    }
    await db.update(usersTable).set({ lastActiveAt: new Date() })
      .where(and(eq(usersTable.id, user.id), lt(usersTable.lastActiveAt, new Date(Date.now() - 60000))));
  }
  next();
}

export function requireMember(_req: Request, res: Response, next: NextFunction) {
  if (!res.locals.member) { res.status(403).json({ error: "Finish setting up your account first." }); return; }
  next();
}
