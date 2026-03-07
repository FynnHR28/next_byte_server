import jwt  from 'jsonwebtoken';
import { Resend } from 'resend';
import  { verifyEmailTemplate } from './html_templates/verify.js'


const CLIENT_VERIFY_ROUTE = `${process.env.APP_CLIENT_URL}/auth/verify`;
const resend = new Resend(process.env.RESEND_API_KEY);



const sendEmail = async ({ to, subject, html }) => {
  try {
    const data = await resend.emails.send({
      from:"NextByte.donotreply <onboarding@resend.dev>",
      to,
      subject,
      html
    });

    return data;
  } catch (err) {
    throw new Error(`Email could not be send to ${to}`);
  }
};

export const sendVerificationEmail = async ({to, username, token}) => {
    try{
        const resp = await sendEmail({
            to: to,
            subject: `NextByte: Email Verification for ${username}`,
            html: verifyEmailTemplate(`${CLIENT_VERIFY_ROUTE}?verify-token=${token}`, username)
            })
       
        return true;
    } catch (err) {
        throw new Error(err);
    }
    
}

