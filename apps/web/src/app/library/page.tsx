import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@ghim/ui";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { resolveLearnerActor } from "@/lib/auth/resolve-actor";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = await createClient();
  const actor = await resolveLearnerActor(supabase.auth).catch(() => null);
  if (!actor) redirect("/?auth=required");

  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Thư viện của bạn</CardTitle>
          <CardDescription>Đã đăng nhập bằng Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Learner ID</p>
          <p className="break-all font-mono">{actor.learnerId}</p>
          {actor.email ? <p className="text-muted-foreground">{actor.email}</p> : null}
        </CardContent>
        <CardFooter>
          <form action={signOut}>
            <Button type="submit" variant="outline">Đăng xuất</Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}
