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
  {
    detail: "Lưu ngay từ trang bạn đang đọc, không làm đứt mạch tập trung.",
    title: "Bắt gặp",
  },
  {
    detail: "Giữ câu gốc, nghĩa tiếng Việt và cách dùng thật sự hữu ích.",
    title: "Ghim lại",
  },
  {
    detail: "FSRS âm thầm chọn đúng lúc để từ quay trở lại.",
    title: "Nhớ lâu",
  },
] as const;

export default function HomePage() {
  return (
    <main className="library-page">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Ghim — về đầu trang">
          <span aria-hidden="true">G</span>
          <strong>Ghim</strong>
        </a>
        <Badge variant="outline">Nền tảng UI · 01</Badge>
      </header>

      <section className="hero-grid" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <Badge variant="secondary">Thư viện từ vựng của riêng bạn</Badge>
          <h1 id="hero-title">Gặp từ nào, nhớ từ đó.</h1>
          <p>
            Ghim biến những từ tiếng Anh bạn thực sự gặp thành bài ôn ngắn
            gọn, đúng ngữ cảnh và xuất hiện lại đúng lúc.
          </p>
          <div className="hero-actions">
            <Button size="lg">Mở thư viện</Button>
            <Button size="lg" variant="outline">
              Xem cách hoạt động
            </Button>
          </div>
        </div>

        <Card className="capture-card" aria-labelledby="capture-title">
          <CardHeader>
            <Badge>Vừa ghim</Badge>
            <CardTitle id="capture-title">serendipity</CardTitle>
            <CardDescription>/ˌser.ənˈdɪp.ə.ti/ · noun</CardDescription>
          </CardHeader>
          <CardContent className="capture-content">
            <p className="meaning">sự tình cờ may mắn</p>
            <blockquote>
              “Finding that tiny bookshop was pure serendipity.”
            </blockquote>
            <Separator />
            <div className="next-review">
              <span>Ôn tiếp theo</span>
              <strong>Ngày mai · 8:20</strong>
            </div>
          </CardContent>
          <CardFooter>
            <span aria-hidden="true">◆</span>
            FSRS đang sắp lịch ở phía sau
          </CardFooter>
        </Card>
      </section>

      <section className="learning-section" aria-labelledby="loop-title">
        <div className="section-heading">
          <p>Ba nhịp, một thói quen</p>
          <h2 id="loop-title">Từ trang đang đọc tới trí nhớ dài hạn.</h2>
        </div>
        <ol className="learning-grid">
          {learningPath.map((item, index) => (
            <li key={item.title}>
              <Card className="path-card">
                <CardHeader>
                  <span className="catalog-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{item.detail}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="specimen-section" aria-labelledby="specimen-title">
        <div className="section-heading">
          <p>Kệ mẫu giao diện</p>
          <h2 id="specimen-title">Những trạng thái người học sẽ gặp.</h2>
        </div>

        <div className="specimen-grid">
          <Card>
            <CardHeader>
              <CardTitle>Hành động</CardTitle>
              <CardDescription>
                Trạng thái thật có thể dùng bằng chuột lẫn bàn phím.
              </CardDescription>
            </CardHeader>
            <CardContent className="button-shelf">
              <div>
                <span>Mặc định</span>
                <Button>Thêm vào bộ từ</Button>
              </div>
              <div>
                <span>Hover</span>
                <Button className="demo-hover">Đã rê chuột</Button>
              </div>
              <div>
                <span>Focus visible</span>
                <Button className="demo-focus" variant="outline">
                  Đang focus
                </Button>
              </div>
              <div>
                <span>Disabled</span>
                <Button disabled>Chưa thể lưu</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nhập từ thủ công</CardTitle>
              <CardDescription>
                Label, gợi ý và lỗi luôn có quan hệ rõ ràng.
              </CardDescription>
            </CardHeader>
            <CardContent className="form-shelf">
              <div className="field-group">
                <Label htmlFor="word-default">Từ tiếng Anh</Label>
                <Input
                  aria-describedby="word-hint"
                  id="word-default"
                  placeholder="Ví dụ: serendipity"
                />
                <p id="word-hint">Nhập một từ hoặc cụm từ ngắn.</p>
              </div>
              <div className="field-group">
                <Label htmlFor="word-invalid">Trạng thái validation</Label>
                <Input
                  aria-describedby="word-error"
                  aria-invalid="true"
                  defaultValue="a very long sentence"
                  id="word-invalid"
                />
                <p className="field-error" id="word-error">
                  Chỉ nhập từ hoặc cụm từ cần học.
                </p>
              </div>
              <div className="field-group">
                <Label htmlFor="word-disabled">Đã khóa</Label>
                <Input disabled id="word-disabled" value="remember" readOnly />
              </div>
            </CardContent>
          </Card>

          <Card className="contrast-card">
            <CardHeader>
              <CardTitle>Độ tương phản cao</CardTitle>
              <CardDescription>
                Viền, focus và nội dung vẫn rõ khi hệ điều hành ép màu.
              </CardDescription>
            </CardHeader>
            <CardContent className="contrast-preview">
              <Badge variant="outline">12 từ tới hạn</Badge>
              <p>Hôm nay chỉ cần một phiên ôn ngắn.</p>
              <Button variant="outline">Bắt đầu ôn</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="site-footer">
        <span>Ghim · Private alpha</span>
        <span>Một góc thư viện cho những từ đáng nhớ.</span>
      </footer>
    </main>
  );
}
