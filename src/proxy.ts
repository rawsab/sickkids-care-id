import { NextResponse } from "next/server";

// Until authentication is in place, the admin and public health areas are
// only reachable in local development. Replace with a session/role check.
export function proxy() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
