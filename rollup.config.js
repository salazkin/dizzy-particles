import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/index.js',
    output: [{
        file: 'dist/dizzy-particles.js',
        format: 'es',
        sourcemap: true
    }, {
        file: 'dist/dizzy-particles.min.js',
        format: 'es',
        plugins: [terser()],
        sourcemap: true
    }]
};
