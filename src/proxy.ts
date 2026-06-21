import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIX = "/api/vision";

export function proxy(req: NextRequest): NextResponse {
  if (!req.nextUrl.pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const expectedKey = process.env.VISIONFLOW_API_KEY;
  if (!expectedKey) {
    // No key configured — deny all requests to avoid open access in production
    return NextResponse.json(
      { code: "SERVICE_UNAVAILABLE", message: "API key not configured." },
      { status: 503 }
    );
  }

  const provided = req.headers.get("x-api-key");
  if (!provided || provided !== expectedKey) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "API key requerida." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/vision/:path*"],
};
