import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@ghim/ui";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Không thể đăng nhập</CardTitle>
          <CardDescription>
            Phiên Google không hoàn tất hoặc đã hết hạn. Không có từ đang chờ nào bị xóa.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Thử lại từ đầu. Nếu bạn vừa đổi tài khoản, hãy chọn đúng tài khoản đã dùng với Ghim.
        </CardContent>
        <CardFooter>
          <Button render={<Link href="/" />}>Về trang chủ</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
