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
  title: 'CodeSynth Terminal - AI IDE', // Updated title for Cyberpunk theme
  description: 'AI-powered development in a retro-futuristic terminal interface.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Apply the font variable to the html tag
    // Force dark theme by adding 'dark' class here if needed, or manage via theme provider
    <html lang="en" className={`${cutiveMono.variable} dark`}>
       <body className={`font-mono antialiased bg-background text-foreground`}> {/* Use font-mono and theme colors */}
         {/* OllamaProvider removed */}
         {children}
         <Toaster />
       </body>
    </html>
  );
}
