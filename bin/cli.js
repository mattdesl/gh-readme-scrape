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
    extension: 'e'
  }
})

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
    
    var urls = nodes.map(function (x) {
      return x.url
    })
    filterContentType(urls, findExtensions, function (results) {
      async.eachLimit(urls, ASYNC_LIMIT, function (item, next) {
        saveResource(item, function (err) {
          if (err) console.error(chalk.yellow('Error requesting URL contents: ' + item))
          else {
            return next(null)
          }
        })
      }, function (err) {
        done(err, urls)
      })
    })
  })
})

function done (err, urls) {
  if (err) console.error(err)
  else {
    console.error(chalk.green('Finished downloading ') + chalk.bold(urls.length) + chalk.green(' resources'))
  }
}

function filterContentType (urls, extensions, cb) {
  async.mapLimit(urls, ASYNC_LIMIT, function (url, next) {
    got.head(url, function (err, body, res) {
      if (err) {
        console.error(chalk.yellow('Error requesting URL: ') + url)
        return next(null, null)
      }
      
      if (res.headers && res.headers['content-type']) {
        var content = contentType.parse(res.headers['content-type'])
        var exts = mimeExtensions[content.type]
        var any = exts.some(function (ext) {
          return extensions.indexOf(ext) >= 0
        })
        return next(null, any ? url : null)
      } else {
        return next(null, null)
      }
    })
  }, function (err, results) {
    if (err) console.error(err)
    cb(results.filter(Boolean))
  })
}

function saveResource (url, cb) {
  var name = path.basename(url)
  var file = path.join(output, name)
  var out = fs.createWriteStream(file)
  console.error(chalk.magenta('Downloading ') + chalk.gray(name))
  got(url).pipe(out)
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
  got(url, { json: true }, function (err, result, res) {
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