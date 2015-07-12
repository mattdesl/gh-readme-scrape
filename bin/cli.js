#!/usr/bin/env node
var path = require('path')
var getUrls = require('gh-md-urls')
var parseRepo = require('github-url-to-object')
var got = require('got')
var contentType = require('content-type')
var mimeExtensions = require('mime-types').extensions
var async = require('async')
var mkdirp = require('mkdirp')
var path = require('path')
var fs = require('fs')
var chalk = require('chalk')

var ASYNC_LIMIT = 20
var argv = require('minimist')(process.argv.slice(2), {
  alias: {
    extension: 'e',
    rename: 'r'
  }
})

var timeout = typeof argv.timeout === 'number' ? argv.timeout : 4000
var repoUrl = argv._[0]
if (!repoUrl) {
  throw new Error('must provide GitHub repository')
}

var repo = parseRepo(repoUrl)
if (!repo) {
  throw new Error('could not parse repository URL')
}

var findExtensions = argv.extension
if (!Array.isArray(findExtensions)) {
  findExtensions = [ findExtensions ]
}

findExtensions = findExtensions.map(function (ext) {
  return ext && ext.split(',')
}).reduce(function (a, b) {
  return a.concat(b)
}, []).filter(Boolean)

if (findExtensions.length === 0) {
  throw new Error('must provide at least one extension to look for')
}

var output = argv._[1]
if (!output) {
  throw new Error('must specify output folder')
}

output = path.join(process.cwd(), output)

mkdirp(output, function (err) {
  if (err) throw err
  getReadme(repo, function (err, body) {
    if (err) throw err

    var nodes = getUrls(body, {
      repository: repoUrl,
      baseUrl: '' // don't resolve fragments
    }).filter(function (node) {
      var url = node.url
      return /^[^\#]/.test(url)
    })

    console.error(chalk.gray('Searching ' + chalk.bold(nodes.length) + ' links'))
    filterContentType(nodes, findExtensions, function (results) {
      nodes = results
      async.eachLimit(nodes, ASYNC_LIMIT, function (item, next) {
        saveResource(item, function (err) {
          if (err) {
            console.error(chalk.yellow('Error requesting URL contents: ' + item))
          } else {
            return next(null)
          }
        })
      }, function (err) {
        done(err, nodes)
      })
    })
  })
})

function done (err, urls) {
  if (err) console.error(err)
  else if (urls.length === 0) {
    console.error(chalk.yellow('No resources found'))
  } else {
    var word = urls.length === 1 ? 'resource' : 'resources'
    console.error(chalk.green('Finished downloading ') + chalk.bold(urls.length) + chalk.green(' ' + word))
  }
}

function filterContentType (nodes, extensions, cb) {
  async.mapLimit(nodes, ASYNC_LIMIT, function (node, next) {
    var url = node.url
    got.head(url, { timeout: timeout }, function (err, body, res) {
      if (err) {
        console.error(chalk.yellow('Error requesting URL: ') + url)
        return next(null, null)
      }

      if (argv.verbose) {
        console.error(chalk.dim('GET ' + url))
      }

      if (res.headers && res.headers['content-type']) {
        var content = contentType.parse(res.headers['content-type'])
        var exts = mimeExtensions[content.type]
        var any = exts.some(function (ext) {
          return extensions.indexOf(ext) >= 0
        })
        return next(null, any ? node : null)
      } else {
        return next(null, null)
      }
    })
  }, function (err, results) {
    if (err) console.error(err)
    cb(results.filter(Boolean))
  })
}

function saveResource (node, cb) {
  var url = node.url
  var ext = path.extname(node.url)
  var name = argv.rename ? (node.text + ext) : path.basename(url)
  var file = path.join(output, name)
  var out = fs.createWriteStream(file)
  console.error(chalk.magenta('Downloading ') + chalk.gray(name))
  var stream = got(url, { timeout: timeout })
    .on('error', cb)

  stream.pipe(out)
    .on('close', function () {
      cb(null)
    })
    .on('error', function (err) {
      cb(err)
    })
}

function getReadme (repo, cb) {
  var api = 'https://api.github.com/repos/'
  var url = api + repo.user + '/' + repo.repo + '/readme'
  got(url, { timeout: timeout, json: true }, function (err, result, res) {
    if (err) return cb(err)
    if (!(/^2/.test(res.statusCode))) return cb(new Error('invalid status code ' + res.statusCode))
    var contents = result.content
    try {
      var md = new Buffer(contents, result.encoding).toString('utf8')
      cb(null, md)
    } catch (e) {
      return cb(e)
    }
  })
}
