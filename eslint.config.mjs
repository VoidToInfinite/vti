import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
    /*
     * Los worktrees de git que los agentes crean DENTRO del repo
     * (`.claude/worktrees/<nombre>/`) son copias completas del árbol, con su
     * propio `.next/` y `out/`. Los ignores de arriba solo casan en la raíz, así
     * que ESLint recorría los artefactos de build de cada worktree: medido el
     * 2026-09-10, `pnpm lint` daba 7.906 problemas y ninguno era del código del
     * repo. Es la misma exclusión que `vitest.config.ts` aplica desde la ola S
     * y que `.prettierignore` ya declaraba.
     */
    {
        ignores: [
            "node_modules",
            ".next",
            "out",
            "next-env.d.ts",
            "**/.claude/**",
        ],
    },
    ...nextCoreWebVitals,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_" },
            ],
        },
    },
    eslintConfigPrettier,
);
