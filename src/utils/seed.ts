import dotenv from 'dotenv';
import { connectDB } from '../config/database';
import { seedMenuItems } from './seedMenuItems';
import User from '../models/User';
import { UserRole } from '../types';

dotenv.config();

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // Seed menu items
    console.log('\nSeeding menu items...');
    await seedMenuItems();

    // Create default admin user if no users exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('\nCreating default admin user...');
      await User.create({
        name: 'Admin User',
        email: 'admin@fairmont.com',
        password: 'admin123456',
        role: UserRole.ADMIN
      });
      console.log('Default admin created: admin@fairmont.com / admin123456');
      console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    }

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
