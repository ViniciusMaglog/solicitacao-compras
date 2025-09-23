// pages/api/solicitacao.js
import nodemailer from 'nodemailer';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const form = formidable({ multiples: true });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            resolve({ fields, files });
        });
    });
    
    // NOVO: Processa a lista de itens recebida do formulário
    const items = [];
    const itemCount = parseInt(fields.item_count, 10);
    for (let i = 0; i < itemCount; i++) {
        if (fields[`servico_${i}`]) {
            items.push({
                servico: fields[`servico_${i}`],
                quantidade: fields[`quantidade_${i}`],
            });
        }
    }

    // NOVO: Gera uma tabela HTML com os itens para o corpo do e-mail
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
      port: process.env.EMAIL_SERVER_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    const attachments = [];
    if (files.foto && files.foto.size > 0) {
        attachments.push({
            filename: files.foto.originalFilename,
            path: files.foto.filepath,
        });
    }

    // ALTERADO: Corpo do e-mail agora inclui a tabela de itens
    const mailOptions = {
      from: `"${fields.requisitadoPor || 'Sistema de Compras'}" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      cc: fields.copiaEmail || '',
      subject: `Nova Solicitação de Compra - Setor: ${fields.setor}`,
      html: `
        <h1>Nova Solicitação de Compras</h1>
        <p><strong>Data:</strong> ${fields.data}</p>
        <p><strong>Setor:</strong> ${fields.setor}</p>
        <p><strong>Requisitado por:</strong> ${fields.requisitadoPor}</p>
        <p><strong>Nível de Urgência:</strong> ${fields.urgencia}</p>
        <hr>
        <h3>Itens Solicitados:</h3>
        ${itemsHtml}
        <hr>
        <h3>Justificativa:</h3>
        <p>${fields.justificativa.replace(/\n/g, '<br>')}</p>
        <br>
        <p><em>Cópia enviada para: ${fields.copiaEmail || 'N/A'}</em></p>
      `,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Solicitação enviada com sucesso!' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
  }
}