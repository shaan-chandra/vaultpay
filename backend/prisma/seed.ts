import {PrismaClient} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt'; 
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    const plaintext = 'shaan123';
    const hashpassword = await bcrypt.hash(plaintext, 10)
    const admin = await prisma.superAdmin.upsert({
        where : {email : 'shaanchandra29@gmail.com'},
        update : {}, 
        create : {
            email : 'shaanchandra29@gmail.com',
            password: hashpassword, 
            name : 'Super Admin',
        },
    });
    console.log('Super Admin created!', {
        id : admin.id, 
        email : admin.email, 
        name : admin.name, 
    });
}
main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });