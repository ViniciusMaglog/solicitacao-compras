import nodemailer from 'nodemailer';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

// --- NOVO: Função para enviar notificação de COMPRAS para o Discord ---
async function enviarNotificacaoDiscordCompras(dados) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL; // Usa a mesma variável de ambiente
  if (!webhookUrl) {
    console.log('Webhook do Discord não configurado. Pulando notificação.');
    return;
  }

  // Formata a lista de itens para uma string legível
  const itensDescricao = dados.items.map(item => `- ${item.servico}: ${item.quantidade}`).join('\n') || 'Nenhum item informado.';

  // Define uma cor baseada na urgência
  const getColor = (urgencia) => {
    switch (urgencia?.toLowerCase()) {
      case 'alta': return 15158332; // Vermelho
      case 'média': return 15844367; // Amarelo
      case 'baixa': return 3066993;  // Verde
      default: return 5814783;      // Azul padrão
    }
  };

  // Monta a mensagem usando o formato "Embed" do Discord
  const payload = {
    content: `🛒 **Nova Solicitação de Compra Recebida!**`,
    embeds: [
      {
        title: 'Detalhes da Solicitação de Compra',
        color: getColor(dados.urgencia), // Cor dinâmica!
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

    // --- LÓGICA DO E-MAIL (SEM ALTERAÇÃO) ---
    const itemsHtml = `...`; // Seu código HTML para a tabela de itens
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      secure: false,
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
    const mailOptions = {
      from: `"${requisitadoPor || 'Sistema de Compras'}" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      cc: copiaEmail || '',
      subject: `Nova Solicitação de Compra - Setor: ${setor}`,
      html: `...`, // Seu HTML completo do e-mail
      attachments: attachments,
    };
    
    await transporter.sendMail(mailOptions);
    
    // --- NOVO: Chama a função para notificar o Discord após enviar o e-mail ---
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
