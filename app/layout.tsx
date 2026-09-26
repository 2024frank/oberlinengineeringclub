import type { Metadata } from 'next'
import './globals.css'
import './site.css'

export const metadata: Metadata = {
  title: { default: 'Oberlin Engineering Club', template: '%s · Oberlin Engineering Club' },
  description: 'A student group at Oberlin College for students who build things, and for anyone considering the 3-2 engineering pathway with Caltech, Case Western Reserve, Columbia, or WashU.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
