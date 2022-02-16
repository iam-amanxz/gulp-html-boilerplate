const fs = require('fs')
const { src, dest, watch, series } = require('gulp')
const del = require('del')
const inject = require('gulp-inject-string')
const rename = require('gulp-rename')
const browsersync = require('browser-sync').create()
const pug = require('gulp-pug')
const sass = require('gulp-sass')(require('sass'))
const postcss = require('gulp-postcss')
const cssnano = require('cssnano')
const imagemin = require('gulp-imagemin')
const autoprefixer = require('gulp-autoprefixer')
const svgmin = require('gulp-svgmin')
const webp = require('gulp-webp')
const ampOptimizer = require('@ampproject/toolbox-optimizer').create()
const globby = require('globby')
const replace = require('gulp-string-replace')

const settings = {
  clean: true,
}

const paths = {
  input: 'src',
  output: 'dist',
  html: {
    input: [
      'src/**/*.pug',
      '!src/templates/**/*.pug',
      '!src/includes/**/*.pug',
    ],
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
}

// create dist folder
const create = series(html, svg, images, css, injectCss, reload)

// clean dist folder
const clean = function (done) {
  if (!settings.clean) return done()
  del.sync(paths.output)
  create()
  return done()
}

// compile pug files into html files
function html() {
  return src(paths.html.input)
    .pipe(pug())
    .pipe(rename({ extname: '.html' }))
    .pipe(dest('dist'))
}

// inject css inside amp-custom tag
function injectCss() {
  const css = fs.readFileSync(paths.css.output + '/main.min.css', 'utf8')
  //todo: find a way to inject only required css in each page
  return src('dist/**/*.html')
    .pipe(
      replace(
        /(<style amp-custom>)([\s\S]*)(<\/style>)/g,
        '<style amp-custom></style>',
      ),
    )
    .pipe(inject.after('<style amp-custom>', css))
    .pipe(dest(paths.html.output))
}

// optimize amp html files
function optimizeAmp(done) {
  globby(['dist/**/*.html'])
    .then((files) => {
      files.forEach((file) => {
        const html = fs.readFileSync(file, 'utf8')
        const filePath = file.replace(/\\/g, '/')
        ampOptimizer.transformHtml(html).then((result) => {
          fs.writeFileSync(filePath, result)
        })
      })
    })
    .finally(done)
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
  watch(paths.html.input, series(html, injectCss, reload))
  watch(paths.svg.input, series(svg, reload))
  watch(paths.images.input, series(images, reload))
  watch(paths.css.input, series(css, injectCss, reload))
}

exports.default = series(clean, serve, watcher)

exports.optimize = optimizeAmp
