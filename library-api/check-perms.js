const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.roles.findMany({
    include: {
      role_permissions: {
        include: {
          permissions: true
        }
      }
    }
  });

  roles.forEach(r => {
    console.log(`Role: ${r.code}`);
    console.log(r.role_permissions.map(rp => rp.permissions.code).join(', '));
  });

  const missingPerms = ['SEAT_MANAGE', 'SEAT_VIEW', 'TIMESLOT_MANAGE', 'TIMESLOT_VIEW'];
  for (const code of missingPerms) {
    let p = await prisma.permissions.findUnique({ where: { code } });
    if (!p) {
      console.log(`Creating permission: ${code}`);
      p = await prisma.permissions.create({ data: { code, description: code, status: 'ACTIVE' } });
    }
    
    for (const roleCode of ['ADMIN', 'SUPER_ADMIN']) {
      const role = roles.find(r => r.code === roleCode);
      if (role) {
        const has = role.role_permissions.find(rp => rp.permissions.code === code);
        if (!has) {
          console.log(`Assigning ${code} to ${roleCode}`);
          await prisma.role_permissions.create({
            data: {
              role_id: role.id,
              permission_id: p.id
            }
          });
        }
      }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
