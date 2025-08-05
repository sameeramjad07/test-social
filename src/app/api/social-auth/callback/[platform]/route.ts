import { getServerAuthSession } from "@/server/auth/helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const session = await getServerAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const { platform } = await params;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    // Handle user denial or other errors
    const redirectUrl = new URL(`/workspace/social-accounts/callback/${platform}`, request.url);
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  } 

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  // Redirect to frontend with code and state
  // The frontend will call the tRPC mutation to complete the flow
  const callbackUrl = new URL(`/workspace/social-accounts/callback/${platform}`, request.url);
  callbackUrl.searchParams.set("platform", platform);
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", state);
  
  return NextResponse.redirect(callbackUrl);
}