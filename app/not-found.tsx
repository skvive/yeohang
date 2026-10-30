import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="sub">요청하신 화면이 없거나 주소가 바뀌었습니다.</p>
        <Link className="auth-submit" href="/" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          여행갈지도 홈으로
        </Link>
      </div>
    </main>
  );
}
