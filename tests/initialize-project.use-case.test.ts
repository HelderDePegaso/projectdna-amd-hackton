import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { InitializeProjectUseCase } from '../src/application/initialize-project.use-case.js';

test('pdna init persists only discovered project facts', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pdna-init-'));
  await fs.writeJson(path.join(projectRoot, 'package.json'), {
    name: 'plain-node-project',
    dependencies: { chalk: '5.0.0' },
  });
  await fs.ensureDir(path.join(projectRoot, 'src'));

  try {
    const useCase = new InitializeProjectUseCase();
    const files = await useCase.execute(projectRoot);
    const [scannerReport, architecture, dependencies, businessContext, domainContext, codingRules, securityRules, decisionLog, insights] = await Promise.all([
      fs.readJson(files.scannerReport),
      fs.readJson(files.architecture),
      fs.readJson(files.dependencies),
      fs.readJson(files.businessContext),
      fs.readJson(files.domainContext),
      fs.readJson(files.codingRules),
      fs.readJson(files.securityRules),
      fs.readJson(files.decisionLog),
      fs.readJson(files.architectureInsights),
    ]);

    assert.deepEqual(scannerReport.detectedFrameworks, []);
    assert.deepEqual(scannerReport.technologies, []);
    assert.deepEqual(architecture.frameworkDetection, {});
    assert.equal(architecture.architectureStyle, '');
    assert.deepEqual(architecture.layers, []);
    assert.deepEqual(architecture.rules, []);
    assert.deepEqual(dependencies.dependencies, ['chalk']);
    assert.deepEqual(dependencies.dependencyIntent, []);
    assert.equal(businessContext.summary, '');
    assert.deepEqual(businessContext.goals, []);
    assert.deepEqual(domainContext.modules, []);
    assert.deepEqual(codingRules.conventions, []);
    assert.deepEqual(securityRules.concerns, []);
    assert.deepEqual(decisionLog.decisions, []);
    assert.deepEqual(insights.relevantFrameworks, []);
    assert.deepEqual(insights.relevantTechnologies, []);
    assert.equal(insights.architectureStyle, '');
    assert.equal(insights.reasoningSummary, '');
    assert.equal(await fs.pathExists(path.join(projectRoot, '.pdna', 'plain-node-project-snapshot.json')), true);

    await assert.rejects(() => useCase.execute(projectRoot), /already initialized/);
  } finally {
    await fs.remove(projectRoot);
  }
});