import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

export const runtime = "nodejs";

const PUBLIC_PATHS = ["/sign-in", "/register", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // `api/receipts/scan` is excluded: a Node-runtime middleware in standalone
  // mode locks the request body stream before it reaches the route, which
  // breaks multipart file uploads ("Response body object should not be
  // disturbed or locked"). The scan route enforces auth itself via
  // requireSession(), so skipping middleware here costs no security.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/receipts/scan|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
