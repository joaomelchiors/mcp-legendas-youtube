// Tests for Project: the name and the version of the MCP, in one place.
// The server tells them to Claude, the log uses the name as prefix and the installer uses it in the
// registration command. They must be the same as in package.json: this test fails when one changes alone.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Project } from '../../src/infra/project.js';

interface PackageJson {
  readonly name: string;
  readonly version: string;
}

const packageJson: PackageJson = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8')) as PackageJson;

test('the name is the one in package.json', () => {
  expect(Project.NAME).toBe(packageJson.name);
});

test('the version is the one in package.json', () => {
  expect(Project.VERSION).toBe(packageJson.version);
});
