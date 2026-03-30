// get-upload-url/index.ts
// Generates a presigned R2 PUT URL so the frontend can upload directly to R2.
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

  if (req.method !== "POST") {
    return corsResponse(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Only POST is accepted" } }), 405);
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Verify JWT
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

    // -----------------------------------------------------------------------
    // 2. Parse and validate request body
    // -----------------------------------------------------------------------
    let body: { filename?: string; contentType?: string; fileSizeBytes?: number };
    try {
      body = await req.json();
    } catch {
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }),
        400,
      );
    }

    const { filename, contentType, fileSizeBytes } = body;

    if (!filename || typeof filename !== "string") {
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Missing or invalid 'filename'" } }),
        400,
      );
    }
    if (!contentType || typeof contentType !== "string") {
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Missing or invalid 'contentType'" } }),
        400,
      );
    }
    if (fileSizeBytes === undefined || typeof fileSizeBytes !== "number" || fileSizeBytes <= 0) {
      return corsResponse(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Missing or invalid 'fileSizeBytes'" } }),
        400,
      );
    }

    // -----------------------------------------------------------------------
    // 3. Sanitize filename
    // -----------------------------------------------------------------------
    const sanitized = filename
      .replace(/\s+/g, "_")                     // spaces -> underscores
      .replace(/[^a-zA-Z0-9._-]/g, "")          // strip everything except alphanum, dots, hyphens
      .replace(/_{2,}/g, "_")                    // collapse consecutive underscores
      .replace(/^[._-]+/, "")                    // strip leading dots/hyphens/underscores
      || "file";                                 // fallback if everything was stripped

    // -----------------------------------------------------------------------
    // 4. Generate presigned PUT URL
    // -----------------------------------------------------------------------
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID")!;
    const r2AccessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
    const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME")!;
    const r2PublicBucketUrl = Deno.env.get("R2_PUBLIC_BUCKET_URL")!;

    const objectKey = `uploads/${crypto.randomUUID()}/${sanitized}`;

    const aws = new AwsClient({
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
      service: "s3",
      region: "auto",
    });

    // R2 S3-compatible endpoint
    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2BucketName}/${objectKey}`;

    // Create a presigned PUT request — expires in 15 minutes (900 seconds)
    const signedRequest = await aws.sign(
      new Request(r2Endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(fileSizeBytes),
        },
      }),
      { aws: { signQuery: true, allHeaders: true }, expiresIn: 900 },
    );

    const uploadUrl = signedRequest.url;

    // -----------------------------------------------------------------------
    // 5. Construct public URL
    // -----------------------------------------------------------------------
    // Strip trailing slash from public bucket URL if present
    const publicBase = r2PublicBucketUrl.replace(/\/+$/, "");
    const publicUrl = `${publicBase}/${objectKey}`;

    // -----------------------------------------------------------------------
    // 6. Return
    // -----------------------------------------------------------------------
    return corsResponse(JSON.stringify({ uploadUrl, publicUrl }), 200);
  } catch (_err) {
    // Never expose internal error details
    return corsResponse(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } }),
      500,
    );
  }
});
