import nodemailer from 'nodemailer';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

// ==========================================================
// NOTIFICAÇÃO DE COMPRAS PARA O DISCORD
// ==========================================================
async function enviarNotificacaoDiscordCompras(dados) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log(
      'Webhook do Discord não configurado. Pulando notificação.'
    );
    return;
  }

  const itensDescricao =
    dados.items
      .map((item) => `- ${item.servico}: ${item.quantidade}`)
      .join('\n') || 'Nenhum item informado.';

  const getColor = (urgencia) => {
    switch (urgencia?.toLowerCase()) {
      case 'alta':
        return 15158332; // Vermelho
      case 'média':
      case 'media':
        return 15844367; // Amarelo
      case 'baixa':
        return 3066993; // Verde
      default:
        return 5814783; // Azul padrão
    }
  };

  const payload = {
    content: '🛒 **Nova Solicitação de Compra Recebida!**',
    embeds: [
      {
        title: 'Detalhes da Solicitação de Compra',
        color: getColor(dados.urgencia),
        fields: [
          {
            name: 'Requisitado por',
            value: dados.requisitadoPor || 'Não informado',
            inline: true,
          },
          {
            name: 'Setor',
            value: dados.setor || 'Não informado',
            inline: true,
          },
          {
            name: 'Nível de Urgência',
            value: `**${dados.urgencia || 'Não definido'}**`,
          },
          {
            name: 'Itens Solicitados',
            value: itensDescricao,
          },
          {
            name: 'Justificativa',
            value: dados.justificativa || 'Nenhuma',
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Sistema de Solicitação de Compras',
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(
        'Notificação de compra enviada para o Discord com sucesso.'
      );
    } else {
      console.error(
        `Erro ao enviar notificação para o Discord: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error(
      'Falha ao enviar requisição para o Discord:',
      error
    );
  }
}

// ==========================================================
// API - SOLICITAÇÃO DE COMPRAS
// ==========================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Método não permitido',
    });
  }

  const form = formidable({
    multiples: true,
    allowEmptyFiles: true,
    minFileSize: 0,
  });

  try {
    // ======================================================
    // LEITURA DO FORMULÁRIO
    // ======================================================
    const { fields, files } = await new Promise(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            fields,
            files,
          });
        });
      }
    );

    const getFieldValue = (value) =>
      Array.isArray(value) ? value[0] : value;

    const data = getFieldValue(fields.data);
    const setor = getFieldValue(fields.setor);
    const requisitadoPor = getFieldValue(
      fields.requisitadoPor
    );
    const urgencia = getFieldValue(fields.urgencia);
    const justificativa = getFieldValue(
      fields.justificativa
    );
    const copiaEmail = getFieldValue(fields.copiaEmail);

    const itemCount = parseInt(
      getFieldValue(fields.item_count),
      10
    );

    // ======================================================
    // ITENS DA SOLICITAÇÃO
    // ======================================================
    const items = [];

    if (!isNaN(itemCount)) {
      for (let i = 0; i < itemCount; i++) {
        const servico = getFieldValue(
          fields[`servico_${i}`]
        );

        const quantidade = getFieldValue(
          fields[`quantidade_${i}`]
        );

        if (servico) {
          items.push({
            servico,
            quantidade,
          });
        }
      }
    }

    // ======================================================
    // TABELA HTML DOS ITENS
    // ======================================================
    const itemsHtml = `
      <table
        style="
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, sans-serif;
        "
      >
        <thead>
          <tr>
            <th
              style="
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                background-color: #f2f2f2;
              "
            >
              Serviço/Produto
            </th>

            <th
              style="
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                background-color: #f2f2f2;
              "
            >
              Quantidade
            </th>
          </tr>
        </thead>

        <tbody>
          ${items
            .map(
              (item) => `
                <tr>
                  <td
                    style="
                      border: 1px solid #ddd;
                      padding: 8px;
                    "
                  >
                    ${item.servico || ''}
                  </td>

                  <td
                    style="
                      border: 1px solid #ddd;
                      padding: 8px;
                    "
                  >
                    ${item.quantidade || ''}
                  </td>
                </tr>
              `
            )
            .join('')}
        </tbody>
      </table>
    `;

    // ======================================================
    // VALIDAÇÃO DAS VARIÁVEIS DE AMBIENTE
    // ======================================================
    if (!process.env.GMAIL_USER) {
      throw new Error(
        'Variável GMAIL_USER não configurada na Vercel.'
      );
    }

    if (!process.env.GMAIL_APP_PASSWORD) {
      throw new Error(
        'Variável GMAIL_APP_PASSWORD não configurada na Vercel.'
      );
    }

    if (!process.env.EMAIL_TO) {
      throw new Error(
        'Variável EMAIL_TO não configurada na Vercel.'
      );
    }

    // ======================================================
    // TRANSPORTER - GMAIL
    // ======================================================
    const transporter = nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // ======================================================
    // ANEXOS
    // ======================================================
    const attachments = [];

    const fotoFile = getFieldValue(files.foto);

    if (fotoFile && fotoFile.size > 0) {
      attachments.push({
        filename:
          fotoFile.originalFilename || 'anexo',
        path: fotoFile.filepath,
        contentType: fotoFile.mimetype || undefined,
      });
    }

    // ======================================================
    // CONFIGURAÇÃO DO E-MAIL
    // ======================================================
    const mailOptions = {
      from: `"Envios Maglog" <${process.env.GMAIL_USER}>`,

      to: process.env.EMAIL_TO,

      // Só adiciona CC quando um e-mail foi informado
      ...(copiaEmail
        ? {
            cc: copiaEmail,
          }
        : {}),

      subject: `Nova Solicitação de Compra - Setor: ${
        setor || 'Não informado'
      }`,

      html: `
        <div
          style="
            font-family: Arial, Helvetica, sans-serif;
            color: #333333;
            max-width: 800px;
            margin: 0 auto;
          "
        >

          <h1
            style="
              color: #164e63;
              border-bottom: 2px solid #164e63;
              padding-bottom: 10px;
            "
          >
            Nova Solicitação de Compras
          </h1>

          <p>
            <strong>Data:</strong>
            ${data || 'Não informada'}
          </p>

          <p>
            <strong>Setor:</strong>
            ${setor || 'Não informado'}
          </p>

          <p>
            <strong>Requisitado por:</strong>
            ${requisitadoPor || 'Não informado'}
          </p>

          <p>
            <strong>Nível de Urgência:</strong>
            ${urgencia || 'Não definido'}
          </p>

          <hr
            style="
              border: none;
              border-top: 1px solid #dddddd;
              margin: 20px 0;
            "
          >

          <h3>Itens Solicitados:</h3>

          ${itemsHtml}

          <hr
            style="
              border: none;
              border-top: 1px solid #dddddd;
              margin: 20px 0;
            "
          >

          <h3>Justificativa:</h3>

          <p>
            ${(justificativa || 'Nenhuma justificativa informada.').replace(
              /\n/g,
              '<br>'
            )}
          </p>

          <br>

          <p
            style="
              font-size: 12px;
              color: #777777;
            "
          >
            <em>
              ${
                copiaEmail
                  ? `Cópia enviada para: ${copiaEmail}`
                  : 'Nenhuma cópia adicional solicitada.'
              }
            </em>
          </p>

          <hr
            style="
              border: none;
              border-top: 1px solid #dddddd;
              margin: 20px 0;
            "
          >

          <p
            style="
              font-size: 11px;
              color: #999999;
            "
          >
            E-mail enviado automaticamente pelo Sistema de
            Solicitação de Compras Maglog.
          </p>

        </div>
      `,

      attachments,
    };

    // ======================================================
    // ENVIO DO E-MAIL
    // ======================================================
    console.log(
      `Enviando solicitação por e-mail para ${process.env.EMAIL_TO}...`
    );

    const info = await transporter.sendMail(
      mailOptions
    );

    console.log(
      'E-mail enviado com sucesso:',
      info.messageId
    );

    // ======================================================
    // NOTIFICAÇÃO DO DISCORD
    // ======================================================
    await enviarNotificacaoDiscordCompras({
      requisitadoPor,
      setor,
      urgencia,
      justificativa,
      items,
    });

    // ======================================================
    // RETORNO DE SUCESSO
    // ======================================================
    return res.status(200).json({
      message: 'Solicitação enviada com sucesso!',
    });
  } catch (error) {
    console.error(
      'Erro ao processar solicitação:',
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        'Erro interno no servidor.',
    });
  }
}