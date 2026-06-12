import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Agrícola
        field: {
          DEFAULT: "#1A3A1F",   // verde-floresta profundo
          light: "#2D5E35",     // verde-folha
          muted: "#4A7C52",     // verde-musgo
        },
        harvest: {
          DEFAULT: "#C8861A",   // dourado-colheita
          light: "#E8A832",     // amarelo-milho
          dark: "#9A6510",
        },
        earth: {
          DEFAULT: "#5C3D1E",   // terra-vermelha angolana
          light: "#8B5E3C",     // barro
          dark: "#3A2410",
        },
        sky: {
          DEFAULT: "#D4EAD0",   // verde-céu claro
          light: "#EBF5E8",     // verde-muito-claro
        },
        cream: {
          DEFAULT: "#F5F0E8",   // papel/creme
          dark: "#E8E0D0",
        },
        ink: {
          DEFAULT: "#1C1A15",   // quase-preto
          soft: "#3D3828",
        },
        soil: {
          DEFAULT: "#221E19",
          light: "#3A332C",
        },
        clay: {
          DEFAULT: "#B1502F",
          dark: "#8C3D23",
          light: "#D97D54",
        },
        gold: {
          DEFAULT: "#D9A441",
          dark: "#B8842C",
        },
        leaf: {
          DEFAULT: "#3D5A40",
          light: "#5C7A5E",
        },
        paper: {
          DEFAULT: "#F5F0E8",
          dark: "#E8E0D0",
        },
        line: "#B7AC9A",
      },
      fontFamily: {
        display: ["var(--font-display)", "'Segoe UI'", "Arial", "sans-serif"],
        body: ["var(--font-body)", "'Segoe UI'", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "'Courier New'", "monospace"],
      },
      backgroundImage: {
        "field-pattern": "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232D5E35' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        "rows-pattern": "repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(45,94,53,0.04) 30px, rgba(45,94,53,0.04) 32px)",
      },
    },
  },
  plugins: [],
};

export default config;
