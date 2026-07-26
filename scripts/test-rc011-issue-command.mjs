import assert from 'node:assert/strict';
import { parseRc011Command } from './parse-rc011-issue-command.mjs';

const sha = '0123456789abcdef0123456789abcdef01234567';
const buildId = '123e4567-e89b-42d3-a456-426614174000';
const evidence = 'https://github.com/Tehkne-Solutions/bem-me-cuida/actions/runs/100';

assert.deepEqual(parseRc011Command('texto comum'), { recognized: false });
assert.equal(parseRc011Command('/rc011 help').command, 'help');
assert.equal(parseRc011Command('/rc011 status').privilege, 'write');
assert.equal(parseRc011Command('/rc011 audit-external').privilege, 'admin');
assert.equal(parseRc011Command(`/rc011 validate-infrastructure ${sha}`).sourceCommit, sha);
assert.equal(
  parseRc011Command(`/rc011 capture-infrastructure ${sha} https://evidence.example/build https://evidence.example/homologation https://evidence.example/services`).privilege,
  'admin',
);
assert.equal(parseRc011Command(`/rc011 evidence-inspect 30213916990 ${sha}`).runId, '30213916990');
assert.equal(parseRc011Command(`/rc011 evidence-pr 30213916990 ${sha}`).privilege, 'admin');
assert.equal(parseRc011Command(`/rc011 validate-build ${sha} https://evidence.example/cycle`).cycleEvidenceUrl, 'https://evidence.example/cycle');
assert.equal(parseRc011Command(`/rc011 build-android ${sha} https://evidence.example/cycle`).privilege, 'admin');
assert.equal(parseRc011Command(`/rc011 discover-android ${sha}`).command, 'discover-android');
assert.equal(parseRc011Command(`/rc011 capture-android-latest ${sha}`).privilege, 'admin');
assert.equal(parseRc011Command(`/rc011 android-artifact-pr ${sha} 30213916990`).runId, '30213916990');
const session = parseRc011Command(`/rc011 android-session ${sha} ${buildId} android-mainstream passed fresh 14 ${evidence} fresh-install=passed,privacy=passed`);
assert.equal(session.profileId, 'android-mainstream');
assert.equal(session.resultStatus, 'passed');
assert.equal(session.installationMode, 'fresh');
assert.equal(session.osVersion, '14');
assert.equal(session.suiteResults, 'fresh-install=passed,privacy=passed');
assert.equal(parseRc011Command(`/rc011 android-session-pr ${sha} 30213916990`).runId, '30213916990');
assert.equal(parseRc011Command(`/rc011 android-review ${sha}`).privilege, 'write');
assert.equal(parseRc011Command(`/rc011 collect-android ${sha} ${buildId}`).buildId, buildId);
assert.equal(parseRc011Command(`/rc011 package-decision ${sha}`).command, 'package-decision');

assert.throws(() => parseRc011Command('/rc011 unknown'), /Comando desconhecido/);
assert.throws(() => parseRc011Command('/rc011 audit-external extra'), /espera 0 argumento/);
assert.throws(() => parseRc011Command('/rc011 status extra'), /espera 0 argumento/);
assert.throws(() => parseRc011Command('/rc011 validate-infrastructure abc'), /SHA Git/);
assert.throws(() => parseRc011Command(`/rc011 validate-build ${sha} http://inseguro.example`), /URL HTTPS/);
assert.throws(() => parseRc011Command(`/rc011 collect-android ${sha} build-invalido`), /buildId/);
assert.throws(() => parseRc011Command(`/rc011 android-artifact-pr ${sha} zero`), /runId/);
assert.throws(() => parseRc011Command(`/rc011 android-session ${sha} ${buildId} ios-mainstream passed fresh 14 ${evidence} fresh-install=passed`), /profileId/);
assert.throws(() => parseRc011Command(`/rc011 android-session ${sha} ${buildId} android-mainstream pending fresh 14 ${evidence} fresh-install=passed`), /resultStatus/);
assert.throws(() => parseRc011Command(`/rc011 android-session ${sha} ${buildId} android-mainstream passed clean 14 ${evidence} fresh-install=passed`), /installationMode/);
assert.throws(() => parseRc011Command(`/rc011 android-session ${sha} ${buildId} android-mainstream passed fresh Android 14 ${evidence} fresh-install=passed`), /espera 8 argumento/);
assert.throws(() => parseRc011Command(`/rc011 android-session ${sha} ${buildId} android-mainstream passed fresh 14 ${evidence} fresh-install=pending`), /suiteResults/);
assert.throws(() => parseRc011Command(`/rc011 status
segunda linha`), /exatamente uma linha/);
assert.throws(() => parseRc011Command('/rc011 status expo_123456789012345678901234567890'), /material que parece secreto/);
assert.throws(() => parseRc011Command('/rc011 status tester@example.com'), /e-mail/);

console.log('Parser de comandos RC 0.11 aprovado.');
console.log('Tehkné Solutions');
