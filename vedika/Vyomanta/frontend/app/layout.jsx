import { Outfit } from 'next/font/google';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'AI TUTOR - Learning Platform',
  description: 'AI-powered learning workspace with courses, tutors, quizzes and flashcards',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var theme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: 'var(--bg)' }}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
