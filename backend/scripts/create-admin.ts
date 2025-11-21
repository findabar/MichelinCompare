import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n=== Admin User Management ===\n');
  console.log('Choose an option:');
  console.log('1. Promote existing user to admin');
  console.log('2. Create new admin user');
  console.log('3. Remove admin privileges from user\n');

  const choice = await question('Enter choice (1, 2, or 3): ');

  if (choice === '1') {
    // Promote existing user
    const email = await question('Enter user email to promote: ');

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User with email "${email}" not found.`);
      return;
    }

    if (user.admin) {
      console.log(`ℹ️  User "${user.username}" is already an admin.`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { admin: true },
    });

    console.log(`✅ User "${user.username}" (${email}) has been promoted to admin.`);
  } else if (choice === '2') {
    // Create new admin user
    const username = await question('Enter username: ');
    const email = await question('Enter email: ');
    const password = await question('Enter password: ');

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      console.log(`❌ User with this email or username already exists.`);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        admin: true,
      },
    });

    console.log(`✅ Admin user "${user.username}" (${email}) created successfully.`);
  } else if (choice === '3') {
    // Remove admin privileges
    const email = await question('Enter user email to demote: ');

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`❌ User with email "${email}" not found.`);
      return;
    }

    if (!user.admin) {
      console.log(`ℹ️  User "${user.username}" is not an admin.`);
      return;
    }

    await prisma.user.update({
      where: { email },
      data: { admin: false },
    });

    console.log(`✅ Admin privileges removed from "${user.username}" (${email}).`);
  } else {
    console.log('❌ Invalid choice.');
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
