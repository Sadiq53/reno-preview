/**
 * Central Notification Dispatcher & Realtime Event Bus
 * Handles in-app notifications, Server-Sent Events (SSE), and background Firebase Cloud Messaging (FCM).
 */

import prisma from "@/lib/db";
import { sendFcmNotification } from "@/lib/firebase-admin";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_STARTED"
  | "TASK_RESOLVED"
  | "COMMENT_CREATED"
  | "QUERY_REPLIED"
  | "PRIORITY_URGENT"
  | "PROJECT_ACCESS_GRANTED";

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  projectId?: string;
  userId?: string; // Target specific user, or omit to notify project team & admins
  includeAdmins?: boolean; // When notifying a specific user, also notify project admins
  excludeUserId?: string; // E.g. don't notify the person who triggered the action
  metadata?: Record<string, any>;
}

// Global SSE Subscriber Registry on globalThis across all Next.js API route modules
type SseSubscriber = (data: any) => void;

declare global {
  // eslint-disable-next-line no-var
  var __vanguardSseSubscribers: Map<string, Set<SseSubscriber>> | undefined;
  // eslint-disable-next-line no-var
  var __renoSseSubscribers: Map<string, Set<SseSubscriber>> | undefined;
}

const sseSubscribers: Map<string, Set<SseSubscriber>> =
  globalThis.__vanguardSseSubscribers ??
  (globalThis.__vanguardSseSubscribers = globalThis.__renoSseSubscribers || new Map());
globalThis.__renoSseSubscribers = sseSubscribers;

export function subscribeToRealtimeNotifications(
  userId: string,
  callback: SseSubscriber
): () => void {
  if (!sseSubscribers.has(userId)) {
    sseSubscribers.set(userId, new Set());
  }
  const set = sseSubscribers.get(userId)!;
  set.add(callback);

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      sseSubscribers.delete(userId);
    }
  };
}

/**
 * Returns number of active connected SSE streams for a user or globally
 */
export function getActiveSseSubscribersCount(userId?: string): number {
  if (userId) {
    return sseSubscribers.get(userId)?.size || 0;
  }
  let total = 0;
  for (const set of sseSubscribers.values()) {
    total += set.size;
  }
  return total;
}

/**
 * Dispatch notification to database, in-app SSE subscribers, and background FCM push
 */
