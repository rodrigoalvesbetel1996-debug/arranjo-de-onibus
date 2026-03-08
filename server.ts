import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route to send confirmation email
  app.post("/api/auth/send-confirmation", async (req, res) => {
    const { email, name, congregationName } = req.body;

    if (!email) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }

    const emailContent = `
      <h1>Olá, ${name}!</h1>
      <p>Obrigado por se cadastrar no sistema de Gestão de Transporte para a congregação <strong>${congregationName}</strong>.</p>
      <p>Para confirmar seu e-mail e prosseguir com o acesso, clique no link abaixo:</p>
      <a href="${process.env.APP_URL || 'http://localhost:3000'}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirmar E-mail</a>
      <p>Se você não solicitou este cadastro, ignore este e-mail.</p>
    `;

    try {
      if (resend) {
        const { data, error } = await resend.emails.send({
          from: 'Gestão de Transporte <onboarding@resend.dev>',
          to: [email],
          subject: 'Confirmação de Cadastro - Gestão de Transporte',
          html: emailContent,
        });

        if (error) {
          console.error("Erro ao enviar e-mail via Resend:", error);
          return res.status(500).json({ error: "Erro ao enviar e-mail." });
        }

        return res.json({ success: true, message: "E-mail enviado com sucesso!", data });
      } else {
        // Fallback for development: Log to console
        console.log("--------------------------------------------------");
        console.log("SIMULAÇÃO DE ENVIO DE E-MAIL (RESEND_API_KEY ausente)");
        console.log(`Para: ${email}`);
        console.log(`Assunto: Confirmação de Cadastro`);
        console.log(`Conteúdo: ${emailContent}`);
        console.log("--------------------------------------------------");
        
        return res.json({ 
          success: true, 
          message: "Simulação: E-mail logado no console do servidor (configure RESEND_API_KEY para envio real).",
          simulated: true 
        });
      }
    } catch (err) {
      console.error("Erro no servidor de e-mail:", err);
      return res.status(500).json({ error: "Erro interno ao processar e-mail." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
