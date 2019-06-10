"use strict";
// Styles
const autoprefixer = require("autoprefixer"); // Live updates for dev
const cssnano = require("cssnano"); // CSS Minifier
const postcss = require("gulp-postcss");
const sass = require("gulp-sass");
// Gulp Specific modules
const gulp = require("gulp"); // CSS Post Processor - caniuse.com
const gulpNewer = require("gulp-newer");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const concat = require('gulp-concat');
// Javascript
const uglify = require('gulp-uglify');
// Image Tools
const gulpImagemin = require("gulp-imagemin");
const webp = require('gulp-webp');
const gulpImageresize = require('gulp-image-resize');
const parallelTransform = require("concurrent-transform");
const changed = require("gulp-changed");
const imageminPngquant = require('imagemin-pngquant');
const imageminZopfli = require('imagemin-zopfli');
const imageminMozjpeg = require('imagemin-mozjpeg'); //need to run 'brew install libpng'
const imageminGiflossy = require('imagemin-giflossy');
const os = require("os");
// Delete modules for clearing up old files
const del = require("del");
const deleteEmpty = require("delete-empty");
// Others
const cache = require('gulp-cache');
const merge2 = require("merge2");
const globby = require("globby");
const child_process = require("child_process");
const browsersync = require("browser-sync").create();
const execSync = require('child_process').execSync;
const sourcemaps = require('gulp-sourcemaps');
const htmlmin = require('gulp-htmlmin');
const ngrok = require('ngrok');
const psi = require('psi');
const ngrok_url = 'https://linaro-marketing.ngrok.io';

// const eslint = require("gulp-eslint");

console.time("gulp-timer");

// Gets the path to the jumbo-jekyll-theme
var themePath = execSync('bundle show jumbo-jekyll-theme').toString().replace(/(\r\n|\n|\r)/gm, "");

// Javascript Sources
var javascript_sources = [
    themePath + "/assets/js/vendor/jquery.js",
    themePath + "/assets/js/**/*",
    "assets/js/**/*"
];

const javascript_dest = "./_site/assets/js/";

// Sass Sources
var sass_sources = [
    themePath + "/_sass/**/*-package.scss",
    "_sass/**/*-package.scss"
    // "_sass/bootstrap/**/*",
    // "_sass/app/**/*",
    // "_sass/core/**/*",
];
// Sass Sources
var sass_include_paths = [
    themePath + "/_sass",
    "./_sass"
    // "_sass/bootstrap/**/*",
    // "_sass/app/**/*",
    // "_sass/core/**/*",
];
// sass_sources = jekyllThemeSupport(sass_sources);
const css_dest = "./_site/assets/css/";

// Add the Jekyll Theme base paths
function jekyllThemeSupport(sources) {
    sources.forEach(function (source) {
        let newSource = themePath + "/" + source;
        sources.push(newSource);
        console.log(newSource);
    });
    return sources;
}

// Image Transformation constants
const transforms = {
        "small": {
            src: "./assets/images/**/*.{jpg,jpeg,png}",
            dist: "./_site/assets/images/",
            params: {
                width: 400,
                crop: false
            }
        },
        "medium": {
            src: "./assets/images/**/*.{jpg,jpeg,png}",
            dist: "./_site/assets/images/",
            params: {
                width: 800,
                crop: false
            }
        },
        "large": {
            src: "./assets/images/**/*.{jpg,jpeg,png}",
            dist: "./_site/assets/images/",
            params: {
                width: 1400,
                crop: false
            }
        }
    };
// Minify HTML Source
function minify() {
    return gulp.src('./_site/**/*.html')
        .pipe(htmlmin({
            collapseWhitespace: true,
            continueOnParseError: true,
            minifyJS: true,
            minifyCSS: true
        }))
        .pipe(gulp.dest('./_site'));
}
// Concatenate & Minifiy CSS
// CSS is compiled from sass_sources and pushed through autoprefixer(add's cross browser support prefixes --web-kit etc)
// and then minified using cssnano via the PostCSS API
function css() {
    return gulp
        .src(sass_sources)
        .pipe(sourcemaps.init())
        .pipe(plumber())
        .pipe(sass({ outputStyle: "expanded", includePaths: sass_include_paths }))
        .pipe(gulp.dest(css_dest))
        .pipe(rename({ suffix: ".min" }))
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(css_dest))
        .pipe(browsersync.stream());
}
// Concatenate & Minify Javascript
function scripts() {
    return (
        gulp
            .src(javascript_sources)
            .pipe(sourcemaps.init())
            .pipe(concat('concat.js'))
            .pipe(gulp.dest(javascript_dest))
            .pipe(rename('package.js'))
            .pipe(uglify())
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest(javascript_dest))
            .pipe(browsersync.stream())
    );
}
// BrowserSync
function browserSync(done) {
    browsersync.init({
        server: {
            baseDir: "./_site/"
        },
        port: 4000
    });
    done();
}
// BrowserSync Reload
function browserSyncReload(done) {
    browsersync.reload();
    done();
}
// Clean assets
function clean() {
    return del(["./_site/assets/min/"]);
}
/**
 * Copy original images
 * - check if images are newer than existing ones
 * - if they are, optimise and copy them
 * - ignore (empty) directories
 */

