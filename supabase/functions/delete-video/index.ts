// delete-video/index.ts
// Deletes a video file from R2 and removes its metadata row from video_library.
// Deno runtime — deployed as a Supabase Edge Function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

// ---------------------------------------------------------------------------
// CORS helpers
// ---------------------------------------------------------------------------

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function corsResponse(body: string | null, status: number, extra?: Record<string, string>) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "DELETE") {
    return corsResponse(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Only DELETE is accepted" } }), 405);
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Verify JWT and extract user ID
    // -----------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return corsResponse(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" } }),
        401,
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return corsResponse(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }),
        401,
      );
    }

    const userId = user.id;

    // -----------------------------------------------------------------------
    // 2. Parse and validate request body
    // -----------------------------------------------------------------------
    let body: { videoId?: string; fileUrl?: string };
    try {
      body = await req.json();
    } catch {
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }),
        400,
      );
    }

    const { videoId, fileUrl } = body;

    if (!videoId || typeof videoId !== "string") {
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Missing or invalid 'videoId'" } }),
        400,
      );
    }
    if (!fileUrl || typeof fileUrl !== "string") {
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Missing or invalid 'fileUrl'" } }),
        400,
      );
    }

    // -----------------------------------------------------------------------
    // 3. Look up video_library row and verify ownership
    // -----------------------------------------------------------------------
    const { data: video, error: fetchError } = await supabase
      .from("video_library")
      .select("id, user_id, file_url")
      .eq("id", videoId)
      .single();

    if (fetchError || !video) {
      return corsResponse(
        JSON.stringify({ error: { code: "NOT_FOUND", message: "Video not found" } }),
        404,
      );
    }

    if (video.user_id !== userId) {
      return corsResponse(
        JSON.stringify({ error: { code: "FORBIDDEN", message: "You can only delete your own uploads" } }),
        403,
      );
    }

    // -----------------------------------------------------------------------
    // 4. Delete object from R2
    // -----------------------------------------------------------------------
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME")!;
    const r2PublicBucketUrl = Deno.env.get("R2_PUBLIC_BUCKET_URL")!;

    // Extract object key by stripping the public bucket URL prefix
    const publicBase = r2PublicBucketUrl.replace(/\/+$/, "");
    const objectKey = fileUrl.replace(`${publicBase}/`, "");

    if (!objectKey || objectKey === fileUrl) {
      // Safety check — if we couldn't extract a valid key, don't delete blindly
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Could not determine R2 object key from fileUrl" } }),
        400,
      );
    }

    const aws = new AwsClient({
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      service: "s3",
      region: "auto",
    });

    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}/${objectKey}`;

    const deleteRequest = new Request(r2Endpoint, { method: "DELETE" });
    const signedDelete = await aws.sign(deleteRequest);
    const r2Response = await fetch(signedDelete);

    // R2 returns 204 on successful delete, but also 204 if object didn't exist.
    // Both are acceptable — we proceed to clean up the DB row regardless.
    if (!r2Response.ok && r2Response.status !== 204) {
      return corsResponse(
        JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Failed to delete file from storage" } }),
        500,
      );
    }

    // -----------------------------------------------------------------------
    // 5. Delete the video_library row
    // -----------------------------------------------------------------------
    const { error: deleteError } = await supabase
      .from("video_library")
      .delete()
      .eq("id", videoId)
      .eq("user_id", userId);

    if (deleteError) {
      return corsResponse(
        JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Failed to delete video record" } }),
        500,
      );
    }

    // -----------------------------------------------------------------------
    // 6. Success
    // -----------------------------------------------------------------------
    return corsResponse(JSON.stringify({ success: true }), 200);
  } catch (_err) {
    // Never expose internal error details
    return corsResponse(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      500,
    );
  }
});
