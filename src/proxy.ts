import { NextRequest, NextResponse } from "next/server";

export function proxy(_req: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/vision/:path*"],
};
