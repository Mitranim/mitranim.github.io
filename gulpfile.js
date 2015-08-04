'use strict'

/**
 * Requires gulp 4.0:
 *   "gulp": "git://github.com/gulpjs/gulp#4.0"
 */

/* ***************************** Dependencies ********************************/

var $ = require('gulp-load-plugins')()
var bsync = require('browser-sync').create()
var cheerio = require('cheerio')
var gulp = require('gulp')
var hjs = require('highlight.js')
var marked = require('gulp-marked/node_modules/marked')
var flags = require('yargs').argv
var webpack = require('webpack')
var pt = require('path')
var _ = require('lodash')

/* ******************************** Globals **********************************/

var src = {
  html: [
    'src/html/**/*'
  ],
  xml: [
    'src/html/**/*.yaml',
    'src/html/thoughts/**/*',
    '!src/html/thoughts/index.html',
    'src/xml/**/*'
  ],
  robots: 'src/robots.txt',
  scripts: [
    'src/app/**/*.js',
    'node_modules/stylific/lib/stylific.min.js',
    'node_modules/simple-pjax/lib/simple-pjax.min.js'
  ],
  scriptsCore: 'src/app/app.js',
  stylesCore: 'src/styles/app.scss',
  styles: [
    'src/styles/**/*.scss',
    'node_modules/stylific/scss/**/*.scss'
  ],
  images: 'src/images/**/*',
  fonts: [
    'node_modules/font-awesome/fonts/**/*'
  ]
}

var dest = {
  html: 'mitranim-master',
  xml: 'mitranim-master/**/*.xml',
  scripts: 'mitranim-master/app/**/*.js',
  styles: 'mitranim-master/styles',
  images: 'mitranim-master/images',
  fonts: 'mitranim-master/fonts',
  app: 'mitranim-master/app'
}

function prod () {
  return flags.prod === true || flags.prod === 'true'
}

function reload (done) {
  bsync.reload()
  done()
}

/* *************************** Template Imports ******************************/

/**
 * Utility methods for templates.
 */
var imports = {
  prod: prod,
  bgImg: function (path) {
    return 'style="background-image: url(/images/' + path + ')"'
  },
  truncate: function (html, num) {
    var part = cheerio(html).text().slice(0, num)
    if (part.length === num) part += ' ...'
    return part
  }
}

/* ******************************** Config ***********************************/

/**
 * marked rendering enhancements.
 */

// Custom heading renderer func that adds an anchor.
marked.Renderer.prototype.heading = function (text, level, raw) {
  var id = this.options.headerPrefix + raw.toLowerCase().replace(/[^\w]+/g, '-')
  return '<h' + level + '>' +
    '<span>' + text + '</span>' +
    '<a class="heading-anchor fa fa-link" href="#' + id + '" id="' + id + '"></a>' +
    '</h' + level + '>\n'
}

// Custom link renderer func that adds target="_blank" to links to other sites.
// Mostly copied from the marked source.
marked.Renderer.prototype.link = function (href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase()
    } catch (e) {
      return ''
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return ''
    }
  }
  var out = '<a href="' + href + '"'
  if (title) {
    out += ' title="' + title + '"'
  }
  if (/^[a-z]+:\/\//.test(href)) {
    out += ' target="_blank"'
  }
  out += '>' + text + '</a>'
  return out
}

// Default code renderer.
var renderCode = marked.Renderer.prototype.code

// Custom code renderer that understands a few custom directives.
marked.Renderer.prototype.code = function (code, lang, escaped) {
  // var regexInclude = /#include (.*)(?:\n|$)/g
  var regexCollapse = /#collapse (.*)(?:\n|$)/g

  // if (regexInclude.test(code)) {
  //   code = code.replace(regexInclude, function (match, path) {
  //     return fs.readFileSync(path, 'utf8').trim()
  //   })
  // }

  // Remove collapse directives and remember if there were any.
  var collapse = regexCollapse.exec(code)
  if (collapse) {
    var label = collapse[1]
    code = code.replace(regexCollapse, '').trim()
  }

  // Default render with highlighting.
  code = renderCode.call(this, code, lang, escaped).trim()

  // Optionally wrap in collapse.
  if (label) {
    code =
      '<div class="sf-collapse">\n' +
      '  <label class="theme-primary">' + label + '</label>\n' +
      '  <div class="sf-collapse-body">\n' +
           code + '\n' +
      '  </div>\n' +
      '</div>'
  }

  return code
}

/* ********************************* Tasks ***********************************/

