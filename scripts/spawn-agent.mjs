#!/usr/bin/env node
/**
 * Spawn a full agent stack: a k3s namespace (dev-<slug>) with the whole platform,
 * seeded with the base standards + docs. Runs inside the web pod (has kubectl + RBAC).
 *
 * Usage: node scripts/spawn-agent.mjs <slug> <webPort>
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const [slug, portStr] = process.argv.slice(2);
if (!slug || !portStr) {
  console.error('usage: spawn-agent.mjs <slug> <webPort>');
  process.exit(1);
}
const port = Number(portStr);
const rtPort = port + 2;
const ns = `dev-${slug}`;

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

async function mark(status) {
  const mongo = new MongoClient(process.env.MONGO_URI);
  await mongo.connect();
  await mongo.db('regno').collection('agents').updateOne({ slug }, { $set: { status, namespace: ns, port } });
  await mongo.close();
}

async function main() {
  await mark('spawning');

  // 1. namespace
  execSync(`kubectl create namespace ${ns} --dry-run=client -o yaml | kubectl apply -f -`, { stdio: 'ignore' });

  // 2. copy the regno-env secret from default into the new namespace
  const secret = JSON.parse(execSync('kubectl get secret regno-env -n default -o json', { encoding: 'utf8' }));
  for (const k of ['namespace', 'uid', 'resourceVersion', 'creationTimestamp', 'managedFields', 'selfLink']) {
    delete secret.metadata[k];
  }
  writeFileSync('/tmp/secret.json', JSON.stringify(secret));
  execSync(`kubectl apply -n ${ns} -f /tmp/secret.json`, { stdio: 'ignore' });

  // 3. manifest with unique hostPorts
  const manifest = readFileSync('/app/k8s/app.yaml', 'utf8')
    .replace(/hostPort: 3000/g, `hostPort: ${port}`)
    .replace(/hostPort: 3002/g, `hostPort: ${rtPort}`);
  writeFileSync('/tmp/app.yaml', manifest);
  execSync(`kubectl apply -n ${ns} -f /tmp/app.yaml`, { stdio: 'ignore' });

  // 4. wait
  execSync(`kubectl -n ${ns} wait --for=condition=ready pod -l app=web --timeout=180s`, { stdio: 'ignore' });
  execSync(`kubectl -n ${ns} wait --for=condition=ready pod -l app=neo4j --timeout=180s`, { stdio: 'ignore' });

  // 5. seed
  const wpod = execSync(`kubectl -n ${ns} get pods -l app=web -o jsonpath='{.items[0].metadata.name}'`, { encoding: 'utf8' }).trim();
  for (let i = 0; i < 6; i++) {
    try {
      execSync(`kubectl -n ${ns} exec ${wpod} -- node scripts/init-db.mjs`, { stdio: 'ignore' });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  for (const script of ['seed-agents.mjs', 'seed-standards.mjs', 'seed-brain.mjs']) {
    execSync(`kubectl -n ${ns} exec ${wpod} -- node scripts/${script}`, { stdio: 'ignore' });
  }

  await mark('ready');
  console.log(`SPAWNED ${ns} ready on port ${port}`);
}

main().catch(async (err) => {
  console.error('[spawn-agent] failed:', err.message);
  try { await mark('failed'); } catch { /* ignore */ }
  process.exit(1);
});
