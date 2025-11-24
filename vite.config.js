import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	define: {
		global: 'globalThis'
	},
	server: {
		port: 3003,
		host: '0.0.0.0',
		allowedHosts: [
			'varen.iptime.org',
			'192.168.0.4',
			'localhost'
		]
	}
});