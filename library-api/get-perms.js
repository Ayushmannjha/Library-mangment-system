const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();
async function main() {
  const perms = await prisma.permissions.findMany();
  console.log('All perms:');
  console.log(perms.map(p => p.code).join('\n'));
}
main().finally(() => prisma.$disconnect());
