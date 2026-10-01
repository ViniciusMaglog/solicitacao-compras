import nodemailer from 'nodemailer';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

// --- Função para enviar notificação de COMPRAS para o Discord ---
async function enviarNotificacaoDiscordCompras(dados) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Webhook do Discord não configurado. Pulando notificação.');
    return;
  }
  const itensDescricao = dados.items.map(item => `- ${item.servico}: ${item.quantidade}`).join('\n') || 'Nenhum item informado.';
  const getColor = (urgencia) => {
    switch (urgencia?.toLowerCase()) {
      case 'alta': return 15158332; // Vermelho
      case 'média': return 15844367; // Amarelo
      case 'baixa': return 3066993;  // Verde
      default: return 5814783;      // Azul padrão
    }
  };
  const payload = {
    content: `🛒 **Nova Solicitação de Compra Recebida!**`,
    embeds: [
      {
        title: 'Detalhes da Solicitação de Compra',
        color: getColor(dados.urgencia),
        fields: [
          { name: 'Requisitado por', value: dados.requisitadoPor || 'Não informado', inline: true },
          { name: 'Setor', value: dados.setor, inline: true },
          { name: 'Nível de Urgência', value: `**${dados.urgencia || 'Não definido'}**` },
          { name: 'Itens Solicitados', value: itensDescricao },
          { name: 'Justificativa', value: dados.justificativa || 'Nenhuma' },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Sistema de Solicitação de Compras' },
      },
    ],
  };
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      console.log('Notificação de compra enviada para o Discord com sucesso.');
    } else {
      console.error(`Erro ao enviar notificação para o Discord: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Falha ao enviar requisição para o Discord:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const form = formidable({ multiples: true, allowEmptyFiles: true, minFileSize: 0 });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const getFieldValue = (value) => (Array.isArray(value) ? value[0] : value);

    const data = getFieldValue(fields.data);
    const setor = getFieldValue(fields.setor);
    const requisitadoPor = getFieldValue(fields.requisitadoPor);
    const urgencia = getFieldValue(fields.urgencia);
    const justificativa = getFieldValue(fields.justificativa);
    const copiaEmail = getFieldValue(fields.copiaEmail);
    const itemCount = parseInt(getFieldValue(fields.item_count), 10);

    const items = [];
    if (!isNaN(itemCount)) {
      for (let i = 0; i < itemCount; i++) {
        const servico = getFieldValue(fields[`servico_${i}`]);
        const quantidade = getFieldValue(fields[`quantidade_${i}`]);
        if (servico) {
          items.push({ servico, quantidade });
        }
      }
    }

    // --- CÓDIGO RESTAURADO: Construção da tabela de itens para o e-mail ---
    const itemsHtml = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Serviço/Produto</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.servico}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.quantidade}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

    const attachments = [];
    const fotoFile = getFieldValue(files.foto);
    if (fotoFile && fotoFile.size > 0) {
      attachments.push({
        filename: fotoFile.originalFilename,
        path: fotoFile.filepath,
      });
    }

    // --- CÓDIGO RESTAURADO: Corpo do e-mail completo ---
    const mailOptions = {
      from: `"${requisitadoPor || 'Sistema de Compras'}" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      cc: copiaEmail || '',
      subject: `Nova Solicitação de Compra - Setor: ${setor}`,
      html: `
        <h1>Nova Solicitação de Compras</h1>
        <p><strong>Data:</strong> ${data}</p>
        <p><strong>Setor:</strong> ${setor}</p>
        <p><strong>Requisitado por:</strong> ${requisitadoPor}</p>
        <p><strong>Nível de Urgência:</strong> ${urgencia}</p>
        <hr>
        <h3>Itens Solicitados:</h3>
        ${itemsHtml}
        <hr>
        <h3>Justificativa:</h3>
        <p>${(justificativa || '').replace(/\n/g, '<br>')}</p>
        <br>
        <p><em>Cópia enviada para: ${copiaEmail || 'N/A'}</em></p>
      `,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    
    await enviarNotificacaoDiscordCompras({
        requisitadoPor,
        setor,
        urgencia,
        justificativa,
        items,
    });

    return res.status(200).json({ message: 'Solicitação enviada com sucesso!' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
  }
}
