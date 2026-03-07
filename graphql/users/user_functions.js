import pool from '../../db/database.js';
import { hashPassword, checkPasswords, signAccessToken, signVerificationToken, unpackVerificationToken, generateRefreshToken, hashRefreshToken } from '../../auth/auth.js';
import { sendVerificationEmail } from '../../auth/email_verification/verify_email.js';
import dotenv from 'dotenv';

dotenv.config();

const LOGIN_ERROR = 'Incorrect email or password, please try again';

/* User related functions:
 Used internally and by user resolvers
 TODO: abstract database hits, set up database wrapper for query building, abstract server side field validation
*/

export const resolveUserRole = (refUserRoleId) => {
    switch (refUserRoleId) {
        case 1:
            return "admin";
        case 2:
            return "user";
        default:
            return "user";
    }
};

const issueSessionTokens = async (userId, userRole, isVerified, client) => {
    const token = signAccessToken(userId, userRole, isVerified);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await client.query(`
        INSERT INTO public.user_refresh_token (user_id, token_hash, expires_at, created_at, updated_at)
        VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW(), NOW())
    `, [userId, refreshTokenHash]);

    return { token, refreshToken };
};

/* ================================================================================================================================================== */
// Basic CRUD Operations

// CREATE
export const createUser = async (username, password, email, city, state, country, timezone) => {
    console.log(`Creating user: ${username}, ${email}`);
    const client = await pool.connect();
    console.log(`Database client connected for createUser`);

    const user = await getUserByEmail(email);

    if (user && !user.is_active) {
        throw new Error('Account was deleted');
    }

    // cannot have multiple emails
    const dup_email = await client.query(`
        SELECT COUNT(1) FROM public.user WHERE LOWER(email) = LOWER($1)
    `, [email])
    if(dup_email.rows[0].count > 0){
        throw new Error('Email is unavailable (case insensitive), please choose another')
    }

    // cannot have multiple usernames
    const dup_username = await client.query(`
        SELECT COUNT(1) FROM public.user WHERE LOWER(username) = LOWER($1)
    `, [username])
    if(dup_username.rows[0].count > 0){
        throw new Error('Username is unavailable (case insensitive), please choose another')
    }
    
    try {
        const passwordHash = await hashPassword(password);
        const response = await client.query(`
            INSERT INTO public.user 
            (username, password_hash, email, city, state, country, timezone, is_active, created_at, updated_at, last_login, ref_user_role_id)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW(), NOW(), 2)
            RETURNING *;
        `,
        [username, passwordHash, email, city, state, country, timezone]);
        console.log(`User created with ID: ${ response.rows[0].id }`);
        return response.rows[0];
    }
    catch (err){
        console.error(`Error thrown during createUser ${ err }`)
        throw new Error(`${err.message }`)
    }
    finally {
        client.release()
    }
};

// READ 
export const getUser = async (targetUserId) => {
    console.log(`Attempting to retrieve user with id: ${targetUserId}`)
    const client = await pool.connect();
    try {
        const response = await client.query(`
            SELECT * FROM public.user 
            WHERE id = $1 and is_active = TRUE
        `,
        [targetUserId]);
        return response.rows[0];
    } catch (err) {
        console.error(`Error thrown by db during getUser ${ err }`)
        throw new Error(`Database error while retrieving user: ${ err.message }`)
    } finally {
        client.release()
    }
};

// UPDATE

// DELETE
export const deleteUser = async (id) => {
    const client = await pool.connect();
    console.log(`Attempting to delete user with id: ${id}`)
    try {
        const response = await client.query(`
            DELETE FROM public.user 
            WHERE id = $1
            RETURNING id
        `,
        [id]);
        if (response.rowCount === 0) {
            throw new Error('User not found or could not be deleted');
        }
    } catch (err) {
        console.error(`Error thrown by db during deleteUser ${ err }`)
        throw new Error(`Database error while deleting user: ${ err.message }`)
    } finally {
        client.release()
    }
    return true;
}

/* ================================================================================================================================================== */
/* Account Activation */

