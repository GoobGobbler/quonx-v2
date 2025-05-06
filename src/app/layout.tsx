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
  title: 'CodeSynth Terminal - Multi-AI IDE Platform', // Updated title
  description: 'Collaborative AI-powered development with Ollama, Gemini, OpenRouter support, MLOps, security scanning, and advanced IDE features in a retro-futuristic terminal.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cutiveMono.variable} dark`}>
       <body className={`font-mono antialiased bg-background text-foreground`}>
         {/* TODO: Add providers for Collaboration (e.g., Liveblocks, Yjs), MLOps (Context API?), Settings */}
         {children}
         <Toaster />
       </body>
    </html>
  );
}
