import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "public/draco/**"])
];

export default eslintConfig;
