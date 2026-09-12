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

function App() {
  return (
    <main className="grid min-h-80 w-88 gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Ghim</h1>
        <Badge variant="outline">Foundation</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Extension đã sẵn sàng</CardTitle>
          <CardDescription>
            Luồng lưu từ sẽ được mở trong ticket Capture tiếp theo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge>Chrome · Edge</Badge>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled>Ghim từ đang chọn</Button>
        </CardFooter>
      </Card>
    </main>
  );
}

export default App;
