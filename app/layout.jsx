import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'YaDas — mavzu bo‘yicha test',
  description: 'YaDas matematika savollarini mavzu bo‘yicha takrorlash va test qilish.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        <Script id="mathjax-config" strategy="beforeInteractive">
          {`window.MathJax = {
            tex: { inlineMath: [['$', '$'], ['\\\\(', '\\\\)']], displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']] },
            options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'] }
          };`}
        </Script>
        <Script
          id="mathjax"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
