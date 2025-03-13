import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	publicDir: "public",
	plugins: [tailwindcss()],
});
