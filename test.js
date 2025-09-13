import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'ava';
import {execa} from 'execa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, 'cli.js');
const BOM = '\uFEFF';

test('main', async t => {
	const {stdout} = await execa(cliPath, ['--version']);
	t.true(stdout.length > 0);
});

test('strips BOM from file', async t => {
	const testFile = path.join(__dirname, 'test-strip.txt');
	fs.writeFileSync(testFile, BOM + 'unicorn');

	const {stdout} = await execa(cliPath, [testFile]);
	t.is(stdout, 'unicorn');

	fs.unlinkSync(testFile);
});

test('works with stdin', async t => {
	const {stdout} = await execa(cliPath, [], {
		input: BOM + 'unicorn',
	});
	t.is(stdout, 'unicorn');
});

test('in-place flag strips BOM from file', async t => {
	const testFile = path.join(__dirname, 'test-in-place.txt');
	fs.writeFileSync(testFile, BOM + 'unicorn');

	const {stderr} = await execa(cliPath, ['--in-place', testFile]);
	t.regex(stderr, /BOM removed/);

	const content = fs.readFileSync(testFile, 'utf8');
	t.is(content, 'unicorn');

	fs.unlinkSync(testFile);
});

test('in-place flag preserves file permissions', async t => {
	const testFile = path.join(__dirname, 'test-permissions.sh');
	fs.writeFileSync(testFile, BOM + '#!/bin/bash\necho test');
	fs.chmodSync(testFile, 0o755);

	const statsBefore = fs.statSync(testFile);
	const {stderr} = await execa(cliPath, ['--in-place', testFile]);
	t.regex(stderr, /BOM removed/);
	const statsAfter = fs.statSync(testFile);

	t.is(statsAfter.mode, statsBefore.mode);

	const content = fs.readFileSync(testFile, 'utf8');
	t.is(content, '#!/bin/bash\necho test');

	fs.unlinkSync(testFile);
});

test('in-place flag does nothing when no BOM', async t => {
	const testFile = path.join(__dirname, 'test-no-bom.txt');
	const originalContent = 'no BOM here';
	fs.writeFileSync(testFile, originalContent);

	const {stderr} = await execa(cliPath, ['--in-place', testFile]);
	t.regex(stderr, /no BOM found/);

	const content = fs.readFileSync(testFile, 'utf8');
	t.is(content, originalContent);

	fs.unlinkSync(testFile);
});

test('in-place flag with large file', async t => {
	const testFile = path.join(__dirname, 'test-large.txt');
	const largeContent = 'x'.repeat(100_000);
	fs.writeFileSync(testFile, BOM + largeContent);

	const {stderr} = await execa(cliPath, ['--in-place', testFile]);
	t.regex(stderr, /BOM removed/);

	const content = fs.readFileSync(testFile, 'utf8');
	t.is(content, largeContent);

	fs.unlinkSync(testFile);
});

test('fails when using --in-place with stdin', async t => {
	const {exitCode, stderr} = await t.throwsAsync(execa(cliPath, ['--in-place'], {input: 'test'}));
	t.is(exitCode, 1);
	t.regex(stderr, /Cannot use --in-place with stdin/);
});

test('in-place flag with multiple files', async t => {
	const testFile1 = path.join(__dirname, 'test-multi-1.txt');
	const testFile2 = path.join(__dirname, 'test-multi-2.txt');
	const testFile3 = path.join(__dirname, 'test-multi-3.txt');

	fs.writeFileSync(testFile1, BOM + 'file1');
	fs.writeFileSync(testFile2, 'file2'); // No BOM
	fs.writeFileSync(testFile3, BOM + 'file3');

	const {stderr} = await execa(cliPath, ['--in-place', testFile1, testFile2, testFile3]);
	t.regex(stderr, new RegExp(`${testFile1}: BOM removed`));
	t.regex(stderr, new RegExp(`${testFile2}: no BOM found`));
	t.regex(stderr, new RegExp(`${testFile3}: BOM removed`));

	t.is(fs.readFileSync(testFile1, 'utf8'), 'file1');
	t.is(fs.readFileSync(testFile2, 'utf8'), 'file2');
	t.is(fs.readFileSync(testFile3, 'utf8'), 'file3');

	fs.unlinkSync(testFile1);
	fs.unlinkSync(testFile2);
	fs.unlinkSync(testFile3);
});

test('fails when multiple files provided without --in-place', async t => {
	const {exitCode, stderr} = await t.throwsAsync(execa(cliPath, ['file1.txt', 'file2.txt']));
	t.is(exitCode, 1);
	t.regex(stderr, /Only one file can be specified when not using --in-place/);
});

test('handles non-existent file gracefully', async t => {
	const nonExistentFile = path.join(__dirname, 'non-existent.txt');
	await t.throwsAsync(execa(cliPath, ['--in-place', nonExistentFile]), {
		message: /ENOENT/,
	});
});

test('handles file with only BOM', async t => {
	const testFile = path.join(__dirname, 'test-only-bom.txt');
	fs.writeFileSync(testFile, BOM);

	const {stderr} = await execa(cliPath, ['--in-place', testFile]);
	t.regex(stderr, /BOM removed/);

	const content = fs.readFileSync(testFile, 'utf8');
	t.is(content, '');
	t.is(fs.statSync(testFile).size, 0);

	fs.unlinkSync(testFile);
});

test('preserves binary data integrity after BOM', async t => {
	const testFile = path.join(__dirname, 'test-binary.bin');
	const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
	const text = new TextEncoder().encode('Text\n');
	const binaryBytes = new Uint8Array([0x00, 0xFF, 0x80, 0x7F]);
	const moreText = new TextEncoder().encode('\nMore text');

	const binaryData = new Uint8Array(bom.length + text.length + binaryBytes.length + moreText.length);
	binaryData.set(bom, 0);
	binaryData.set(text, bom.length);
	binaryData.set(binaryBytes, bom.length + text.length);
	binaryData.set(moreText, bom.length + text.length + binaryBytes.length);

	fs.writeFileSync(testFile, binaryData);

	const {stderr} = await execa(cliPath, ['--in-place', testFile]);
	t.regex(stderr, /BOM removed/);

	const result = new Uint8Array(fs.readFileSync(testFile));
	const expected = binaryData.slice(3);
	t.true(result.every((byte, i) => byte === expected[i]));
	t.is(result.length, expected.length);

	fs.unlinkSync(testFile);
});

test('handles chunk boundaries correctly', async t => {
	const testFile = path.join(__dirname, 'test-boundary.bin');
	const size = 64 * 1024; // Exactly one chunk
	const testData = new Uint8Array(size);
	for (let i = 0; i < size; i++) {
		testData[i] = i % 256;
	}

	const withBom = new Uint8Array(3 + size);
	withBom.set([0xEF, 0xBB, 0xBF], 0);
	withBom.set(testData, 3);
	fs.writeFileSync(testFile, withBom);

	const {stderr} = await execa(cliPath, ['--in-place', testFile]);
	t.regex(stderr, /BOM removed/);

	const result = new Uint8Array(fs.readFileSync(testFile));
	t.is(result.length, size);
	t.true(result.every((byte, i) => byte === testData[i]));

	fs.unlinkSync(testFile);
});
