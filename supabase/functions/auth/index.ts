import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AuthAction = "login" | "signup";

interface AuthRequestBody {
  action: AuthAction;
  email: string;
  password: string;
  full_name?: string;
  phone_number?: string | null;
  address?: string | null;
}

interface AuthError {
  code: string;
  message: string;
}

interface AuthSuccessData {
  user: Record<string, unknown>;
}

interface AuthResponseBody {
  success: boolean;
  data: AuthSuccessData | null;
  error: AuthError | null;
}

const parseOrigin = (origin: string | null, referer: string | null): string | null => {
  if (origin) return origin;
  if (referer) {
    const match = referer.match(/^https?:\/\/[^/]+/);
    if (match) return match[0];
  }
  return null;
};

const getAllowedOrigins = (): string[] => {
  const fromEnv = Deno.env.get("SUPABASE_ALLOWED_ORIGINS");
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  // Sensible defaults for local + known deployment
  return [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:3000",
    "https://f14-navy.vercel.app",
  ];
};

const getCorsHeaders = (origin: string | null, referer: string | null): Record<string, string> => {
  const requestOrigin = parseOrigin(origin, referer);
  const allowedOrigins = getAllowedOrigins();

  let corsOrigin: string;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    corsOrigin = requestOrigin;
  } else if (requestOrigin) {
    // Not explicitly listed, but we still echo back the concrete origin
    // rather than using '*', since we don't need credentials.
    corsOrigin = requestOrigin;
  } else {
    corsOrigin = allowedOrigins[0];
  }

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, origin, referer",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Referer",
  };
};

const jsonResponse = (
  status: number,
  body: AuthResponseBody,
  corsHeaders: Record<string, string>
): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

const validateRequestBody = (body: any): { ok: boolean; error?: AuthError; value?: AuthRequestBody } => {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: { code: "AUTH_BAD_REQUEST", message: "Invalid request body" },
    };
  }

  const action = body.action as AuthAction;
  if (action !== "login" && action !== "signup") {
    return {
      ok: false,
      error: { code: "AUTH_INVALID_ACTION", message: "Invalid action" },
    };
  }

  const rawEmail = (body.email ?? "").toString().trim().toLowerCase();
  const rawPassword = (body.password ?? "").toString();

  if (!rawEmail || !rawEmail.includes("@") || rawEmail.length > 320) {
    return {
      ok: false,
      error: { code: "AUTH_INVALID_EMAIL", message: "Please provide a valid email address" },
    };
  }

  if (!rawPassword || rawPassword.length < 6 || rawPassword.length > 128) {
    return {
      ok: false,
      error: {
        code: "AUTH_INVALID_PASSWORD",
        message: "Password must be between 6 and 128 characters",
      },
    };
  }

  if (action === "signup") {
    const fullName = (body.full_name ?? "").toString().trim();
    if (!fullName || fullName.length < 2) {
      return {
        ok: false,
        error: {
          code: "AUTH_INVALID_NAME",
          message: "Full name must be at least 2 characters",
        },
      };
    }
  }

  const value: AuthRequestBody = {
    action,
    email: rawEmail,
    password: rawPassword,
    full_name: body.full_name ? String(body.full_name).trim() : undefined,
    phone_number:
      body.phone_number !== undefined && body.phone_number !== null
        ? String(body.phone_number)
        : null,
    address:
      body.address !== undefined && body.address !== null ? String(body.address) : null,
  };

  return { ok: true, value };
};

const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const userAgent = req.headers.get("user-agent") || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent
  );

  const corsHeaders = getCorsHeaders(origin, referer);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      405,
      {
        success: false,
        data: null,
        error: { code: "AUTH_METHOD_NOT_ALLOWED", message: "Method not allowed" },
      },
      corsHeaders
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Auth config error: missing SUPABASE_URL or SUPABASE_ANON_KEY", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    });

    return jsonResponse(
      500,
      {
        success: false,
        data: null,
        error: {
          code: "AUTH_CONFIG_ERROR",
          message:
            "Authentication is temporarily unavailable due to server configuration. Please try again later.",
        },
      },
      corsHeaders
    );
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const body = await req.json();
    const validation = validateRequestBody(body);

    if (!validation.ok || !validation.value) {
      return jsonResponse(400, { success: false, data: null, error: validation.error! }, corsHeaders);
    }

    const { action, email, password, full_name, phone_number, address } = validation.value;

    if (action === "signup") {
      const passwordHash = await hashPassword(password);

      const { data: userData, error: insertError } = await supabaseClient
        .from("users")
        .insert({
          email,
          password_hash: passwordHash,
          full_name,
          phone_number: phone_number || null,
          address: address || null,
          role: "user",
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return jsonResponse(
            400,
            {
              success: false,
              data: null,
              error: {
                code: "AUTH_EMAIL_EXISTS",
                message: "Email already registered",
              },
            },
            corsHeaders
          );
        }

        console.error("Auth signup DB error:", insertError);
        return jsonResponse(
          500,
          {
            success: false,
            data: null,
            error: {
              code: "AUTH_INTERNAL_ERROR",
              message: "Could not create account. Please try again.",
            },
          },
          corsHeaders
        );
      }

      // Remove password_hash before returning
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = userData as any;

      return jsonResponse(
        200,
        {
          success: true,
          data: { user: userWithoutPassword },
          error: null,
        },
        corsHeaders
      );
    }

    // LOGIN
    const { data: userData, error: findError } = await supabaseClient
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (findError || !userData) {
      console.error("Auth login DB error:", {
        code: findError?.code,
        message: findError?.message,
      });

      // Table missing / configuration issue
      if (findError?.code === "42P01") {
        return jsonResponse(
          500,
          {
            success: false,
            data: null,
            error: {
              code: "AUTH_CONFIG_ERROR",
              message:
                "Authentication backend is not fully configured. Please contact support.",
            },
          },
          corsHeaders
        );
      }

      return jsonResponse(
        401,
        {
          success: false,
          data: null,
          error: {
            code: "AUTH_INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        corsHeaders
      );
    }

    const userRow: any = userData;

    if (userRow.is_active === false) {
      return jsonResponse(
        403,
        {
          success: false,
          data: null,
          error: {
            code: "AUTH_INACTIVE",
            message: "This account is inactive. Please contact support.",
          },
        },
        corsHeaders
      );
    }

    const passwordHash = await hashPassword(password);

    if (userRow.password_hash !== passwordHash) {
      return jsonResponse(
        401,
        {
          success: false,
          data: null,
          error: {
            code: "AUTH_INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        corsHeaders
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = userRow;

    return jsonResponse(
      200,
      {
        success: true,
        data: { user: userWithoutPassword },
        error: null,
      },
      corsHeaders
    );
  } catch (error: any) {
    console.error("Auth function error:", {
      error: error?.message,
      stack: error?.stack,
      isMobile,
      userAgent: userAgent.substring(0, 50),
    });

    const baseError: AuthError = {
      code: "AUTH_INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again.",
    };

    const mobileHint = isMobile
      ? " Please check your internet connection and try again."
      : "";

    return jsonResponse(
      500,
      {
        success: false,
        data: null,
        error: {
          code: baseError.code,
          message: baseError.message + mobileHint,
        },
      },
      corsHeaders
    );
  }
});
