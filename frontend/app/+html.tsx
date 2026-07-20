import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML template for Expo Web & Vercel deployment.
 * Customizes head metadata, SEO title, OpenGraph tags, and canonical links.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* Primary SEO Meta Tags */}
        <title>Sistem Absensi Digital - SMKS Rajasa Surabaya</title>
        <meta name="title" content="Sistem Absensi Digital - SMKS Rajasa Surabaya" />
        <meta name="description" content="Aplikasi resmi presensi & absensi digital siswa dan guru SMKS Rajasa Surabaya dengan verifikasi lokasi GPS dan foto swafoto real-time." />
        <meta name="keywords" content="Absensi SMKS Rajasa, Presensi Rajasa, SMKS Rajasa Surabaya, Absensi Digital, Presensi GPS Rajasa, Sistem Absensi Sekolah" />
        <meta name="author" content="SMKS Rajasa Surabaya" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://smks-rajasa.sir-l.web.id" />
        <meta name="theme-color" content="#2563eb" />

        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://smks-rajasa.sir-l.web.id" />
        <meta property="og:title" content="Sistem Absensi Digital - SMKS Rajasa Surabaya" />
        <meta property="og:description" content="Aplikasi resmi presensi & absensi digital siswa dan guru SMKS Rajasa Surabaya dengan verifikasi lokasi GPS dan foto swafoto real-time." />
        <meta property="og:site_name" content="SMKS Rajasa Surabaya" />
        <meta property="og:locale" content="id_ID" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://smks-rajasa.sir-l.web.id" />
        <meta name="twitter:title" content="Sistem Absensi Digital - SMKS Rajasa Surabaya" />
        <meta name="twitter:description" content="Aplikasi resmi presensi & absensi digital siswa dan guru SMKS Rajasa Surabaya." />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
