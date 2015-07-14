#!/usr/bin/env node
var url = 'http://github.com/mattdesl/graphics-resources/blob/master/LICENSE.md'
require('got')(url, {
  // json: true,
  timeout: 4000
}, function (err, result, res) {
  if (err) {
    return console.error('err', err.message)
  }
  console.log("RESULT", result.url)
})