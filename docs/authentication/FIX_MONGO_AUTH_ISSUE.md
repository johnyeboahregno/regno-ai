# MongoDB Authentication Failed - How to Fix

## The Error

```
[Pipeline Generator] Using credential: {
  id: 'mongo_1760109753330_dq6i6qlhd',
  name: 'RegnoAI_Kyma',
  host: 'db3.regnocloud.com',
  port: 57017,
  database: 'Kyma',
  username: 'RegnoAdmin',
  authSource: 'admin',
  useSSL: false
}
[Pipeline Generator] Error: MongoServerError: Authentication failed.
```

## Root Cause

The credential **"RegnoAI_Kyma"** has incorrect authentication details. Possible reasons:

1. **Wrong Password** - The stored password doesn't match MongoDB
2. **Wrong Username** - User doesn't exist or has a typo
3. **Wrong Auth Source** - Currently set to `admin`, might need to be `Kyma`
4. **User Lacks Permissions** - User exists but doesn't have read permissions on `Kyma` database

## How to Fix

### Option 1: Update the Credential via UI (Recommended)

1. Open your application
2. Go to **Credentials** tab (top navigation)
3. Find the credential **"RegnoAI_Kyma"**
4. Click **Edit** (pencil icon)
5. Update the following:
   - **Password**: Enter the correct password for `RegnoAdmin`
   - **Auth Source**: Try changing from `admin` to `Kyma` or vice versa
6. Click **"Test Connection"** to verify it works
7. Click **"Save"** when successful

### Option 2: Test Different Auth Sources

MongoDB authentication can use different auth sources. Try these combinations:

| Auth Source | When to Use |
|-------------|-------------|
| `admin` | Default for admin users |
| `Kyma` | If user was created in the Kyma database |
| (leave empty) | Uses the database name automatically |

### Option 3: Verify MongoDB User Permissions

Connect to your MongoDB server and check:

```javascript
// Connect to admin database
use admin

// Check if user exists
db.getUsers()

// Check user's roles
db.getUser("RegnoAdmin")

// Expected output should include:
{
  roles: [
    { role: "readWrite", db: "Kyma" }  // or similar
  ]
}
```

If the user doesn't have permissions on `Kyma` database:

```javascript
use admin
db.grantRolesToUser("RegnoAdmin", [
  { role: "readWrite", db: "Kyma" }
])
```

### Option 4: Create a New Credential

If you can't fix the existing one, create a new credential:

1. Go to **Credentials** tab
2. Click **"+ Add Credential"**
3. Select **"MongoDB"**
4. Fill in:
   - **Name**: "Kyma DB (Fixed)"
   - **Host**: db3.regnocloud.com
   - **Port**: 57017
   - **Database**: Kyma
   - **Username**: [correct username]
   - **Password**: [correct password]
   - **Auth Source**: admin (or Kyma)
   - **Use SSL**: No
5. Click **"Test & Save"**
6. Once it works, update your Data Source nodes to use the new credential

## Test the Fix

After updating the credential, run the diagnostic script:

```bash
node scripts/test-mongo-credentials.js
```

You should see:

```
✅ Working: 1
   - RegnoAI_Kyma (mongo_1760109753330_dq6i6qlhd)
```

## Common Mistakes

1. **Password has special characters**: Make sure to enter the password exactly, including special characters
2. **Wrong database**: Make sure you're connecting to `Kyma` database, not another one
3. **User doesn't exist**: The user `RegnoAdmin` might not exist on this MongoDB server
4. **IP restrictions**: Your MongoDB server might have IP whitelist restrictions

## Need the Correct Password?

If you don't know the correct password:

1. Check your password manager
2. Check environment variables on the MongoDB server
3. Ask your database administrator
4. Reset the password (if you have admin access to MongoDB)

## Reset MongoDB User Password (If You Have Admin Access)

```javascript
use admin
db.changeUserPassword("RegnoAdmin", "newSecurePassword123")
```

Then update the credential in your app with the new password.
