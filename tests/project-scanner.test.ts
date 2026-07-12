import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { ProjectScanner } from '../src/infrastructure/scanners/project-scanner.js';

async function createProject(packageJson: Record<string, unknown>): Promise<string> {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pdna-scanner-'));
  await fs.writeJson(path.join(projectRoot, 'package.json'), packageJson);
  return projectRoot;
}

test('ProjectScanner does not infer React or technologies from source directories', async () => {
  const projectRoot = await createProject({ name: 'plain-node-project' });
  await fs.ensureDir(path.join(projectRoot, 'src'));

  try {
    const scan = await new ProjectScanner().scan(projectRoot);

    assert.deepEqual(scan.detectedFrameworks, []);
    assert.deepEqual(scan.frameworkDetection, {});
    assert.deepEqual(scan.technologies, []);
    assert.deepEqual(scan.technologyDetection, []);
  } finally {
    await fs.remove(projectRoot);
  }
});

test('ProjectScanner requires a Next configuration file and its default dependency signature', async () => {
  const projectRoot = await createProject({
    name: 'next-project',
    dependencies: { next: '15.0.0', react: '19.0.0', 'react-dom': '19.0.0' },
  });
  await fs.writeFile(path.join(projectRoot, 'next.config.ts'), 'export default {};\n');

  try {
    const scan = await new ProjectScanner().scan(projectRoot);

    assert.deepEqual(scan.detectedFrameworks, ['nextjs']);
    assert.equal(scan.frameworkDetection.name, 'nextjs');
    assert.equal(scan.technologies.includes('nextjs'), true);
  } finally {
    await fs.remove(projectRoot);
  }
});

test('ProjectScanner does not treat a framework config or partial package set as sufficient evidence', async () => {
  const projectRoot = await createProject({
    name: 'incomplete-project',
    dependencies: { next: '15.0.0', '@nestjs/core': '10.0.0', react: '19.0.0' },
  });
  await Promise.all([
    fs.writeFile(path.join(projectRoot, 'next.config.js'), 'export default {};\n'),
    fs.writeJson(path.join(projectRoot, 'nest-cli.json'), {}),
  ]);

  try {
    const scan = await new ProjectScanner().scan(projectRoot);

    assert.deepEqual(scan.detectedFrameworks, []);
  } finally {
    await fs.remove(projectRoot);
  }
});

test('ProjectScanner requires Angular and Nest configuration files plus complete dependency signatures', async () => {
  const projectRoot = await createProject({
    name: 'framework-project',
    dependencies: {
      '@angular/core': '18.0.0',
      '@angular/common': '18.0.0',
      '@nestjs/core': '10.0.0',
      '@nestjs/common': '10.0.0',
    },
  });
  await Promise.all([
    fs.writeJson(path.join(projectRoot, 'angular.json'), {}),
    fs.writeJson(path.join(projectRoot, 'nest-cli.json'), {}),
  ]);

  try {
    const scan = await new ProjectScanner().scan(projectRoot);

    assert.deepEqual(scan.detectedFrameworks, ['angular', 'nestjs']);
    assert.equal(scan.technologies.includes('angular'), true);
    assert.equal(scan.technologies.includes('nestjs'), true);
  } finally {
    await fs.remove(projectRoot);
  }
});

test('ProjectScanner recognizes React only from an explicit Vite React plugin configuration and dependencies', async () => {
  const projectRoot = await createProject({
    name: 'react-project',
    dependencies: { react: '19.0.0', 'react-dom': '19.0.0', vite: '6.0.0' },
    devDependencies: { '@vitejs/plugin-react': '4.0.0' },
  });
  await fs.writeFile(
    path.join(projectRoot, 'vite.config.ts'),
    "import react from '@vitejs/plugin-react';\nexport default { plugins: [react()] };\n",
  );

  try {
    const scan = await new ProjectScanner().scan(projectRoot);

    assert.deepEqual(scan.detectedFrameworks, ['react']);
    assert.equal(scan.technologies.includes('react'), true);
  } finally {
    await fs.remove(projectRoot);
  }
});