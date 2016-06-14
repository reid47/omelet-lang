module.exports = {
    'env': {
        'browser': true,
        'node': true,
        'mocha': true
    },
    'extends': 'eslint:recommended',
    'rules': {
        'comma-spacing': [
            'error',
            { 'before': false, 'after': true }
        ],
        'curly': 'error',
        'indent': [
            'error',
            4
        ],
        'keyword-spacing': [
            'error',
            {'before': true, 'after': true}
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'no-console': [
            'error',
            {'allow': ['log', 'warn', 'error', 'time', 'timeEnd']}
        ],
        'no-trailing-spaces': [
            'error',
            {'skipBlankLines': true }
        ],
        'no-unneeded-ternary': 'error',
        'quotes': [
            'error',
            'single'
        ],
        'semi': [
            'error',
            'never'
        ],
        'space-in-parens': [
            'error',
            'never'
        ],
        'space-infix-ops': [
            'error',
            {'int32Hint': false}
        ]

    }
};