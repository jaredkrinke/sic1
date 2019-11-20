const { series, parallel, src, dest } = require("gulp");
const del = require("del");
const minifyJS = require("gulp-uglify");
const minifyCSS = require("gulp-clean-css");
const minifyHTML = require("gulp-htmlmin");
const concat = require("gulp-concat");
const replace = require("gulp-replace");

function clean() {
    return del("output");
}

function css(cb) {
    return src("css/*.css")
        .pipe(minifyCSS())
        .pipe(dest("output/css/"));
}

function html(cb) {
    return src("*.html")
        // Remove extra script tags here since all local scripts are concatenated into one
        .pipe(replace('<script src="../../lib/oisc.js"></script>', ""))
        .pipe(minifyHTML({
            collapseWhitespace: true,
            removeComments: true,
            minifyCSS: true,
            minifyJS: true,
        }))
        .pipe(dest("output/"));
}

function javascript(cb) {
    return src(["../../lib/oisc.js", "js/*.js"])
        .pipe(concat("sic1-client.js"))
        .pipe(minifyJS())
        .pipe(dest("output/js"));
}

const bundle = series(clean, parallel(css, html, javascript));

exports.default = bundle;
