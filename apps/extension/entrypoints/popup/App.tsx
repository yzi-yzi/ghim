import { Alert, AlertDescription, AlertTitle } from "@ghim/ui/components/alert";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@ghim/ui";
import { useEffect, useState } from "react";

import type { AuthMessage } from "../background";
import type { ExtensionAuthState } from "../../utils/auth";

const signedOutState: ExtensionAuthState = {
  accountState: "none",
  actor: null,
  status: "signed_out",
};

async function sendAuthMessage(message: AuthMessage) {
  return browser.runtime.sendMessage<AuthMessage, ExtensionAuthState>(message);
}

function App() {
  const [auth, setAuth] = useState<ExtensionAuthState | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void sendAuthMessage({ type: "AUTH_GET_STATE" })
      .then((state) => {
        if (active) setAuth(state);
      })
      .catch(() => {
        if (active) setAuth(signedOutState);
      });
    return () => {
      active = false;
    };
  }, []);

  async function runAuthAction(message: AuthMessage) {
    setError(false);
    setPending(true);
    try {
      setAuth(await sendAuthMessage(message));
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-80 w-88 gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ghim</h1>
        <Badge variant="outline">Google Auth</Badge>
      </header>

      {auth?.accountState === "account_mismatch" ? (
        <Alert variant="destructive">
          <AlertTitle>Khác tài khoản</AlertTitle>
          <AlertDescription>
            Một số từ đang chờ thuộc tài khoản khác. Ghim vẫn giữ chúng và sẽ không tự gửi.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Không thể đăng nhập</AlertTitle>
          <AlertDescription>Thử lại và chọn tài khoản Google của bạn.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {auth?.status === "authenticated" ? "Đã kết nối" : "Đăng nhập để bắt đầu"}
          </CardTitle>
          <CardDescription>
            {auth?.status === "authenticated"
              ? (auth.actor?.email ?? "Tài khoản Google của bạn")
              : "Ghim chỉ yêu cầu danh tính cơ bản từ Google."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge>{auth?.status === "authenticated" ? "Sẵn sàng ghim từ" : "Chrome · Edge"}</Badge>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {auth?.status === "authenticated" ? (
            <Button
              disabled={pending}
              onClick={() => void runAuthAction({ type: "AUTH_SIGN_OUT" })}
              variant="outline"
            >
              Đăng xuất
            </Button>
          ) : (
            <Button
              disabled={pending || auth === null || auth?.status === "configuration_required"}
              onClick={() => void runAuthAction({ type: "AUTH_SIGN_IN" })}
            >
              Tiếp tục với Google
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}

export default App;
