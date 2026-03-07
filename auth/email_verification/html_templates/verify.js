export const verifyEmailTemplate = (verifyUrl, username) => `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Verify your email</title>
    </head>

    <body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,Helvetica,sans-serif;">

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:40px 0;">
        <tr>
        <td align="center">

        <table width="520" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;padding:40px;box-shadow:0 2px 10px rgba(0,0,0,0.05);">

        <tr>
        <td align="center" style="padding-bottom:24px;">
           <img src="https://i.ibb.co/TqBmdcRz/nextbyte.png" alt="nextbyte" border="0" />
        </td>
        </tr>

        <tr>
        <td style="font-size:22px;font-weight:600;color:#CC5500;text-align:center;padding-bottom:12px;">
        Verify your email
        </td>
        </tr>

        <tr>
        <td style="font-size:15px;color:#444;text-align:center;padding-bottom:28px;line-height:1.6;">
        Hello ${username}! Thanks for signing up for <b>NextByte</b>.  
        Please confirm your email address to secure your account.
        </td>
        </tr>

        <tr>
        <td align="center" style="padding-bottom:28px;">

        <a href="${verifyUrl}"
        style="
        background:#CC5500;
        color:white;
        text-decoration:none;
        padding:14px 26px;
        border-radius:6px;
        font-weight:500;
        display:inline-block;
        font-size:15px;
        ">
        Verify Email
        </a>

        </td>
        </tr>

        <tr>
        <td style="font-size:13px;color:#777;text-align:center;line-height:1.5;">
        If the button doesn't work, copy and paste this link into your browser:
        <br><br>
        <a href="${verifyUrl}" style="color:#555;">verify</a>
        </td>
        </tr>

        <tr>
        <td style="font-size:12px;color:#aaa;text-align:center;padding-top:30px;">
        If you didn't create an account, you can safely ignore this email.
        </td>
        </tr>

        </table>

        </td>
        </tr>
        </table>

    </body>
    </html>
`;
