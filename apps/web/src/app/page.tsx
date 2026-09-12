import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
} from "@ghim/ui";

const learningPath = [
  ["Bắt gặp", "Chọn một từ ngay trên nội dung bạn đang đọc."],
  ["Ghim lại", "Lưu từ, câu gốc và bộ từ chỉ trong một thao tác."],
  ["Nhớ lâu", "Ôn ngắn gọn khi FSRS xác định từ đã tới hạn."],
] as const;

export default function HomePage() {
  return (
    <main className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold">Ghim</span>
          <Badge variant="outline">UI foundation</Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-16 px-4 py-16 lg:grid-cols-[1fr_24rem] lg:items-center">
        <section className="space-y-6">
          <Badge variant="secondary">Từ vựng trong ngữ cảnh thật</Badge>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
              Gặp từ nào, nhớ từ đó.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Ghim biến những từ tiếng Anh bạn thực sự gặp thành bài ôn ngắn
              gọn, đúng ngữ cảnh và xuất hiện lại đúng lúc.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg">Mở thư viện</Button>
            <Button size="lg" variant="outline">
              Xem cách hoạt động
            </Button>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>serendipity</CardTitle>
            <CardDescription>/ˌser.ənˈdɪp.ə.ti/ · noun</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-medium">sự tình cờ may mắn</p>
            <p className="text-sm text-muted-foreground">
              “Finding that tiny bookshop was pure serendipity.”
            </p>
            <Separator />
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Ôn tiếp theo</span>
              <span className="font-medium">Ngày mai · 8:20</span>
            </div>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            FSRS đang sắp lịch ở phía sau
          </CardFooter>
        </Card>
      </div>

      <section className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3">
          {learningPath.map(([title, description], index) => (
            <Card key={title}>
              <CardHeader>
                <CardDescription>0{index + 1}</CardDescription>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Component mặc định
          </h2>
          <p className="text-muted-foreground">
            Ghim giữ nguyên typography, spacing, radius và interaction của shadcn.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nhập từ thủ công</CardTitle>
            <CardDescription>Thêm một từ hoặc cụm từ ngắn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="word">Từ tiếng Anh</Label>
            <Input id="word" placeholder="Ví dụ: serendipity" />
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Hủy</Button>
            <Button>Thêm từ</Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
