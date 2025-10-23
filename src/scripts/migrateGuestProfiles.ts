import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order';
import Guest from '../models/Guest';
import { connectDB } from '../config/database';

dotenv.config();

/**
 * Migration script to convert existing order guest details to guest profiles
 * This script:
 * 1. Finds all unique guests from existing orders (deduplicated by email)
 * 2. Creates guest profiles for them
 * 3. Links the orders to the newly created guest profiles
 */
async function migrateGuestProfiles() {
  try {
    console.log('Starting guest profile migration...\n');

    // Connect to database
    await connectDB();

    // Find all orders without guest profile references
    const orders = await Order.find({ guest: { $exists: false }, isDeleted: false });
    console.log(`Found ${orders.length} orders without guest profiles\n`);

    if (orders.length === 0) {
      console.log('No orders to migrate. Exiting...');
      process.exit(0);
    }

    // Group orders by guest email (use email as unique identifier)
    const guestMap = new Map<string, {
      details: { name: string; email: string; phone: string; address: string };
      orderIds: mongoose.Types.ObjectId[];
    }>();

    orders.forEach(order => {
      const email = order.guestDetails.email.toLowerCase();
      if (!guestMap.has(email)) {
        guestMap.set(email, {
          details: {
            name: order.guestDetails.name,
            email: order.guestDetails.email,
            phone: order.guestDetails.phone,
            address: order.guestDetails.address
          },
          orderIds: [order._id]
        });
      } else {
        const existing = guestMap.get(email)!;
        existing.orderIds.push(order._id);
      }
    });

    console.log(`Found ${guestMap.size} unique guests\n`);

    // Get the first admin user to assign as creator
    const adminUser = await mongoose.model('User').findOne({ role: 'admin' });
    if (!adminUser) {
      console.error('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    let createdCount = 0;
    let linkedCount = 0;
    let errorCount = 0;

    // Create guest profiles and link orders
    for (const [email, data] of guestMap.entries()) {
      try {
        // Check if guest profile already exists
        let guest = await Guest.findOne({ email, isDeleted: false });

        if (!guest) {
          // Create new guest profile
          guest = new Guest({
            name: data.details.name,
            email: data.details.email,
            phone: data.details.phone,
            address: data.details.address,
            createdBy: adminUser._id,
            lastModifiedBy: adminUser._id
          });
          await guest.save();
          createdCount++;
          console.log(`✓ Created guest profile for: ${data.details.name} (${email})`);
        } else {
          console.log(`- Guest profile already exists for: ${email}`);
        }

        // Link all orders for this guest to the profile
        await Order.updateMany(
          { _id: { $in: data.orderIds } },
          { $set: { guest: guest._id } }
        );
        linkedCount += data.orderIds.length;
        console.log(`  Linked ${data.orderIds.length} order(s) to this profile`);

      } catch (error: any) {
        errorCount++;
        console.error(`✗ Error processing guest ${email}:`, error.message);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Guest profiles created: ${createdCount}`);
    console.log(`Orders linked to profiles: ${linkedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log('=========================\n');

    // Update guest statistics for all guests
    console.log('Updating guest statistics...');
    const allGuests = await Guest.find({ isDeleted: false });

    for (const guest of allGuests) {
      const guestOrders = await Order.find({ guest: guest._id, isDeleted: false });
      const totalOrders = guestOrders.length;
      const totalSpent = guestOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const lastOrderDate = guestOrders.length > 0
        ? guestOrders.sort((a, b) => b.collectionDate.getTime() - a.collectionDate.getTime())[0].collectionDate
        : undefined;

      await Guest.findByIdAndUpdate(guest._id, {
        totalOrders,
        totalSpent,
        lastOrderDate
      });
    }

    console.log('✓ Guest statistics updated successfully\n');
    console.log('Migration completed successfully!');

  } catch (error: any) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

// Run the migration
migrateGuestProfiles();
