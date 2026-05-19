import { getPrismaClient } from "@/lib/db/prisma";

export async function handleContactRequest(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { name?: string; email?: string; minecraftUsername?: string; subject?: string; message?: string };

    if (!body.name || !body.email || !body.subject || !body.message) {
      return Response.json({ ok: false, error: "Name, email, subject, and message are required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }

    const fullMessage = `[Contact Form]\nFrom: ${body.name} (${body.email})\nMinecraft: ${body.minecraftUsername || "N/A"}\nSubject: ${body.subject}\n\n${body.message}`;

    const prisma = await getPrismaClient();
    await prisma.supportTicket.create({
      data: {
        subject: `[Contact] ${body.subject}`,
        message: fullMessage,
      },
    });

    return Response.json({ ok: true, message: "Your message has been sent. We'll get back to you soon." });
  } catch (error) {
    console.error("[Contact] Error:", error);
    return Response.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
