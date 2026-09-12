import { createGhimApi } from "@ghim/api";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { handle } from "hono/vercel";

import { requireSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { resolveLearnerActor } from "@/lib/auth/resolve-actor";

async function resolveActor(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
  const config = requireSupabasePublicConfig();
  const supabase = bearerToken
    ? createSupabaseClient(config.url, config.publishableKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : await createServerClient();

  return resolveLearnerActor(supabase.auth, bearerToken);
}

const app = createGhimApi({ resolveActor });
export const GET = handle(app);
export const POST = handle(app);