/* -------------------------------- Scripts ---------------------------------*/

gulp.task('scripts:build', function (done) {
  var alias = {
    'firebase': 'firebase/lib/firebase-web',
    'foliant': 'foliant/dist/index',
    'lodash': 'lodash/index',
    'stylific': 'stylific/lib/stylific.min',
    'simple-pjax': 'simple-pjax/lib/simple-pjax.min'
  }
  if (prod()) alias.react = 'react/dist/react.min'

  webpack({
    entry: './' + src.scriptsCore,
    output: {
      path: pt.join(process.cwd(), dest.html),
      filename: 'app.js'
    },
    resolve: {
      alias: alias
    },
    module: {
      loaders: [
        {
          test: /\.jsx?$/,
          exclude: /(node_modules|bower_components)/,
          loader: 'babel',
          query: {
            modules: 'common',
            optional: [
              'spec.protoToAssign',
              'es7.classProperties',
              'es7.decorators',
              'es7.functionBind',
              'validation.undeclaredVariableCheck'
            ],
            loose: [
              'es6.classes',
              'es6.properties.computed',
              'es6.forOf'
            ]
          }
        }
      ]
    },
    plugins: prod() ? [new webpack.optimize.UglifyJsPlugin()] : []
  }, function (err, stats) {
    if (err) {
      throw new Error(err)
    } else {
      var report = stats.toString({
        colors: true,
        chunks: false,
        timings: false,
        version: false,
        hash: false,
        assets: false
      })
      if (report) console.log(report)
    }
    done()
  })
})

gulp.task('scripts:watch', function () {
  $.watch(src.scripts, gulp.series('scripts:build', reload))
})

/* -------------------------------- Styles ----------------------------------*/

gulp.task('styles:clear', function () {
  return gulp.src(dest.styles, {read: false, allowEmpty: true})
    .pipe($.plumber())
    .pipe($.rimraf())
})

gulp.task('styles:compile', function () {
  return gulp.src(src.stylesCore)
    .pipe($.plumber())
    .pipe($.sass())
    .pipe($.autoprefixer())
    .pipe($.base64({
      baseDir: '.',
      extensions: ['svg']
    }))
    .pipe($.if(prod(), $.minifyCss({
      keepSpecialComments: 0,
      aggressiveMerging: false,
      advanced: false
    })))
    .pipe(gulp.dest(dest.styles))
    .pipe(bsync.reload({stream: true}))
})

gulp.task('styles:build',
  gulp.series('styles:clear', 'styles:compile'))

gulp.task('styles:watch', function () {
  $.watch(src.styles, gulp.series('styles:build'))
})

/* --------------------------------- HTML -----------------------------------*/

gulp.task('html:clear', function () {
  return gulp.src([
      dest.html + '/**/*.html',
      '!' + dest.app + '/**/*'
    ], {read: false, allowEmpty: true})
    .pipe($.plumber())
    .pipe($.rimraf())
})

gulp.task('html:compile', function () {
  var filterMd = $.filter('**/*.md')

  return gulp.src(src.html)
    .pipe($.plumber())
    // Pre-process markdown files.
    .pipe(filterMd)
    .pipe($.marked({
      gfm: true,
      tables: true,
      breaks: false,
      sanitize: false,
      smartypants: true,
      pedantic: false,
      // Code highlighter.
      highlight: function (code, lang) {
        if (lang) return hjs.highlight(lang, code).value
        return hjs.highlightAuto(code).value
      }
    }))
    // Add hljs code class.
    .pipe($.replace(/<pre><code class="(.*)">|<pre><code>/g,
                    '<pre><code class="hljs $1">'))
    // Restore other files.
    .pipe(filterMd.restore())
    // Unpack commented HTML parts.
    .pipe($.replace(/<!--\s*:((?:[^:]|:(?!\s*-->))*):\s*-->/g, '$1'))
    // Render all html.
    .pipe($.statil({imports: imports}))
    // Change each `<filename>` into `<filename>/index.html`.
    .pipe($.rename(function (path) {
      switch (path.basename + path.extname) {
        case 'index.html': case '404.html': return
      }
      path.dirname = pt.join(path.dirname, path.basename)
      path.basename = 'index'
    }))
    .pipe($.if(prod(), $.minifyHtml({
      empty: true
    })))
    // Write to disk.
    .pipe(gulp.dest(dest.html))
})

// Copy robots.txt.
gulp.task('html:robots', function () {
  return gulp.src(src.robots).pipe(gulp.dest(dest.html))
})

