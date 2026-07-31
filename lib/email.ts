// lib/email.ts
// Camada de envio de e-mails transacionais via Resend.
// O Better Auth gera e valida os tokens; este módulo só transporta a mensagem.

import 'dotenv/config';
import { Resend } from 'resend';

const REMETENTE =
    process.env.RESEND_FROM ?? 'LicitPro Analyzer <onboarding@resend.dev>';

/**
 * Cliente criado sob demanda para que a ausência da chave não quebre o boot
 * da aplicação (ex.: build sem variáveis de ambiente configuradas).
 */
function obterCliente(): Resend | null {
    const chave = process.env.RESEND_API_KEY;
    if (!chave) return null;
    return new Resend(chave);
}

interface EnvioEmail {
    para: string;
    assunto: string;
    html: string;
    texto: string;
}

async function enviar({ para, assunto, html, texto }: EnvioEmail): Promise<void> {
    const cliente = obterCliente();

    if (!cliente) {
        // Em desenvolvimento sem RESEND_API_KEY, registra o conteúdo no console
        // para que o fluxo continue testável.
        console.warn(
            `[email] RESEND_API_KEY ausente — e-mail não enviado para ${para}.\n${texto}`
        );
        return;
    }

    const { error } = await cliente.emails.send({
        from: REMETENTE,
        to: para,
        subject: assunto,
        html,
        text: texto,
    });

    if (error) {
        console.error('[email] Falha no envio via Resend:', error);
        throw new Error('Não foi possível enviar o e-mail. Tente novamente.');
    }
}

/** Envelope HTML compartilhado pelos e-mails transacionais. */
function moldura(conteudo: string): string {
    return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:28px 28px 20px;border-bottom:1px solid #e2e8f0;">
          <p style="margin:0;font-size:17px;font-weight:700;">LicitPro Analyzer</p>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Analisador de Inabilitação</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;font-size:14px;line-height:1.6;">${conteudo}</td>
      </tr>
      <tr>
        <td style="padding:0 28px 28px;font-size:12px;color:#94a3b8;line-height:1.5;">
          Se você não solicitou este e-mail, pode ignorá-lo com segurança.
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function botao(url: string, rotulo: string): string {
    return `<p style="margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">${rotulo}</a>
    </p>
    <p style="margin:0;font-size:12px;color:#64748b;word-break:break-all;">
      Ou copie e cole este endereço no navegador:<br />${url}
    </p>`;
}

export async function enviarVerificacaoEmail(dados: {
    para: string;
    nome?: string | null;
    url: string;
}): Promise<void> {
    const saudacao = dados.nome?.trim() ? `Olá, ${dados.nome.trim()}!` : 'Olá!';

    await enviar({
        para: dados.para,
        assunto: 'Confirme seu e-mail — LicitPro Analyzer',
        html: moldura(
            `<p style="margin:0 0 12px;">${saudacao}</p>
             <p style="margin:0;">Confirme seu endereço de e-mail para liberar a análise gratuita do LicitPro Analyzer. O link expira em 1 hora.</p>
             ${botao(dados.url, 'Confirmar e-mail')}`
        ),
        texto: `${saudacao}\n\nConfirme seu e-mail para liberar a análise gratuita do LicitPro Analyzer:\n${dados.url}\n\nO link expira em 1 hora.`,
    });
}

export async function enviarResetSenha(dados: {
    para: string;
    nome?: string | null;
    url: string;
}): Promise<void> {
    const saudacao = dados.nome?.trim() ? `Olá, ${dados.nome.trim()}!` : 'Olá!';

    await enviar({
        para: dados.para,
        assunto: 'Redefinição de senha — LicitPro Analyzer',
        html: moldura(
            `<p style="margin:0 0 12px;">${saudacao}</p>
             <p style="margin:0;">Recebemos um pedido para redefinir a senha da sua conta. O link abaixo expira em 1 hora e só pode ser usado uma vez.</p>
             ${botao(dados.url, 'Redefinir senha')}`
        ),
        texto: `${saudacao}\n\nUse o endereço abaixo para redefinir a senha da sua conta no LicitPro Analyzer:\n${dados.url}\n\nO link expira em 1 hora.`,
    });
}
