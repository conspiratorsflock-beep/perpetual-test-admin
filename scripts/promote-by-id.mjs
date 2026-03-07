// Promote user by ID
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_yEscQMglYFZQ8khOUs0dghhuoQ6smuxvINgKUf0AhN';

async function promoteById(userId) {
  try {
    const updateRes = await fetch(
      `https://api.clerk.com/v1/users/${userId}/metadata`,
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

    console.log(`✅ Successfully promoted user ${userId} to admin`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

promoteById(process.argv[2]);
