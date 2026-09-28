import './globals.css';
import type { Metadata } from 'next';
import { AppNav } from '@/components/AppNav';
export const metadata: Metadata = { title:'Roomwise Student Hub', description:'Live room finder, squad sharing, and attendance planning in one campus app.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppNav/>{children}</body></html>}
