#!/usr/bin/env node
import process from 'node:process';
import fs from 'node:fs';
import meow from 'meow';
import stripBomStream from 'strip-bom-stream';

const cli = meow(`
	Usage
	  $ strip-bom <file> > <new-file>
	  $ cat <file> | strip-bom > <new-file>

	Example
	  $ strip-bom unicorn.txt > unicorn-without-bom.txt
`, {
	importMeta: import.meta,
});

const input = cli.input[0];

if (!input && process.stdin.isTTY) {
	console.error('Expected a filename');
	process.exit(1);
}

if (input) {
	fs.createReadStream(input).pipe(stripBomStream()).pipe(process.stdout);
} else {
	process.stdin.pipe(stripBomStream()).pipe(process.stdout);
}
