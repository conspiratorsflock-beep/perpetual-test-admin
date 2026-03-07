// Check user session and metadata
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_yEscQMglYFZQ8khOUs0dghhuoQ6smuxvINgKUf0AhN';

async function checkUser(email) {
  try {
    const listRes = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!listRes.ok) throw new Error('Failed to fetch user');
    
    const users = await listRes.json();
    if (!users?.length) {
      console.log('User not found');
      return;
    }

    const user = users[0];
    console.log('User ID:', user.id);
    console.log('Email:', user.email_addresses[0]?.email_address);
    console.log('Public Metadata:', JSON.stringify(user.public_metadata, null, 2));
    console.log('Private Metadata:', JSON.stringify(user.private_metadata, null, 2));
    console.log('');
    console.log('isAdmin check:', user.public_metadata?.isAdmin === true ? '✅ YES' : '❌ NO');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUser(process.argv[2] || 'butteredpeanuts@gmail.com');
