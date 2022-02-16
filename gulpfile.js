const { src, dest, watch, series } = require('gulp')
const del = require('del')
const concat = require('gulp-concat')
const rename = require('gulp-rename')
const browsersync = require('browser-sync').create()
const pug = require('gulp-pug')
const sass = require('gulp-sass')(require('sass'))
const terser = require('gulp-terser')
const postcss = require('gulp-postcss')
const cssnano = require('cssnano')
const imagemin = require('gulp-imagemin')
const autoprefixer = require('gulp-autoprefixer')
const svgmin = require('gulp-svgmin')
const webp = require('gulp-webp')
const versionNumber = require('gulp-version-number')

const settings = {
  clean: true,
  version: false,
}

const versionConfig = {
  value: '%MDS%',
  append: {
    key: 'v',
    to: ['css', 'js'],
  },
}

const paths = {
  input: 'src',
  output: 'dist',
  html: {
    input: 'src/*.pug',
    output: 'dist',
  },
  images: {
    input: 'src/images/**/*.{png,jpg,jpeg}',
    output: 'dist/images',
  },
  svg: {
    input: 'src/images/**/*.svg',
    output: 'dist/images',
  },
  css: {
    input: 'src/scss/*.scss',
    output: 'dist/css',
  },
  js: {
    input: 'src/js/*.js',
    output: 'dist/js',
  },
}

// create dist folder
const create = series(html, svg, images, css, js, reload)

// clean dist folder
const clean = function (done) {
  if (!settings.clean) return done()
  del.sync(paths.output)
  create()
  return done()
}

// compile pug files into html files and version css and js
function html() {
  return src(paths.html.input)
    .pipe(pug())
    .pipe(versionNumber(versionConfig))
    .pipe(rename({ extname: '.html' }))
    .pipe(dest(paths.html.output))
}

// minify svg files
function svg() {
  return src(paths.svg.input).pipe(svgmin()).pipe(dest(paths.svg.output))
}

// minify png, jpg images and convert to webp
function images() {
  return src(paths.images.input)
    .pipe(imagemin().on('error', (error) => console.log(error)))
    .pipe(webp())
    .pipe(dest(paths.images.output))
}

// compile and minify sass files
function css() {
  return src(paths.css.input, { sourcemaps: true })
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({ cascade: false }))
    .pipe(postcss([cssnano()]))
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.css.output, { sourcemaps: '.' }))
}

// minify js files
function js() {
  return src(paths.js.input, { sourcemaps: true })
    .pipe(terser().on('error', (error) => console.log(error)))
    .pipe(concat('scripts.js'))
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest(paths.js.output, { sourcemaps: '.' }))
}

// serve the dist folder
function serve(cb) {
  browsersync.init({
    server: {
      baseDir: paths.output,
    },
  })
  cb()
}

// reload the browser
function reload(cb) {
  browsersync.reload()
  cb()
}

function watcher() {
  watch(paths.html.input, series(html, reload))
  watch(paths.svg.input, series(svg, reload))
  watch(paths.images.input, series(images, reload))
  watch(paths.css.input, series(css, reload))
  watch(paths.js.input, series(js, reload))
}

exports.default = series(clean, serve, watcher)
