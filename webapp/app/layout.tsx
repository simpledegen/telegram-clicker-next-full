// import '../styles/globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Clicker Mini App</title>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
