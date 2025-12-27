import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: any, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Since we're using a custom Express server with express.json(),
    // the body might already be on req.body even though we disabled Next's parser.
    const body = req.body || {};
    const { name, url, visibility, email } = body;

    if (!name || !url || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const recipient = 'deepz.siva07@gmail.com';
    const apiKey = process.env.RESEND_API_KEY;

    try {
        console.log('--- NEW TENANT REQUEST ---');
        console.log(`Name: ${name}, URL: ${url}, Email: ${email}`);

        if (apiKey) {
            // Dynamically import Resend only if API key is present
            const { Resend } = await import('resend');
            const resend = new Resend(apiKey);

            await resend.emails.send({
                from: 'VirtualGames <onboarding@resend.dev>',
                to: recipient,
                replyTo: email,
                subject: `New Workspace Request: ${name}`,
                text: `New Workspace Request\n\nName: ${name}\nURL: virtualgames.io/${url}\nVisibility: ${visibility}\nEmail: ${email}`,
                html: `
                    <div style="font-family: sans-serif; padding: 30px; color: #1f2937; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; max-width: 600px; margin: 0 auto;">
                        <div style="background-color: #10b981; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">New Workspace Request</h1>
                        </div>
                        <div style="padding: 30px; background-color: white; border-radius: 0 0 8px 8px;">
                            <p style="font-size: 16px; margin-bottom: 20px;">You have received a new workspace request from the VirtualGames landing page.</p>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; width: 150px;">Workspace:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">${name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">URL:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">virtualgames.io/${url}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Visibility:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; text-transform: capitalize;">${visibility}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold;">Requester:</td>
                                    <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;"><a href="mailto:${email}" style="color: #10b981; text-decoration: none;">${email}</a></td>
                                </tr>
                            </table>
                            <div style="margin-top: 30px; text-align: center;">
                                <p style="font-size: 12px; color: #9ca3af;">This is an automated notification from your VirtualGames platform.</p>
                            </div>
                        </div>
                    </div>
                `
            });
            console.log(`Email successfully sent to ${recipient}`);
        } else {
            console.warn('!!! EMAIL NOT SENT: RESEND_API_KEY is not defined.');
        }

        return res.status(200).json({
            success: true,
            message: 'Request received'
        });
    } catch (error: any) {
        console.error('API Error:', error.message);
        return res.status(200).json({
            success: true,
            message: 'Request logged'
        });
    }
}
