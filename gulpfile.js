/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');
const decompress = require('gulp-decompress');
const download = require('gulp-download');
const path = require('path');
const fse = require('fs-extra');
const os = require('os');
const cp = require('child_process');
const glob = require('glob');

const env = process.env;

gulp.task('webpack-dev', async () => {
    preWebpack();
    return spawn(path.join(__dirname, './node_modules/.bin/webpack'), ['--mode', 'development'], { stdio: 'inherit', env });
});

gulp.task('webpack-prod', async () => {
    preWebpack();
    return spawn(path.join(__dirname, './node_modules/.bin/webpack'), ['--mode', 'production'], { stdio: 'inherit', env });
});

/**
 * Installs the azure account extension before running tests (otherwise our extension would fail to activate)
 * NOTE: The version isn't super important since we don't actually use the account extension in tests
 */
gulp.task('install-azure-account', async () => {
    const version = '0.4.3';
    const extensionPath = path.join(os.homedir(), `.vscode/extensions/ms-vscode.azure-account-${version}`);
    const existingExtensions = glob.sync(extensionPath.replace(version, '*'));
    if (existingExtensions.length === 0) {
        return download(`http://ms-vscode.gallery.vsassets.io/_apis/public/gallery/publisher/ms-vscode/extension/azure-account/${version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`)
            .pipe(decompress({
                filter: file => file.path.startsWith('extension/'),
                map: file => {
                    file.path = file.path.slice(10);
                    return file;
                }
            }))
            .pipe(gulp.dest(extensionPath));
    } else {
        console.log('Azure Account extension already installed.');
    }
});

gulp.task('test', gulp.series('install-azure-account', async () => {
    env.DEBUGTELEMETRY = 1;
    env.CODE_TESTS_WORKSPACE = path.join(__dirname, 'test/test.code-workspace');
    env.CODE_TESTS_PATH = path.join(__dirname, 'dist/test');
    return spawn('node', ['./node_modules/vscode/bin/test'], { stdio: 'inherit', env });
}));

function spawn(command, args, options) {
    if (process.platform === 'win32') {
        if (fse.pathExistsSync(command + '.exe')) {
            command = command + '.exe';
        } else if (fse.pathExistsSync(command + '.cmd')) {
            command = command + '.cmd';
        }

    }

    return cp.spawn(command, args, options);
}

function preWebpack() {
    // without this, webpack can run out of memory in some environments
    env.NODE_OPTIONS = '--max-old-space-size=8192';
}
