import security from 'eslint-plugin-security';

export default [
    security.configs.recommended,
    {
        files: ['src/**/*.js'],
        rules: {
            'security/detect-object-injection': 'warn',
            'security/detect-non-literal-fs-filename': 'warn',
        },
    },
];
