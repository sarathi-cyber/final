import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'], theme: { extend: { colors: { ink:'#0f172a', navy:'#12233f', mist:'#f5f7fb', line:'#e5eaf2' }, boxShadow:{soft:'0 10px 35px rgba(15,23,42,.06)'} } }, plugins: [] };
export default config;
