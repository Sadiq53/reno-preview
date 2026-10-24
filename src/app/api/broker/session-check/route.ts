import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { normalizeWpLoginUrl } from "@/lib/wp-session";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-grant-token",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Real-Time Session Validity Checker
 *
 * Called periodically (heartbeat) and on page navigation by the Reno Access Companion
 * browser extension. Allows the extension to:
 * 1. Instantly detect when an agency owner revokes an assignment or project.
 * 2. Purge cookies and terminate WordPress tabs immediately upon revocation.
 * 3. Extend the rolling ephemeral cookie lease while access remains valid.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    const domain = searchParams.get("domain");

    if (!assignmentId && !domain) {
      return NextResponse.json(
        { active: false, reason: "missing_parameters" },
        { status: 400, headers: corsHeaders }
      );
    }

    const now = new Date();

    // Priority 1: Check by Assignment ID
    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { project: true, user: true },
      });

      if (!assignment) {
        return NextResponse.json(
          { active: false, reason: "assignment_not_found" },
          { status: 200, headers: corsHeaders }
        );
      }

      if (assignment.user?.status === "SUSPENDED") {
        return NextResponse.json(
          { active: false, reason: "user_suspended" },
          { status: 200, headers: corsHeaders }
        );
      }

      if (assignment.revokedAt !== null) {
        return NextResponse.json(
          {
            active: false,
            reason: "revoked",
            revokedAt: assignment.revokedAt.toISOString(),
          },
          { status: 200, headers: corsHeaders }
        );
      }

      if (now > new Date(assignment.expiresAt)) {
        return NextResponse.json(
          {
            active: false,
            reason: "expired",
            expiresAt: assignment.expiresAt.toISOString(),
          },
          { status: 200, headers: corsHeaders }
        );
      }

      if (assignment.project.status !== "ACTIVE") {
        return NextResponse.json(
          { active: false, reason: "project_inactive" },
          { status: 200, headers: corsHeaders }
        );
      }

      // Check if there is an active (un-revoked, un-purged) LoginGrant for this assignment
      const activeGrant = await prisma.loginGrant.findFirst({
        where: {
          assignmentId: assignment.id,
          expiresAt: { not: new Date(0) },
          sessionDataEncrypted: { not: null },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!activeGrant) {
        return NextResponse.json(
          { active: false, reason: "session_revoked" },
          { status: 200, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          active: true,
          assignmentId: assignment.id,
          expiresAt: assignment.expiresAt.toISOString(),
          roleTemplate: assignment.wpRoleTemplate,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Priority 2: Fallback lookup by domain
    if (domain) {
      const cleanDomain = domain.toLowerCase().replace(/^\./, "");
      const projects = await prisma.project.findMany({
        where: { status: "ACTIVE" },
        include: {
          assignments: {
            where: {
              revokedAt: null,
              expiresAt: { gt: now },
            },
          },
        },
      });

      const matchingProject = projects.find((p) => {
        try {
          if (!p.targetUrl) return false;
          const { domain: pDomain } = normalizeWpLoginUrl(p.targetUrl);
          return pDomain === cleanDomain || pDomain.endsWith("." + cleanDomain);
        } catch {
          return false;
        }
      });

      if (!matchingProject || matchingProject.assignments.length === 0) {
        return NextResponse.json(
          { active: false, reason: "no_active_assignment_for_domain" },
          { status: 200, headers: corsHeaders }
        );
      }

      const activeProjectGrant = await prisma.loginGrant.findFirst({
        where: {
          assignment: { projectId: matchingProject.id },
          expiresAt: { not: new Date(0) },
          sessionDataEncrypted: { not: null },
        },
      });

      if (!activeProjectGrant) {
        return NextResponse.json(
          { active: false, reason: "session_revoked" },
          { status: 200, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          active: true,
          domain: cleanDomain,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { active: false, reason: "unknown" },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[SESSION_CHECK_ERROR]", err);
    return NextResponse.json(
      { active: false, error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
