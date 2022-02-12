import typescript from "@rollup/plugin-typescript";
import type { RollupOptions } from "rollup";
import { terser } from "rollup-plugin-terser";

let config: RollupOptions = {
    input: "src/app.ts",
    output: {
        file: "build/app.js",
        // iife makes a nice object for the game to read out of the exports
        format: "iife",
        // We cannot specify a name or it'll make the game upset
        name: undefined,
    },
    plugins: [
        typescript(),
        // Minify the code to make me less likely to accidentally edit the javascript file
        terser({
            // If we specify compress, terser does something the game doesn't like.
            // Something to do with the iife?
            compress: false,
        }),
    ],
};

export default config;
