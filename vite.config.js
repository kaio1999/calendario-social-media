import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function pdfmakeVfs() {
  return {
    name: "pdfmake-vfs",
    enforce: "pre",
    transform(code, id) {
      if (!id.replace(/\\/g, "/").includes("pdfmake/build/vfs_fonts")) return null;
      return {
        code: `const root = { pdfMake: { vfs: {} } }; (function () { ${code} }).call(root); export default root.pdfMake; export const vfs = root.pdfMake.vfs;`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [pdfmakeVfs(), react(), tailwindcss()],
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["exceljs", "pdfmake/build/pdfmake"],
    exclude: ["pdfmake/build/vfs_fonts"],
  },
});
