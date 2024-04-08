// Key that gets applied to the Sequelize instance in order to make sure that
// the same plugin doesn't get applied more than once.
const trackingKey = '__comment_plugin__';


// ---
// PUBLIC METHODS.
// ---

/**
 * To apply the Comment plug-in to the given sequelize instance.
 * @param {any} sequelizeDialect
 * @param {any} settings
 * @returns {any}
 */
export const CommentPlugin = (sequelizeDialect: any, settings: any = { newline: false }): any => {
    // Make sure we're not trying to apply the plug-in more than once to this instance.
    if (hasPlugin(sequelizeDialect)) {
        return (sequelizeDialect);
    } else {
        recordPlugin(sequelizeDialect);
    }

    settings = ensureSettings(settings);

    // Since the method signatures are not the same for all of the generator methods that
    // we're targeting, we have to explicitly define which argument offset includes the
    // options hash (that will contain our "comment" property).
    // --
    // - selectQuery(tableName, options, model)
    // - insertQuery(table, valueHash, modelAttributes, options)
    // - updateQuery(tableName, attrValueHash, where, options, attributes)
    // - deleteQuery(tableName, where, options)
    // - bulkInsertQuery(tableName, attrValueHashes, options, rawAttributes)
    const methods: { name: string, optionsArgument: number }[] = [
        {
            name: 'selectQuery',
            optionsArgument: 1
        },
        {
            name: 'insertQuery',
            optionsArgument: 3
        },
        {
            name: 'updateQuery',
            optionsArgument: 3
        },
        {
            name: 'deleteQuery',
            optionsArgument: 2
        },
        {
            name: 'bulkInsertQuery',
            optionsArgument: 2
        }
    ];

    const queryGenerator = sequelizeDialect.getQueryInterface().QueryGenerator || sequelizeDialect.getQueryInterface().queryGenerator;

    // Proxy each query generator method. The proxy will invoke the underlying / original
    // method and then prefix the comment (if the option exists) before passing on the
    // resultant SQL fragment.
    methods.forEach(
        function iterator(method) {
            const originalGeneratorMethod = queryGenerator[method.name];

            queryGenerator[method.name] = function proxyMethod(...args: any[]) {

                let baseFragment = originalGeneratorMethod.apply(this, args);
                const options = args[method.optionsArgument];

                if (options && options.comment) {
                    if (typeof baseFragment === 'object' && Object.prototype.hasOwnProperty.call(baseFragment, 'query')) {
                        baseFragment.query = `/* ${options.comment} */ ` + baseFragment.query;
                    } else if (typeof baseFragment === 'string') {
                        baseFragment = `/* ${options.comment} */ ` + baseFragment;
                    }
                }

                return baseFragment;
            };
        }
    );

    return (sequelizeDialect);
}


/*
 * PRIVATE METHODS
*/

/**
 * To ensure that the settings object exists and contains expected values.
 * @param {any} settings
 * @returns {any}
 */
function ensureSettings(settings: any): any {

    settings = (settings || {});

    if (!Object.prototype.hasOwnProperty.call(settings, 'newline')) {

        settings.newline = true;

    }

    return (settings);

}

/**
 * To return the delimiter that separates the comment from the SQL fragment.
 * @param {any} settings
 * @returns {any}
 */
// @ts-ignore
function getDelimiter(settings: any): any {

    return ((settings.newline && '\n') || ' ');

}

/**
 * To determine if the given Sequelize instance already has the plug-in applied to it.
 * @param {any} sequelizeDialect
 * @returns {any}
 */
function hasPlugin(sequelizeDialect: any): any {

    return (!!sequelizeDialect[trackingKey]);

}

/**
 * To prepare and prepend the given comment to the given SQL fragment.
 * @param {any} comment
 * @param {any} delimiter
 * @param {any} fragment
 * @returns {any}
 */
// @ts-ignore
function prependComment(comment: any, delimiter: any, fragment: any): any {
    if (typeof fragment === 'object') {
        const parts = [
            '/* ',
            sanitizeComment(comment),
            ' */',
            delimiter,
            fragment.query
        ];
        fragment.query = parts.join('');
        return (fragment);
    } else {
        const parts = [
            '/* ',
            sanitizeComment(comment),
            ' */',
            delimiter,
            fragment
        ];

        return (parts.join(''));
    }

}

/**
 * To record the fact that the plug-in is being applied to the given Sequelize instance.
 * @param {any} sequelizeDialect
 * @returns {any}
 */
function recordPlugin(sequelizeDialect: any): any {

    sequelizeDialect[trackingKey] = true;

}

/**
 * To sanitize the given comment value, ensuring that it won't break the syntax of the SQL comment in which it will be contained.
 * @param {any} comment
 * @returns {any}
 */
function sanitizeComment(comment: any): any {

    return (String(comment)
        .replace(/[\r\n]+/g, ' ')
        .replace(/\/\*|\*\\/g, ' '));

}
