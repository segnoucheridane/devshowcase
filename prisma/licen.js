const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding licenses...');

  const licenses = [
    {
      name: 'MIT License',
      type: 'MIT',
      content: 'MIT License - Free to use, modify, and distribute.',
      is_default: true,
    },
    {
      name: 'GNU GPL v3',
      type: 'GPL',
      content: 'GNU GPL v3 - Open source with copyleft.',
      is_default: false,
    },
    {
      name: 'Apache 2.0',
      type: 'Apache',
      content: 'Apache 2.0 - Open source with patent protection.',
      is_default: false,
    },
    {
      name: 'Commercial License',
      type: 'Commercial',
      content: 'Commercial License - Paid license with terms.',
      is_default: false,
    },
  ];

  for (const license of licenses) {
    await prisma.licenseTemplate.upsert({
      where: { name: license.name },
      update: {},
      create: license,
    });
  }

  console.log('Licenses added successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());