// Caches and minifies PNG images
function minifyPNG(){
    return gulp.src("./assets/images/**/*.{png,PNG}", { nodir: true })
        .pipe(gulpNewer("./_site/assets/images/"))
        .pipe(cache(gulpImagemin([
            //png
            imageminPngquant({
                speed: 1,
                quality: [0.95, 1] //lossy settings
            })
        ])))
        .pipe(gulp.dest("./_site/assets/images/"));
}
// Caches and minifies GIF images
function minifyGif(){
    return gulp.src("./assets/images/**/*.{GIF,gif}", { nodir: true })
        .pipe(gulpNewer("./_site/assets/images/"))
        .pipe(cache(gulpImagemin([
            imageminGiflossy({
                optimizationLevel: 3,
                optimize: 3, //keep-empty: Preserve empty transparent frames
                lossy: 2
            })
        ])))
        .pipe(gulp.dest("./_site/assets/images/"));
}
// Caches and minifies SVG images
function minifySVG(){
    return gulp.src("./assets/images/**/*.{SVG,svg}", { nodir: true })
        .pipe(gulpNewer("./_site/assets/images/"))
        .pipe(cache(gulpImagemin([
            gulpImagemin.svgo({
                plugins: [{
                    removeViewBox: false
                }]
            })
        ])))
        .pipe(gulp.dest("./_site/assets/images/"));
}
// Caches and minifies JPG images
function minifyJPG(){
    return gulp.src("./assets/images/**/*.{JPG,JPEG,jpg,jpeg}", { nodir: true })
        .pipe(gulpNewer("./_site/assets/images/"))
        .pipe(cache(gulpImagemin([
            //jpg lossless
            gulpImagemin.jpegtran({
                progressive: true
            })
        ])))
        .pipe(gulp.dest("./_site/assets/images/"));
}
function imgWebP() {
    return gulp.src("./_site/assets/images/**/*.{jpg,jpeg,png}")
        .pipe(cache(webp()))
        .pipe(gulp.dest("./_site/assets/images/webp"))
}
function ngrok_site(){
    ngrok.connect({
        authtoken: '5Q52X8PodXvgeZroL8GYa_74uxA2q9dtxW8LrXtJydp', //2BUMGp1fJDzPal7FvxN2
        //httpauth: 'login:password',
        port: 4000
    }, function (err, url) {
        ngrok_url = url;
        console.log(url);
        if (err !== null) {
            console.log(err);
        }
        else{
            console.log(url);
        }
    }); 
}
function pageSpeedInsights(){
    return psi({
        nokey: 'true', // or use key: ‘YOUR_API_KEY’
        url: "https://www.linaro.org",
        strategy: 'mobile'
    });
}
/**
 * Make thumbnails
 * 1. walk transforms array to build an array of streams
 *    - get src images
 *    - check if images in src are newer than images in dist
 *    - if they are, make thumbnails and minify
 * 2. merge streams to create all thumbnails in parallel
 */
function smallThumbs() {
    const transformation = transforms["small"];
    return gulp.src(transformation.src)
        .pipe(changed(transformation.dist + transformation.params.width))
        .pipe(parallelTransform(gulpImageresize({
            imageMagick: true,
            width: transformation.params.width,
            crop: transformation.params.crop
        }), os.cpus().length))
        .pipe(gulp.dest(transformation.dist + transformation.params.width));
}
function mediumThumbs() {
    const transformation = transforms["medium"];
    return gulp.src(transformation.src)
        .pipe(changed(transformation.dist + transformation.params.width))
        .pipe(parallelTransform(gulpImageresize({
            imageMagick: true,
            width: transformation.params.width,
            crop: transformation.params.crop
        }), os.cpus().length))
        .pipe(gulp.dest(transformation.dist + transformation.params.width));
}
function largeThumbs() {
    const transformation = transforms["large"];
    return gulp.src(transformation.src)
        .pipe(changed(transformation.dist + transformation.params.width))
        .pipe(parallelTransform(gulpImageresize({
            imageMagick: true,
            width: transformation.params.width,
            crop: transformation.params.crop
        }), os.cpus().length))
        .pipe(gulp.dest(transformation.dist + transformation.params.width));
}
/**
 * Clean images
 * 1. get arrays of filepaths in images src (base images) and dist (base images and thumbnails)
 * 2. Diffing process
 *    - build list of filepaths in src
 *    - loop through filepaths in dist, remove dist and thumbnails specific parts
 *      to get both base images and corresponding thumbnails, compare with filepaths in src
 *    - if no match, add full dist image filepath to delete array
 * 3. Delete files (base images and thumbnails)
 */
