const db = require('./src/config/database');

async function checkDocuments() {
  try {
    console.log('🔍 Checking documents in database...');

    // First, let's see all organizations
    const orgsResult = await db.query('SELECT id, name FROM organizations ORDER BY id');
    console.log('\n📋 Organizations:');
    orgsResult.rows.forEach(org => {
      console.log(`  - ID: ${org.id}, Name: ${org.name}`);
    });

    // Check all documents
    const allDocsResult = await db.query('SELECT id, title, organization_id, created_at FROM documents ORDER BY created_at DESC');
    console.log('\n📄 All Documents:');
    if (allDocsResult.rows.length === 0) {
      console.log('  - No documents found in database');
    } else {
      allDocsResult.rows.forEach(doc => {
        console.log(`  - ID: ${doc.id}, Title: ${doc.title}, Org ID: ${doc.organization_id}, Created: ${doc.created_at}`);
      });
    }

    // Check documents by organization
    for (const org of orgsResult.rows) {
      const orgDocsResult = await db.query('SELECT id, title, created_at FROM documents WHERE organization_id = $1 ORDER BY created_at DESC', [org.id]);
      console.log(`\n📂 Documents for ${org.name} (ID: ${org.id}):`);
      if (orgDocsResult.rows.length === 0) {
        console.log('  - No documents for this organization');
      } else {
        orgDocsResult.rows.forEach(doc => {
          console.log(`  - ${doc.title} (Created: ${doc.created_at})`);
        });
      }
    }

    // Check if documents table exists and its structure
    const tableInfoResult = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);

    console.log('\n🏗️ Documents table structure:');
    tableInfoResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Error checking documents:', error);
  } finally {
    process.exit(0);
  }
}

checkDocuments();