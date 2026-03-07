// Simple script to promote a user to admin
// Usage: node scripts/make-admin-simple.mjs <email>

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_yEscQMglYFZQ8khOUs0dghhuoQ6smuxvINgKUf0AhN';

async function makeAdmin(email) {
  if (!email) {
    console.error('Usage: node make-admin-simple.mjs <email>');
    process.exit(1);
  }

  try {
    // Find user by email
    const listRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!listRes.ok) {
      throw new Error(`Failed to list users: ${listRes.status} ${await listRes.text()}`);
    }

    const users = await listRes.json();
    
    if (!users || users.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`Found user: ${user.id} (${user.email_addresses[0]?.email_address})`);
    
    const isAlreadyAdmin = user.public_metadata?.isAdmin === true;
    if (isAlreadyAdmin) {
      console.log('✅ User is already an admin');
      process.exit(0);
    }

    // Update user metadata
    const updateRes = await fetch(
      `https://api.clerk.com/v1/users/${user.id}/metadata`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_metadata: { isAdmin: true },
        }),
      }
    );

    if (!updateRes.ok) {
      throw new Error(`Failed to update user: ${updateRes.status} ${await updateRes.text()}`);
    }

    console.log(`✅ Successfully promoted ${email} to admin`);
    console.log('');
    console.log('The user can now access the admin console at http://localhost:3001/dashboard');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

makeAdmin(process.argv[2]);
