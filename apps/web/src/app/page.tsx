const foundationItems = [
  "Bắt gặp từ trong nội dung thật",
  "Lưu lại cùng ngữ cảnh",
  "Ôn đúng lúc với FSRS",
] as const;

export default function HomePage() {
  return (
    <main className="library-shell">
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Thư viện từ vựng của riêng bạn</p>
        <h1 id="hero-title">Gặp từ nào, nhớ từ đó.</h1>
        <p className="lede">
          Ghim biến những từ tiếng Anh bạn thực sự gặp thành bài ôn ngắn gọn,
          đúng ngữ cảnh và xuất hiện lại đúng lúc.
        </p>

        <ol className="learning-path" aria-label="Vòng lặp học cốt lõi">
          {foundationItems.map((item, index) => (
            <li key={item}>
              <span aria-hidden="true">0{index + 1}</span>
              {item}
            </li>
          ))}
        </ol>

        <p className="status-stamp">Đang dựng nền móng · Private alpha</p>
      </section>
    </main>
  );
}
