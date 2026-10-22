import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: bounces visitors with no session cookie to /login early.
// The real authorisation happens server-side in requireTenant() on every page and action.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("qw_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/quotes/:path*", "/rates/:path*", "/customers/:path*", "/settings/:path*"],
};
