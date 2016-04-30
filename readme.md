# strip-bom-cli [![Build Status](https://travis-ci.org/sindresorhus/strip-bom-cli.svg?branch=master)](https://travis-ci.org/sindresorhus/strip-bom-cli)

> Strip UTF-8 [byte order mark](http://en.wikipedia.org/wiki/Byte_order_mark#UTF-8) (BOM)

From Wikipedia:

> The Unicode Standard permits the BOM in UTF-8, but does not require nor recommend its use. Byte order has no meaning in UTF-8.


## Install

```
$ npm install --global strip-bom-cli
```


## Usage

```
$ strip-bom --help

  Usage
    $ strip-bom <file> > <new-file>
    $ cat <file> | strip-bom > <new-file>

  Example
    $ strip-bom unicorn.txt > unicorn-without-bom.txt
```


## Related

- [strip-bom](https://github.com/sindresorhus/strip-bom) - API for this module


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
