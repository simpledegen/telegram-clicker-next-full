import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Clicker Mini App</title>
        <link rel="stylesheet" href="./globals.css" />
      </head>
      <body className="min-h-dvh bg-white from-black/20 to-black/40">
        {children}
      </body>
    </html>
  );
}
