# strip-bom-cli

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
    $ strip-bom --in-place <file>…
    $ cat <file> | strip-bom > <new-file>

  Options
    --in-place  Modify the file in-place

  Examples
    $ strip-bom unicorn.txt > unicorn-without-bom.txt
    $ strip-bom --in-place unicorn.txt
    $ strip-bom --in-place *.txt
```

## Related

- [strip-bom](https://github.com/sindresorhus/strip-bom) - API for this module
