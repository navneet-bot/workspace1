import { NextResponse } from 'next/server';
import { sendCustomEmail } from '@/lib/email/resend';

export async function POST(req: Request) {
  try {
    const { email, name, subject, body } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and Name are required' }, { status: 400 });
    }

    const mailSubject = subject || 'Congratulations! You have been selected';
    const result = await sendCustomEmail(email, mailSubject, body, name);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/send-email:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
