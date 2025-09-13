#!/usr/bin/env node
import process from 'node:process';
import fs from 'node:fs';
import {Buffer} from 'node:buffer';
import meow from 'meow';
import stripBomStream from 'strip-bom-stream';

const cli = meow(`
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
`, {
	importMeta: import.meta,
	flags: {
		inPlace: {
			type: 'boolean',
			default: false,
		},
	},
});

function stripBomInPlace(filePath) {
	const fd = fs.openSync(filePath, 'r+');

	try {
		const bomBuffer = Buffer.alloc(3);
		const bytesRead = fs.readSync(fd, bomBuffer, 0, 3, 0);

		const hasBom = bytesRead >= 3 && bomBuffer[0] === 0xEF && bomBuffer[1] === 0xBB && bomBuffer[2] === 0xBF;

		if (!hasBom) {
			return false;
		}

		const stats = fs.fstatSync(fd);
		const fileSize = stats.size;

		const chunkSize = 64 * 1024;
		const buffer = Buffer.alloc(chunkSize);
		let readPosition = 3;
		let writePosition = 0;

		while (readPosition < fileSize) {
			const toRead = Math.min(chunkSize, fileSize - readPosition);
			const bytesRead = fs.readSync(fd, buffer, 0, toRead, readPosition);
			fs.writeSync(fd, buffer, 0, bytesRead, writePosition);
			readPosition += bytesRead;
			writePosition += bytesRead;
		}

		fs.ftruncateSync(fd, fileSize - 3);
		return true;
	} finally {
		fs.closeSync(fd);
	}
}

const {input} = cli;

if (input.length === 0 && process.stdin.isTTY) {
	console.error('Expected a filename');
	process.exit(1);
}

if (cli.flags.inPlace) {
	if (input.length === 0) {
		console.error('Cannot use --in-place with stdin');
		process.exit(1);
	}

	for (const file of input) {
		const hadBom = stripBomInPlace(file);
		console.error(`${file}: ${hadBom ? 'BOM removed' : 'no BOM found'}`);
	}
} else if (input.length > 0) {
	if (input.length > 1) {
		console.error('Only one file can be specified when not using --in-place');
		process.exit(1);
	}

	fs.createReadStream(input[0]).pipe(stripBomStream()).pipe(process.stdout);
} else {
	process.stdin.pipe(stripBomStream()).pipe(process.stdout);
}