export const activateUser = async (email) => {
    const client = await pool.connect();
    console.log(`Attempting to activate user with email: ${email}`)
    try {
        const response = await client.query(`
            UPDATE public.user 
            SET 
            is_active = TRUE,
            updated_at = NOW()
            WHERE LOWER(email) = LOWER($1)
            RETURNING id
        `,
        [email]);
        if (response.rowCount === 0) {
            throw new Error('User not found or could not be activated');
        }
    } catch (err) {
        console.error(`Error thrown by db during activateUser ${ err }`)
        throw new Error(`Database error while activating user: ${ err.message }`)
    } finally {
        client.release()
    }
    return true;
}

export const deactivateUser = async (id) => {
    const client = await pool.connect();
    console.log(`Attempting to deactivate user with id: ${id}`)
    try {
        const response = await client.query(`
            UPDATE public.user 
            SET 
            is_active = FALSE,
            updated_at = NOW()
            WHERE id = $1
            RETURNING id
        `,
        [id]);
        if (response.rowCount === 0) {
            throw new Error('User not found or could not be deactivated');
        }
    } catch (err) {
        console.error(`Error thrown by db during deactivateUser ${ err }`)
        throw new Error(`Database error while deactivating user: ${ err.message }`)
    } finally {
        client.release()
    }
    return true;
}

/* ================================================================================================================================================== */
/* SESSION MANAGEMENT */

export const refreshSession = async (rawRefreshToken) => {
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);
    const client = await pool.connect();
    let didCommit = false;

    try {
        // Start queries
        await client.query("BEGIN");

        // Get the refresh token record and the user info using associated user id
        const tokenRecord = await client.query(`
            SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.ref_user_role_id, u.is_active, u.is_verified
            FROM public.user_refresh_token rt
            INNER JOIN public.user u ON u.id = rt.user_id
            WHERE rt.token_hash = $1
            FOR UPDATE
        `, [refreshTokenHash]);

        if (tokenRecord.rowCount === 0) {
            throw new Error("Invalid refresh token");
        }

        const tokenRow = tokenRecord.rows[0];

        // Check if token is revoked, expired, or user is inactive
        if (tokenRow.revoked_at || new Date(tokenRow.expires_at) <= new Date() || !tokenRow.is_active) {
            await client.query(`
                UPDATE public.user_refresh_token
                SET revoked_at = NOW(), updated_at = NOW()
                WHERE id = $1 AND revoked_at IS NULL
            `, [tokenRow.id]);
            await client.query("COMMIT");
            didCommit = true;
            throw new Error("Refresh token expired or revoked");
        }

        // Revoke the used refresh token
        await client.query(`
            UPDATE public.user_refresh_token
            SET revoked_at = NOW(), updated_at = NOW()
            WHERE id = $1
        `, [tokenRow.id]);

        // Issue new session tokens
        const userRole = resolveUserRole(tokenRow.ref_user_role_id);
        const { token, refreshToken } = await issueSessionTokens(tokenRow.user_id, userRole, tokenRow.is_verified, client);
        // Check the user is still active (like if they deactivated their account while doing this)
        const userResponse = await client.query(`
            SELECT * FROM public.user
            WHERE id = $1 AND is_active = TRUE
        `, [tokenRow.user_id]);
        const user = userResponse.rows[0];
        if (!user) {
            throw new Error("User no longer active");
        }

        await client.query("COMMIT");
        didCommit = true;
        return { token, refreshToken, user };
    } catch (err) {
        if (!didCommit) {
            await client.query("ROLLBACK");
        }
        throw err;
    } finally {
        client.release();
    }
};

// Revoke a specific refresh token. Called by logout mutation
export const revokeRefreshToken = async (rawRefreshToken) => {
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);
    const client = await pool.connect();

    try {
        await client.query(`
            UPDATE public.user_refresh_token
            SET revoked_at = NOW(), updated_at = NOW()
            WHERE token_hash = $1 AND revoked_at IS NULL
        `, [refreshTokenHash]);
    } finally {
        client.release();
    }
};

