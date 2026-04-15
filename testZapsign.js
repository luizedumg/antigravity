const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const zapsign = require('./src/actions/zapsign.ts');

async function testZapsign() {
  require('ts-node').register({ compilerOptions: { module: 'commonjs' } });
  const zs = require('./src/actions/zapsign.ts');
  const contract = await prisma.contract.findFirst({ where: { linkId: '60afbd17-6636-4974-bc78-e28d047aa43f' } });
  if (!contract) { console.log('Contract not found'); return; }
  console.log('Sending contract', contract.id, 'to ZapSign');
  try {
     const res = await zs.sendToZapsign(contract.id);
     console.log('Result:', res);
  } catch (e) {
     console.error('Test error:', e);
  } finally {
     await prisma.$disconnect();
  }
}
testZapsign();