export async function dispatchNotification(params: CreateNotificationParams): Promise<void> {
  const { type, title, message, link, projectId, userId, includeAdmins, excludeUserId, metadata } = params;

  try {
    const idSet = new Set<string>();

    if (userId) {
      // Direct user target (e.g. specifically assigned developer or targeted alert)
      const target = await prisma.user.findFirst({
        where: { id: userId, status: "ACTIVE" },
        select: { id: true },
      });
      if (target) {
        idSet.add(target.id);
      }

      // If requested or if no project scope, also notify active admins
      if (includeAdmins || !projectId) {
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN", status: "ACTIVE" },
          select: { id: true },
        });
        admins.forEach((a) => idSet.add(a.id));
      }
    } else if (projectId) {
      // General project broadcast (comments, unassigned tasks, project updates)
      // 1. All Active Admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });
      admins.forEach((a) => idSet.add(a.id));

      // 2. All Active Developers assigned to this project with valid, unrevoked access
      const [projectAssignments, taskAssignees] = await Promise.all([
        prisma.assignment.findMany({
          where: {
            projectId,
            user: { status: "ACTIVE" },
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: { userId: true },
        }),
        prisma.comment.findMany({
          where: {
            projectId,
            assigneeUserId: { not: null },
            assigneeUser: { status: "ACTIVE" },
          },
          select: { assigneeUserId: true },
        }),
      ]);

      projectAssignments.forEach((a) => idSet.add(a.userId));
      taskAssignees.forEach((t) => {
        if (t.assigneeUserId) idSet.add(t.assigneeUserId);
      });
    } else {
      // Global broadcast to active admins only when neither projectId nor userId is provided
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });
      admins.forEach((a) => idSet.add(a.id));
    }

    if (excludeUserId) {
      idSet.delete(excludeUserId);
    }

    const recipientUserIds = Array.from(idSet);
    if (recipientUserIds.length === 0) {
      return;
    }

    // Fetch recipient roles to apply privacy scoping (Client name anonymization for Developers)
    const activeRecipients = await prisma.user.findMany({
      where: { id: { in: recipientUserIds }, status: "ACTIVE" },
      select: { id: true, role: true },
    });

    if (activeRecipients.length === 0) {
      return;
    }

    const clientRawName = metadata?.clientName || metadata?.guestAuthorName;

    // 1. Create database notification records with scoped text per recipient role
    const createdNotifications = await Promise.all(
      activeRecipients.map((recipient) => {
        let recipientMessage = message;
        let recipientTitle = title;

        // If recipient is a DEVELOPER and this was triggered by a client, anonymize client name to "Client"
        if (recipient.role === "DEVELOPER" && clientRawName && clientRawName.toLowerCase() !== "client") {
          const regex = new RegExp(clientRawName, "gi");
          recipientMessage = recipientMessage.replace(regex, "Client");
          recipientTitle = recipientTitle.replace(regex, "Client");
        }

        return prisma.notification.create({
          data: {
            userId: recipient.id,
            projectId: projectId || null,
            type: type as any,
            title: recipientTitle,
            message: recipientMessage,
            link: link || null,
            metadata: metadata || {},
            isRead: false,
          },
          include: {
            project: {
              select: { id: true, name: true, clientName: true },
            },
          },
        });
      })
    );

    // 2. Dispatch real-time in-app SSE event to connected active subscribers
    for (const notif of createdNotifications) {
      if (!notif.userId) continue;
      const subscribers = sseSubscribers.get(notif.userId);
      if (subscribers && subscribers.size > 0) {
        const payload = {
          type: "NOTIFICATION_RECEIVED",
          notification: notif,
        };
        subscribers.forEach((cb) => {
          try {
            cb(payload);
          } catch (subscriberErr) {
            console.warn("[SSE_SUBSCRIBER_ERROR]:", subscriberErr);
          }
        });
      }
    }

    // 3. Dispatch background FCM push notifications to active users
    try {
      const activeIds = activeRecipients.map((r) => r.id);
      const tokens = await prisma.fcmToken.findMany({
        where: {
          userId: { in: activeIds },
          user: { status: "ACTIVE" },
        },
        select: { token: true, userId: true },
      });

      if (tokens.length > 0) {
        // Group by user role for appropriate privacy in push payload
        const adminTokens = tokens
          .filter((t) => activeRecipients.find((r) => r.id === t.userId)?.role === "ADMIN")
          .map((t) => t.token);
        const devTokens = tokens
          .filter((t) => activeRecipients.find((r) => r.id === t.userId)?.role === "DEVELOPER")
          .map((t) => t.token);

        const fcmData = {
          type,
          projectId: projectId || "",
          link: link || "/",
          ...(metadata?.taskId ? { taskId: String(metadata.taskId) } : {}),
          ...(metadata?.commentId ? { commentId: String(metadata.commentId) } : {}),
        };

        if (adminTokens.length > 0) {
          await sendFcmNotification({
            tokens: adminTokens,
            title,
            body: message,
            link: link || "/",
            data: fcmData,
          });
        }

        if (devTokens.length > 0) {
          let devBody = message;
          let devTitle = title;
          if (clientRawName && clientRawName.toLowerCase() !== "client") {
            const regex = new RegExp(clientRawName, "gi");
            devBody = devBody.replace(regex, "Client");
            devTitle = devTitle.replace(regex, "Client");
          }
          await sendFcmNotification({
            tokens: devTokens,
            title: devTitle,
            body: devBody,
            link: link || "/",
            data: fcmData,
          });
        }
      }
    } catch (fcmErr) {
      console.warn("[FCM_PUSH_DISPATCH_WARN]:", fcmErr);
    }
  } catch (err) {
    console.error("[NOTIFICATION_DISPATCH_ERROR]:", err);
  }
}
