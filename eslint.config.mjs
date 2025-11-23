import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
    ...nextCoreWebVitals,
    ...nextTypescript,
    {
        rules: {
            "@next/next/no-img-element": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "off",

            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],

            "react-hooks/exhaustive-deps": "warn",
            "react-hooks/rules-of-hooks": "warn",
            "react/no-unescaped-entities": "off",
            "react/no-unknown-property": "off",
        },
    }
];
