import type {Metadata} from 'next';
// Import the Cutive Mono font from Google Fonts
import { Cutive_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Configure Cutive Mono font
const cutiveMono = Cutive_Mono({
  variable: '--font-cutive-mono', // CSS variable name
  weight: '400', // Specify desired weights
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'AIAgent - Retro IDE', // Updated title
  description: 'AI-powered application development with a 60s/70s vibe', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply the font variable to the html tag
    <html lang="en" className={`${cutiveMono.variable}`}>
       <body className={`font-mono antialiased`}> {/* Use font-mono as the base */}
         {/* OllamaProvider removed */}
         {children}
         <Toaster />
       </body>
    </html>
  );
}