function imgClean() {
    // get arrays of src and dist filepaths (returns array of arrays)
    return Promise.all([
        globby("./assets/images/**/*", { nodir: true }),
        globby("./_site/assets/images/**/*", { nodir: true })
    ])
        .then((paths) => {
            // create arrays of filepaths from array of arrays returned by promise
            const srcFilepaths = paths[0];
            const distFilepaths = paths[1];
            // empty array of files to delete
            const distFilesToDelete = [];
            // diffing
            distFilepaths.map((distFilepath) => {
                // sdistFilepathFiltered: remove dist root folder and thumbs folders names for comparison
                const distFilepathFiltered = distFilepath.replace(/\/_site/, "").replace(/[0-9]+x\//, "");
                // check if simplified dist filepath is in array of src simplified filepaths
                // if not, add the full path to the distFilesToDelete array
                if (srcFilepaths.indexOf(distFilepathFiltered) === -1) {
                    distFilesToDelete.push(distFilepath);
                }
            });
            // return array of files to delete
            return distFilesToDelete;
        })
        .then((distFilesToDelete) => {
            // delete files
            del.sync(distFilesToDelete);
        })
        .catch((error) => {
            console.log(error);
        });
}
/**
 * Clean unused directories
 * 1. Diffing process between src and dist
 *    - Build array of all thumbs_xxx directories that should exist using the transforms map
 *    - Build array of all thumbs_xxx directories actually in dist
 *    - Diffing: array of all unused thumbnails directories in dist
 * 2. Delete files
 * 3. Delete all empty folders in dist images
 */
function imgCleanDirectories() {
    return globby("./_site/assets/images/**/+([0-9])/")
        .then((paths) => {
            console.log("All thumbs folders: " + paths);
            // existing thumbs directories in dist
            const distThumbsDirs = paths;
            // create array of dirs that should exist by walking transforms map
            const srcThumbsDirs = transforms.map((transform) => transform.dist + transform.params.width + "/");
            // array of dirs to delete
            const todeleteThumbsDirs = distThumbsDirs.filter((el) => srcThumbsDirs.indexOf(el) === -1);
            console.log("To delete thumbs folders: " + todeleteThumbsDirs);
            // pass array to next step
            return todeleteThumbsDirs;
        })
        .then((todeleteThumbsDirs) => {
            // deleted diff thumbnails directories
            del.sync(todeleteThumbsDirs);
        })
        .then(() => {
            // delete empty directories in dist images
            deleteEmpty.sync("./_site/assets/images/");
        })
        .catch((error) => {
            console.log(error);
        });
}
// Build the Jekyll Site
function jekyll() {
    return child_process.spawn("bundle", ["exec", "jekyll", "build"], { stdio: "inherit" });
}
// Build the Jekyll Staging Site
function jekyll_staging() {
    return child_process.spawn("bundle", ["exec", "jekyll", "build", "--config", "_config-staging.yml"], { stdio: "inherit" });
}
// Build the Jekyll Production Site
function jekyll_production() {
    return child_process.spawn("bundle", ["exec", "jekyll", "build", "--config", "_config-production.yml"], { stdio: "inherit" });
}
// Watch files
function watchFiles() {
    gulp.watch("./assets/css/**/*", css);
    gulp.watch("./assets/js/**/*", gulp.series(scripts));
    gulp.watch(
        [
            "./_includes/**/*",
            "./_layouts/**/*",
            "./_pages/**/*",
            "./_posts/**/*",
            "./_data/**/*"
        ],
        gulp.series(jekyll, tasks, browserSyncReload)
    );
    gulp.watch("./assets/images/**/*", imagesPipeline);
}

const imagesPipeline = gulp.series(gulp.parallel(smallThumbs, mediumThumbs, largeThumbs), imgWebP);
const js = gulp.series(scripts);
const tasks = gulp.series(clean, gulp.parallel(css, imagesPipeline, scripts));
const build = gulp.series(clean, jekyll, css, scripts, imagesPipeline);
const postBuild = gulp.series(minify);
const ngrok_build = gulp.series(ngrok_site)
// export tasks
exports.images = imagesPipeline;
exports.css = css;
exports.ngrok_site_build = ngrok_build;
exports.js = js;
exports.jekyll = jekyll;
exports.clean = clean;
exports.build = build;
exports.minify = minify;
exports.tasks = tasks;
exports.serve = gulp.series(clean, build, gulp.parallel(watchFiles, browserSync));
exports.default = gulp.series(clean, build, postBuild, gulp.parallel(watchFiles, browserSync));;
console.timeEnd("gulp-timer");