// Revoke all refresh tokens for a user. Called by logout and deactivateUser mutations
export const revokeAllRefreshTokensForUser = async (userId) => {
    const client = await pool.connect();

    try {
        await client.query(`
            UPDATE public.user_refresh_token
            SET revoked_at = NOW(), updated_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL
        `, [userId]);
    } finally {
        client.release();
    }
};
/* ================================================================================================================================================== */
/* LOGIN LOGOUT */

// called by login mutation 
export const verifyUser = async (email, password) => {

    const user = await getUserByEmail(email);

    // User email must exist
    if (!user) {
        throw new Error(LOGIN_ERROR);
    }
    // Passwords must match
    const isValid = await checkPasswords(password, user.password_hash);
    if (!isValid) {
        throw new Error(LOGIN_ERROR);
    }

    // User must be active
    if (user && !user.is_active) {
        throw new Error(LOGIN_ERROR);
    }

    // Making sure to update user metadata upon successful login
    const client = await pool.connect();
    try {
        await client.query(`
            UPDATE public.user 
            SET 
            last_login = NOW(),
            updated_at = NOW()
            WHERE id = $1
        `,
        [user.id]);

        // to attach user role context to the token
        const userRole = resolveUserRole(user.ref_user_role_id);
        const { token, refreshToken } = await issueSessionTokens(user.id, userRole, user.is_verified, client);
        // Clean up old refresh tokens
        await client.query(`
            DELETE FROM public.user_refresh_token
            WHERE user_id = $1 AND (revoked_at IS NOT NULL OR expires_at <= NOW())
        `, [user.id]);

        // schema of AuthPayload type is string (token), string (refreshToken), user
        return {
            token,
            refreshToken,
            user
        }
    } finally {
        client.release();
    }
};

// called by logout mutation
export const logout = async (id) => {
    const client = await pool.connect();
    console.log('in backend logout')

    try {
        const user = await getUser(id)
        console.log(`Attempting to logout user: ${user.id}`)
        if(!user.is_active) {
            throw new Error('User is not active, cannot log out')
        }
        // If user is active, update metadata
        const response = await client.query(`
            UPDATE public.user 
            SET 
            updated_at = NOW()
            WHERE id = $1
            RETURNING id
        `,
        [id]);
        return true;
    } catch (err) {
        console.error(`Error thrown by db during logout ${ err }`)
        throw new Error(`${err.message }`)
    } finally {
        client.release()
    }
}

/* ================================================================================================================================================== */
/* EMAIL VERIFICATION */

/* using the methods in @auth/email_verification, send an email to the user with a signed jwt token */
export const sendUserVerificationEmail = async (email, requestorId, requestorIsVerified) => {
    // safeguards: don't send if already verified or email that is passed was corrupted
    if (requestorIsVerified) throw new Error('Your email is already verified, you may change your email at any time');
    const user = await getUser(requestorId);
    if (user.email.toLowerCase() != email.toLowerCase()) throw new Error('requested destination address is not the email for this user');

    const verifyToken = signVerificationToken(requestorId, email)
    // returns true or throws an error
    try {
        const resp = await sendVerificationEmail({
            to: email,
            username: user.username,
            token: verifyToken
        });
        return true
    } catch (err){
        throw new Error(err);
    }
   
};

/* if the token is not expired, set verified to true */
export const verifyUserEmail = async (verifyToken) => {
    const tokenData = unpackVerificationToken(verifyToken);
    if(!tokenData.userId || !tokenData.userEmail) throw new Error('Email verification failed, please try sending yourself a new link');

    const client = await pool.connect();
    try {
        const response = await client.query(`
            UPDATE public.user
            SET 
                is_verified = TRUE,
                updated_at = NOW()
            WHERE id = $1
        `, [tokenData.userId])
    } catch (err) {
        throw new Error(err);
    } finally {
        client.release()
    }

}

/* ================================================================================================================================================== */
/* helper functions */ 

export const getUserByEmail = async (email) => {
    const client = await pool.connect();
    try {
        const response = await client.query(`
            SELECT * FROM public.user WHERE email = $1
        `,
        [email]);
        return response.rows[0];
    } catch (err) {
        console.error(`Error thrown by db during getUserByEmail ${ err }`)
        throw new Error(`Database error while retrieving user by email: ${ err.message }`)
    } finally {
        client.release()
    }
};
