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
    
    // CORREÇÃO: Transforma os campos que são arrays de um único item em strings
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
            filename: getFieldValue(files.foto).originalFilename,
            path: getFieldValue(files.foto).filepath,
        });
    }

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

    return res.status(200).json({ message: 'Solicitação enviada com sucesso!' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
  }
}
