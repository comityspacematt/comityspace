const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function addRealPasswords() {
  try {
    console.log('🔐 Creating real password hashes...');

    // Hash passwords
    const superAdminPassword = await bcrypt.hash('admin123', 12);
    const redCrossPassword = await bcrypt.hash('redcross123', 12);
    const foodBankPassword = await bcrypt.hash('foodbank123', 12);

    console.log('✅ Password hashes created');

    // Update super admin password
    await db.query(`
      UPDATE super_admins 
      SET password_hash = $1 
      WHERE email = 'admin@comityspace.com'
    `, [superAdminPassword]);

    console.log('✅ Super admin password updated');

    // Update organization passwords
    await db.query(`
      UPDATE organizations 
      SET shared_password_hash = $1 
      WHERE name = 'Demo Red Cross'
    `, [redCrossPassword]);

    await db.query(`
      UPDATE organizations 
      SET shared_password_hash = $1 
      WHERE name = 'Demo Food Bank'
    `, [foodBankPassword]);

    console.log('✅ Organization passwords updated');

    // Test the passwords work
    console.log('\n🧪 Testing password verification...');
    
    const testSuperAdmin = await bcrypt.compare('admin123', superAdminPassword);
    const testRedCross = await bcrypt.compare('redcross123', redCrossPassword);
    const testFoodBank = await bcrypt.compare('foodbank123', foodBankPassword);

    console.log(`Super Admin password test: ${testSuperAdmin ? '✅' : '❌'}`);
    console.log(`Red Cross password test: ${testRedCross ? '✅' : '❌'}`);
    console.log(`Food Bank password test: ${testFoodBank ? '✅' : '❌'}`);

    console.log('\n🎉 Real passwords added successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Super Admin: admin@comityspace.com / admin123');
    console.log('Red Cross Admin: admin@redcross.local / redcross123');
    console.log('Red Cross Volunteer: sandy@gmail.com / redcross123');
    console.log('Food Bank Admin: manager@foodbank.local / foodbank123');
    console.log('Food Bank Volunteer: helper@gmail.com / foodbank123');

  } catch (error) {
    console.error('❌ Error adding passwords:', error);
  } finally {
    await db.pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
addRealPasswords();