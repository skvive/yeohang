import Link from 'next/link';
import './auth.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div>
        <Link className="auth-back" href="/">
          ← 여행갈지도 홈
        </Link>
        {children}
      </div>
    </div>
  );
}
