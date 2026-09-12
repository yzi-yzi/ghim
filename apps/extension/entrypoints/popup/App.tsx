import "./App.css";

function App() {
  return (
    <main className="popup-shell">
      <header className="popup-header">
        <span className="bookplate" aria-hidden="true">G</span>
        <div>
          <p className="eyebrow">Thư viện bỏ túi</p>
          <h1>Ghim</h1>
        </div>
      </header>

      <section className="status-card" aria-labelledby="status-title">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <h2 id="status-title">Extension đã sẵn sàng</h2>
          <p>Luồng lưu từ sẽ được mở trong ticket Capture tiếp theo.</p>
        </div>
      </section>

      <footer>
        <span>Chrome · Edge</span>
        <span>Foundation 0.0.0</span>
      </footer>
    </main>
  );
}

export default App;
