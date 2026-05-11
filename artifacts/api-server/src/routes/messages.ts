import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any): number | null {
  const uid = (req.session as any)?.userId;
  if (!uid) { res.status(401).json({ error: "Not authenticated" }); return null; }
  return uid;
}

// Get inbox: latest message per conversation partner + unread count
router.get("/messages/threads", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const result = await db.execute(sql`
    WITH last_msg AS (
      SELECT
        CASE WHEN sender_id = ${userId} THEN recipient_id ELSE sender_id END AS partner_id,
        MAX(created_at) AS last_at
      FROM messages
      WHERE sender_id = ${userId} OR recipient_id = ${userId}
      GROUP BY partner_id
    )
    SELECT
      lm.partner_id AS "partnerId",
      u.name AS "partnerName",
      u.role AS "partnerRole",
      lm.last_at AS "lastAt",
      (SELECT body FROM messages m
        WHERE ((m.sender_id = ${userId} AND m.recipient_id = lm.partner_id)
            OR (m.sender_id = lm.partner_id AND m.recipient_id = ${userId}))
        ORDER BY m.created_at DESC LIMIT 1) AS "lastBody",
      (SELECT count(*)::int FROM messages m
        WHERE m.sender_id = lm.partner_id AND m.recipient_id = ${userId} AND m.is_read = false) AS "unreadCount"
    FROM last_msg lm
    JOIN users u ON u.id = lm.partner_id
    ORDER BY lm.last_at DESC
  `);
  res.json(result.rows ?? []);
});

router.get("/messages/with/:partnerId", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const partnerId = parseInt(req.params.partnerId, 10);
  const rows = await db.select({
      id: messagesTable.id,
      senderId: messagesTable.senderId,
      recipientId: messagesTable.recipientId,
      body: messagesTable.body,
      isRead: messagesTable.isRead,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .where(or(
      and(eq(messagesTable.senderId, userId), eq(messagesTable.recipientId, partnerId)),
      and(eq(messagesTable.senderId, partnerId), eq(messagesTable.recipientId, userId)),
    ))
    .orderBy(messagesTable.createdAt);
  // mark received as read
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(and(eq(messagesTable.senderId, partnerId), eq(messagesTable.recipientId, userId), eq(messagesTable.isRead, false)));
  res.json(rows);
});

router.post("/messages", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const { recipientId, body } = req.body;
  if (!recipientId || !body) { res.status(400).json({ error: "recipientId and body required" }); return; }
  if (recipientId === userId) { res.status(400).json({ error: "Cannot message yourself" }); return; }
  const [m] = await db.insert(messagesTable).values({ senderId: userId, recipientId, body }).returning();
  res.status(201).json(m);
});

router.get("/messages/unread-count", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(and(eq(messagesTable.recipientId, userId), eq(messagesTable.isRead, false)));
  res.json({ count: row?.count ?? 0 });
});

// Search users to message
router.get("/messages/contacts", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const q = (req.query.q as string) ?? "";
  const rows = await db.execute(sql`
    SELECT id, name, email, role
    FROM users
    WHERE id <> ${userId}
      AND (name ILIKE ${'%' + q + '%'} OR email ILIKE ${'%' + q + '%'})
    ORDER BY name
    LIMIT 20
  `);
  res.json(rows.rows ?? []);
});

export default router;
