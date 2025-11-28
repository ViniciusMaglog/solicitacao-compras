import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

export default function SolicitacaoComprasPage() {
  const [status, setStatus] = useState({ submitting: false, success: false, error: '' });
  const [items, setItems] = useState([{ servico: '', quantidade: '' }]);
  const [dataAtual, setDataAtual] = useState('');

  useEffect(() => {
    // Define a data atual no formato YYYY-MM-DD
    setDataAtual(new Date().toISOString().split('T')[0]);
  }, []);

  const handleItemChange = (index, event) => {
    const newItems = [...items];
    newItems[index][event.target.name] = event.target.value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { servico: '', quantidade: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ submitting: true, success: false, error: '' });

    const formData = new FormData(event.target);

    // Compressão de Imagem
    const imageFile = formData.get('foto');
    if (imageFile && imageFile.size > 0) {
      try {
        const compressedFile = await imageCompression(imageFile, { 
            maxSizeMB: 1, 
            maxWidthOrHeight: 1920, 
            useWebWorker: true 
        });
        formData.set('foto', compressedFile, compressedFile.name);
      } catch (error) {
        setStatus({ submitting: false, success: false, error: 'Erro ao processar imagem.' });
        return;
      }
    }
    
    // Remove campos arrays originais para inserir serializados
    formData.delete('servico');
    formData.delete('quantidade');
    
    // IMPORTANTE: Como o campo data está disabled, ele não é enviado automaticamente pelo FormData.
    // Precisamos adicionar manualmente o valor do estado dataAtual.
    formData.set('data', dataAtual);
    
    items.forEach((item, index) => {
      formData.append(`servico_${index}`, item.servico);
      formData.append(`quantidade_${index}`, item.quantidade);
    });
    formData.append('item_count', items.length);

    try {
      const response = await fetch('/api/solicitacao', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Algo deu errado.');
      setStatus({ submitting: false, success: true, error: '' });
      event.target.reset();
      setItems([{ servico: '', quantidade: '' }]);
    } catch (error) {
      setStatus({ submitting: false, success: false, error: error.message });
    }
  };

  // --- ESTILOS PADRONIZADOS ---
  const labelStyles = "block font-bold text-gray-700 dark:text-gray-300 text-xs uppercase mb-1";
  
  // Estilo Geral
  const baseInputStyles = "border rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm border-gray-300 disabled:bg-gray-200 disabled:dark:bg-gray-800 disabled:text-gray-400 disabled:dark:text-gray-600 disabled:cursor-not-allowed";
  
  // Input Padrão (Mobile e Form)
  const inputStyles = `w-full px-3 py-3 ${baseInputStyles} bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white`;

  // Input Tabela (Desktop)
  const tableInputStyles = `w-full h-10 px-2 ${baseInputStyles} bg-transparent dark:text-white dark:border-gray-600`;

  // Select Styles
  const selectStyles = `w-full px-3 py-3 ${baseInputStyles} bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white`;

  return (
    <div className="min-h-screen bg-gray-200 dark:bg-gray-900 p-2 md:p-4 font-sans transition-colors duration-200">
      <Head><title>Solicitação de Compras - Maglog</title></Head>
      
      <div className="w-full max-w-[95%] mx-auto bg-white dark:bg-gray-800 p-4 md:p-8 rounded-lg shadow-xl border-t-8 border-cyan-900 dark:border-cyan-600">
        
        {/* LOGO */}
        <div className="flex justify-center mb-4 md:mb-6">
            <Image src="/logo.png" alt="Logo Maglog" width={180} height={60} priority className="w-32 md:w-48 h-auto" />
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-center text-cyan-900 dark:text-cyan-400 mb-6 border-b-2 border-gray-200 dark:border-gray-700 pb-2 uppercase">
            Solicitação de Compras
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Dados Iniciais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-300 dark:border-gray-600 p-4 rounded bg-gray-50 dark:bg-gray-700/30">
             <div>
                <label className={labelStyles}>Data (Automática)</label>
                {/* DATA AGORA FIXA E DESABILITADA */}
                <input 
                    type="date" 
                    name="data" 
                    value={dataAtual} 
                    disabled 
                    className={`${inputStyles} bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed`} 
                />
             </div>
             <div>
                <label className={labelStyles}>Setor *</label>
                <select name="setor" required className={selectStyles}>
                    <option value="">Selecione...</option>
                    <option value="Logistica">Logística</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Diretoria">Diretoria</option>
                    <option value="Operacional">Operacional</option>
                    <option value="TI">TI</option>
                </select>
             </div>
             <div>
                <label className={labelStyles}>Requisitado Por</label>
                <input type="text" name="requisitadoPor" className={inputStyles} placeholder="Seu nome" />
             </div>
          </div>

          {/* --- TABELA DESKTOP --- */}
          <div className="hidden md:block overflow-x-auto border border-gray-300 dark:border-gray-600 rounded">
            <table className="w-full text-sm border-collapse min-w-[600px]">
                <thead className="bg-cyan-900 dark:bg-cyan-950 text-white">
                    <tr>
                        <th className="p-2 border border-cyan-800 text-left w-3/4">Descrição do Serviço / Produto</th>
                        <th className="p-2 border border-cyan-800 text-center w-1/6">Quantidade</th>
                        <th className="p-2 border border-cyan-800 w-12 text-center">Excluir</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                        <tr key={index} className="bg-white dark:bg-gray-800 align-middle">
                            <td className="p-1 border dark:border-gray-600">
                                <input 
                                    type="text" 
                                    name="servico" 
                                    value={item.servico} 
                                    onChange={(e) => handleItemChange(index, e)} 
                                    className={tableInputStyles} 
                                    placeholder="Descreva o item..."
                                />
                            </td>
                            <td className="p-1 border dark:border-gray-600">
                                <input 
                                    type="text" 
                                    name="quantidade" 
                                    value={item.quantidade} 
                                    onChange={(e) => handleItemChange(index, e)} 
                                    className={`${tableInputStyles} text-center`}
                                    placeholder="0"
                                />
                            </td>
                            <td className="p-1 border dark:border-gray-600">
                                {items.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveItem(index)} className="w-full h-10 flex items-center justify-center text-red-500 hover:text-red-700 font-bold transition-colors">X</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          {/* --- CARDS MOBILE --- */}
          <div className="block md:hidden space-y-4">
            <h3 className="font-bold text-cyan-900 dark:text-cyan-400 text-lg border-b border-gray-300 dark:border-gray-700 pb-2">Itens da Compra</h3>
            {items.map((item, index) => (
                <div key={index} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-4 rounded shadow-sm">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="font-bold text-gray-600 dark:text-white">Item #{index + 1}</span>
                        {items.length > 1 && <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 dark:text-red-300 text-sm font-bold border border-red-200 dark:border-red-800 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/50">Excluir</button>}
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className={labelStyles}>Descrição do Serviço / Produto</label>
                            <input type="text" name="servico" value={item.servico} onChange={(e) => handleItemChange(index, e)} className={inputStyles} />
                        </div>
                        <div>
                            <label className={labelStyles}>Quantidade</label>
                            <input type="text" name="quantidade" value={item.quantidade} onChange={(e) => handleItemChange(index, e)} className={inputStyles} />
                        </div>
                    </div>
                </div>
            ))}
          </div>

          {/* Botão Adicionar */}
          <button type="button" onClick={handleAddItem} className="w-full md:w-auto mt-2 text-sm bg-cyan-600 text-white px-6 py-3 rounded hover:bg-cyan-700 transition-colors font-bold">+ Adicionar Item</button>

          {/* Justificativa e Urgência */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className={labelStyles}>Justificativa / Detalhes</label>
                  <textarea name="justificativa" rows="4" className={inputStyles} placeholder="Detalhe e justifique sua solicitação..."></textarea>
              </div>
              <div className="space-y-6">
                  <div>
                      <label className={labelStyles}>Nível de Urgência</label>
                      <select name="urgencia" className={selectStyles}>
                          <option value="Baixa">Baixa</option>
                          <option value="Media" selected>Média</option>
                          <option value="Alta">Alta</option>
                      </select>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-700 rounded">
                      <label className={labelStyles}>Anexar Foto / Arquivo (Opcional)</label>
                      <input name="foto" type="file" accept="image/*" className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-cyan-100 dark:file:bg-cyan-900 file:text-cyan-700 dark:file:text-cyan-300 hover:file:bg-cyan-200 dark:hover:file:bg-cyan-800" />
                  </div>
              </div>
          </div>

          <div className="border border-gray-300 dark:border-gray-600 p-4 rounded bg-white dark:bg-gray-800">
            <div className="flex items-center"><input type="checkbox" id="enviarCopia" name="enviarCopia" className="h-5 w-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" /><label htmlFor="enviarCopia" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Enviar cópia para seu e-mail</label></div>
            <input type="email" name="copiaEmail" className={`${inputStyles} mt-3`} placeholder="seu@email.com" />
          </div>

          <div className="text-center pt-4 pb-8">
             <button type="submit" disabled={status.submitting} className="w-full md:w-1/2 px-8 py-4 bg-cyan-900 dark:bg-cyan-700 text-white font-bold rounded shadow hover:bg-cyan-800 dark:hover:bg-cyan-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors text-lg">
                {status.submitting ? 'ENVIANDO...' : 'ENVIAR SOLICITAÇÃO'}
             </button>
          </div>

          {status.success && <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded text-center font-bold mb-8">Solicitação enviada com sucesso!</div>}
          {status.error && <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded text-center font-bold mb-8">Erro: {status.error}</div>}

        </form>
      </div>
    </div>
  );
}