import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public liveness/readiness probe for docker / k8s / load-balancer.
 *
 * - GET /api/health         -> { status: "ok" }  (200)
 * - GET /api/health?deep=1  -> also runs a lightweight Prisma query to
 *                                confirm the database connection is live.
 *                                Returns 503 with a JSON body if the query
 *                                fails, so Docker healthcheck / k8s
 *                                readinessProbe can mark the instance unhealthy.
 *
 * Intentionally unauthenticated and free of side-effects. The container
 * healthcheck in docker-compose.yml points at /api/health (no ?deep=) so
 * the probe stays cheap; pass ?deep=1 for k8s readinessProbe or
 * anything that needs DB liveness.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";

  if (!deep) {
    return NextResponse.json({ status: "ok", ts: Date.now() });
  }

  try {
    // `SELECT 1` runs in <1ms; cheap enough even on cold connection
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "ok", db: "ok", ts: Date.now() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { status: "degraded", db: "down", error: msg, ts: Date.now() },
      { status: 503 }
    );
  }
}