gulp.task('html:build', gulp.series('html:clear', 'html:compile', 'html:robots'))

gulp.task('html:watch', function () {
  $.watch(src.html, gulp.series('html:build', reload))
})

/* ---------------------------------- XML -----------------------------------*/

gulp.task('xml:clear', function () {
  return gulp.src(dest.xml, {read: false, allowEmpty: true}).pipe($.rimraf())
})

gulp.task('xml:compile', function () {
  var filterMd = $.filter('**/*.md')

  return gulp.src(src.xml)
    .pipe($.plumber())
    // Pre-process markdown files.
    .pipe(filterMd)
    .pipe($.marked({
      gfm: true,
      tables: true,
      breaks: false,
      sanitize: false,
      smartypants: true,
      pedantic: false
    }))
    // Restore other files.
    .pipe(filterMd.restore())
    .pipe($.statil({imports: imports}))
    .pipe($.filter('*feed*'))
    .pipe($.rename('feed.xml'))
    .pipe(gulp.dest(dest.html))
})

gulp.task('xml:build', gulp.series('xml:compile'))

gulp.task('xml:watch', function () {
  $.watch(src.html, gulp.series('xml:build'))
  $.watch(src.xml, gulp.series('xml:build'))
})

/* -------------------------------- Images ----------------------------------*/

gulp.task('images:clear', function () {
  return gulp.src(dest.images, {read: false, allowEmpty: true}).pipe($.rimraf())
})

// Resize and copy images
gulp.task('images:normal', function () {
  return gulp.src(src.images)
    /**
    * Experience so far.
    * {quality: 1} -> reduces size by ≈66% with no resolution change and no visible quality change
    * {quality: 1, width: 1920} -> reduces size by ≈10 times for hi-res images
    */
    .pipe($.imageResize({
      quality: 1,
      width: 1920,    // max width
      upscale: false
    }))
    .pipe(gulp.dest(dest.images))
})

// Minify and copy images.
gulp.task('images:small', function () {
  return gulp.src(src.images)
    .pipe($.imageResize({
      quality: 1,
      width: 640,    // max width
      upscale: false
    }))
    .pipe(gulp.dest(dest.images + '/small'))
})

// Crop images to small squares
gulp.task('images:square', function () {
  return gulp.src(src.images)
    .pipe($.imageResize({
      quality: 1,
      gravity: 'Center',  // crop relative to center
      crop: true,
      width: 640,
      height: 640,
      upscale: false
    }))
    .pipe(gulp.dest(dest.images + '/square'))
})

gulp.task('images:build',
  gulp.series('images:clear',
    gulp.parallel('images:normal', 'images:small', 'images:square')))

gulp.task('images:watch', function () {
  $.watch(src.images, gulp.series('images:build', reload))
})

/* --------------------------------- Fonts ----------------------------------*/

gulp.task('fonts:clear', function () {
  return gulp.src(dest.fonts, {read: false, allowEmpty: true}).pipe($.rimraf())
})

gulp.task('fonts:copy', function () {
  return gulp.src(src.fonts).pipe(gulp.dest(dest.fonts))
})

gulp.task('fonts:build', gulp.series('fonts:copy'))

gulp.task('fonts:watch', function () {
  $.watch(src.fonts, gulp.series('fonts:build', reload))
})

/* -------------------------------- Server ----------------------------------*/

gulp.task('server', function () {
  return bsync.init({
    startPath: '/',
    server: {
      baseDir: './',
      middleware: function (req, res, next) {
        if (req.url[0] !== '/') req.url = '/'  + req.url

        if (_.any([
            /node_modules/, /bower_components/, /mitranim-master/, /env\.js/
          ], function (reg) {return reg.test(req.url)})) {
          next()
          return
        }

        if (req.url === '/') req.url = '/' + dest.html + '/index.html'
        else req.url = '/' + dest.html + req.url

        next()
      }
    },
    port: 11204,
    online: false,
    ui: false,
    files: false,
    ghostMode: false,
    notify: true
  })
})

/* -------------------------------- Default ---------------------------------*/

gulp.task('build', gulp.parallel(
  'scripts:build', 'styles:build', 'html:build', 'xml:build', 'fonts:build'
))

gulp.task('watch', gulp.parallel(
  'scripts:watch', 'styles:watch', 'html:watch', 'xml:watch', 'fonts:watch'
))

gulp.task('default', gulp.series('build', gulp.parallel('watch', 'server')))
