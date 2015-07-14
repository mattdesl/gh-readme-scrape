# gh-readme-scrape

[![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)

![screen](http://i.imgur.com/kfmkGFj.png)

A small CLI which scrapes GitHub readme pages for links and images of a certain file type, and then bulk downloads them into a destination folder.

## Install

```sh
npm install -g gh-readme-scrape
```

## Examples

For example, to bulk download the SVGs from [gilbarbara/logos](https://github.com/gilbarbara/logos):

```sh
gh-readme-scrape gilbarbara/logos logos/ -e svg
```

This will save all the SVGs into a local folder called `logos`, see below:

![image](http://i.imgur.com/69BHg0K.png)

Or, to bulk download PDFs from the [graphics-resources](https://github.com/mattdesl/graphics-resources) readme:

```sh
gh-readme-scrape mattdesl/graphics-resources papers/ -e pdf --rename
```

The `--rename` flag will use the anchor text in the markdown to determine the file name. Result:

![image](http://i.imgur.com/QnO0iAE.png)

## Usage

[![NPM](https://nodei.co/npm/gh-readme-scrape.png)](https://www.npmjs.com/package/gh-readme-scrape)


```sh
Usage:
  gh-readme-scrape repository output [opts]

Options:
  --extension, -e  a list of extensions, comma-separated
  --rename, -r     rename filenames to the Markdown anchor text
  --timeout=n      ms timeout before failing a request (default 4000ms)
  --verbose        log all requests
  --auth           authorize the readme request with GH API
```

The `repository` can be a full URL to the repository, or a shorthand like `gilbarbara/logos`.

The extensions can be comma-separated, such as:

```sh
gh-readme-scrape gilbarbara/logos tmp -e svg,png,gif
```

## License

MIT, see [LICENSE.md](http://github.com/mattdesl/gh-readme-scrape/blob/master/LICENSE.md) for details.
