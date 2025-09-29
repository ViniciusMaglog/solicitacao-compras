import { useState } from 'react';
import Image from 'next/image';
// --- NOVO: Importação da biblioteca de compressão ---
import imageCompression from 'browser-image-compression';

export default function HomePage() {
  const [status, setStatus] = useState({ submitting: false, success: false, error: '' });
  const [items, setItems] = useState([{ servico: '', quantidade: '' }]);

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

  // --- ALTERADO: handleSubmit agora inclui a compressão da imagem ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ submitting: true, success: false, error: '' });

    const formData = new FormData(event.target);

    // Lógica de Compressão de Imagem
    const imageFile = formData.get('foto');
    if (imageFile && imageFile.size > 0) {
      console.log(`Tamanho original: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`);
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      try {
        const compressedFile = await imageCompression(imageFile, options);
        console.log(`Tamanho comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
        // Substitui o arquivo original pelo comprimido no formData
        formData.set('foto', compressedFile, compressedFile.name);
      } catch (error) {
        console.error('Erro ao comprimir imagem:', error);
        setStatus({ submitting: false, success: false, error: 'Erro ao processar a imagem.' });
        return;
      }
    }
    
    // Lógica para adicionar itens dinâmicos (sem alteração)
    formData.delete('servico');
    formData.delete('quantidade');
    items.forEach((item, index) => {
      formData.append(`servico_${index}`, item.servico);
      formData.append(`quantidade_${index}`, item.quantidade);
    });
    formData.append('item_count', items.length);

    // Lógica de envio (sem alteração)
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

  const inputStyles = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500";
  const labelStyles = "block font-medium mb-2 text-gray-700 dark:text-gray-200";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex justify-center">
          <Image src="/logo.png" alt="Logo da Empresa" width={128} height={40} priority />
        </div>
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">Solicitação de Compras</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="data" className={labelStyles}>Data *</label>
            <input type="date" id="data" name="data" defaultValue={new Date().toISOString().split('T')[0]} required className={inputStyles} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="setor" className={labelStyles}>Setor *</label>
              <select id="setor" name="setor" required className={inputStyles}>
                <option value="">Selecione seu setor</option>
                <option value="Logistica">Logística</option>
                <option value="Transporte">Transporte</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Diretoria">Diretoria</option>
              </select>
            </div>
            <div>
              <label htmlFor="requisitadoPor" className={labelStyles}>Requisitado por</label>
              <input type="text" id="requisitadoPor" name="requisitadoPor" className={inputStyles} />
            </div>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md space-y-3">
            <h3 className="font-medium text-gray-700 dark:text-gray-200">Itens da Solicitação</h3>
            {items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
                <div className="flex-grow w-full">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Serviço/Produto</label>
                  <input type="text" name="servico" value={item.servico} onChange={(e) => handleItemChange(index, e)} className={`${inputStyles} text-sm`} />
                </div>
                <div className="w-full sm:w-1/4">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Quantidade</label>
                  <input type="text" name="quantidade" value={item.quantidade} onChange={(e) => handleItemChange(index, e)} className={`${inputStyles} text-sm`} />
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => handleRemoveItem(index)} className="w-full sm:w-auto px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">-</button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddItem} className="mt-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-bold">+</button>
          </div>
          <div>
            <label htmlFor="justificativa" className={labelStyles}>Detalhe e justifique sua solicitação</label>
            <textarea id="justificativa" name="justificativa" rows="4" className={inputStyles} placeholder="Ex: Material de escritório para o novo estagiário..."></textarea>
          </div>
          <div>
            <label htmlFor="foto" className={labelStyles}>Anexar foto (opcional)</label>
            <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 dark:border-gray-600">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label htmlFor="foto" className="relative cursor-pointer rounded-md bg-white font-medium text-green-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 hover:text-green-500 dark:bg-gray-800 dark:text-green-400 dark:hover:text-green-300">
                    <span>Carregar um arquivo</span>
                    {/* Adicionado o 'accept' para melhorar a experiência do usuário */}
                    <input id="foto" name="foto" type="file" className="sr-only" accept="image/*" />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF até 10MB</p>
              </div>
            </div>
          </div>
          <div>
            <span className={labelStyles}>Nível de urgência</span>
            <div className="mt-2 flex items-center flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center cursor-pointer"><input type="radio" name="urgencia" value="Baixa" className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500" /> <span className="ml-2 text-gray-700 dark:text-gray-300">Baixa</span></label>
              <label className="flex items-center cursor-pointer"><input type="radio" name="urgencia" value="Media" defaultChecked className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500" /> <span className="ml-2 text-gray-700 dark:text-gray-300">Média</span></label>
              <label className="flex items-center cursor-pointer"><input type="radio" name="urgencia" value="Alta" className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500" /> <span className="ml-2 text-gray-700 dark:text-gray-300">Alta</span></label>
            </div>
          </div>
          <div>
            <label htmlFor="copiaEmail" className={labelStyles}>Enviar cópia para seu e-mail</label>
            <input type="email" id="copiaEmail" name="copiaEmail" className={inputStyles} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4 space-y-2 space-y-reverse sm:space-y-0">
            <button type="button" onClick={() => window.print()} className="w-full sm:w-auto px-6 py-2 border border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">IMPRIMIR</button>
            <button type="submit" disabled={status.submitting} className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-green-400 dark:disabled:bg-green-800 transition-colors">
              {status.submitting ? 'Enviando...' : 'ENVIAR'}
            </button>
          </div>
          {status.success && <p className="text-center text-green-600 dark:text-green-400">Solicitação enviada com sucesso!</p>}
          {status.error && <p className="text-center text-red-600 dark:text-red-400">Erro: {status.error}</p>}
        </form>
      </div>
    </div>
  );
}