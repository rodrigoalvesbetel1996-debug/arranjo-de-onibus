
import React, { useState, useMemo } from 'react';
import { Passenger, User, JWEvent, AccommodationType, EventType } from '../types';
import { jsPDF } from 'jspdf';
import ConfirmModal from '../components/ConfirmModal';

interface PassengerManagementProps {
  user: User;
  passengers: Passenger[];
  events: JWEvent[];
  onAddPassengerGroup: (group: Partial<Passenger>[], existingGroupId?: string) => void;
  onRemovePassenger: (id: string) => void;
  onUploadDoc: (id: string, file: File) => void;
  onUpdatePassenger?: (p: Passenger) => void;
}

const PassengerManagement: React.FC<PassengerManagementProps> = ({ 
  user, 
  passengers, 
  events, 
  onAddPassengerGroup, 
  onRemovePassenger, 
  onUploadDoc,
  onUpdatePassenger
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempGroup, setTempGroup] = useState<Partial<Passenger>[]>([]);
  const [passengerToDelete, setPassengerToDelete] = useState<string | null>(null);
  const [selectedFilterDay, setSelectedFilterDay] = useState<string | null>(null);
  
  const [currentP, setCurrentP] = useState<Partial<Passenger>>({
    name: '',
    document: '',
    age: undefined,
    mobile: '',
    payerName: '',
    accommodationType: 'NORMAL',
    sitsOnLap: false,
    travelingWithParent: false,
    isPayer: false,
    selectedDays: []
  });

  const activeEvent = events.find(e => e.isActive);
  const myPassengers = useMemo(() => {
    let list = passengers.filter(p => p.congregationId === user.congregationId && p.eventId === activeEvent?.id);
    if (selectedFilterDay) {
      list = list.filter(p => p.selectedDays?.includes(selectedFilterDay));
    }
    return list;
  }, [passengers, user.congregationId, activeEvent, selectedFilterDay]);

  const isRegionalConvention = activeEvent?.type === EventType.REGIONAL_CONVENTION;

  const eventDates = useMemo(() => {
    if (!activeEvent || !activeEvent.startDate || !activeEvent.days) return [];
    const dates = [];
    const [year, month, day] = activeEvent.startDate.split('-').map(Number);
    // Create date at noon to avoid timezone shifts
    const startDateObj = new Date(year, month - 1, day, 12, 0, 0);
    
    for (let i = 0; i < activeEvent.days; i++) {
      const d = new Date(startDateObj);
      d.setDate(d.getDate() + i);
      dates.push(d.toLocaleDateString('en-CA')); // YYYY-MM-DD
    }
    return dates;
  }, [activeEvent]);

  const handleDownloadTerm = () => {
    // ... (mantido código do PDF) ...
    const doc = new jsPDF();
    const p = currentP;
    
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.rect(20, 15, 170, 22);
    doc.text('AUTORIZAÇÃO DE VIAGEM NACIONAL ACOMPANHADO', 105, 23, { align: 'center' });
    doc.text('PARA CRIANÇAS E ADOLESCENTES COM MENOS DE 16 ANOS', 105, 29, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('times', 'italic');
    doc.text('Fundamento: Resolução CNJ 295/2019', 105, 34, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Válida até: ______/________/20______ (no máximo dois anos a partir da data da emissão)', 25, 45);

    doc.text('Eu,____________________________________________________________________________________', 20, 55);
    doc.setFontSize(8);
    doc.text('Nome Completo de pai, ou mãe, ou tutor(a), ou guardiã(o), ou representante legal do menor de 16 anos', 25, 59);
    
    doc.setFontSize(10);
    doc.text(`Portador(a) do RG:________________ /___________, CPF ______.______.______ - ____ , residente na`, 20, 68);
    doc.setFontSize(8);
    doc.text('nº identidade / órgão expedidor                                  nº CPF', 45, 72);

    doc.setFontSize(10);
    doc.text('_______________________________________________________________________________________', 20, 80);
    doc.setFontSize(8);
    doc.text('endereço de quem está autorizando: rua, número e complemento', 35, 84);

    doc.setFontSize(10);
    doc.text('Bairro:____________________________ ; Cidade/Estado: _____________________________________', 20, 92);
    doc.setFontSize(8);
    doc.text('nome do bairro                                                                 nome da cidade / sigla do Estado', 35, 96);

    doc.setFontSize(10);
    doc.text('Celular: (___) _______-_________; E-mail: _______________________________________________', 20, 104);
    doc.setFontSize(8);
    doc.text('DDD       Telefone celular                                   endereço eletrônico ( xxxx@xxxx.com)', 25, 108);

    doc.setFontSize(10);
    doc.text('Na qualidade de: ( ) Mãe; ( ) Pai; ( ) Tutor(a); ( ) Guardião(ã); ( ) representante legal do menor de 16 anos;', 20, 116);

    doc.setFont('times', 'bold');
    doc.text('AUTORIZO a viajar, ( ) especificamente para _________________________________ (ida e volta); ou', 20, 126);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text('nome da cidade ou Estado de destino', 95, 130);
    
    doc.setFontSize(10);
    doc.text('( ) livremente pelo território nacional', 45, 136);

    doc.text(`a criança / o adolescente_________________________________________________________________,`, 20, 146);
    if (p.name) {
      doc.setFont('times', 'bold');
      doc.text(p.name.toUpperCase(), 55, 145);
      doc.setFont('times', 'normal');
    }
    doc.setFontSize(8);
    doc.text('Nome completo da criança ou adolescente', 80, 150);

    doc.setFontSize(10);
    doc.text('nascido(a) no dia _____/____ /______, na cidade ____________________, Estado __________,', 20, 158);
    if (p.age !== undefined) {
      const year = new Date().getFullYear() - p.age;
      doc.setFont('times', 'bold');
      doc.text(`   /   / ${year}`, 50, 157);
      doc.setFont('times', 'normal');
    }
    doc.setFontSize(8);
    doc.text('data de nascimento                                       cidade de nascimento                       Sigla do Estado', 35, 162);

    doc.setFontSize(10);
    doc.text(`Portador(a) do RG:________________ /___________, CPF ______.______.______ - ____ , residente na`, 20, 170);
    if (p.document) {
      doc.setFont('times', 'bold');
      doc.text(p.document, 55, 169);
      doc.setFont('times', 'normal');
    }
    doc.setFontSize(8);
    doc.text('nº identidade / órgão expedidor                                  nº CPF', 45, 174);

    doc.setFontSize(10);
    doc.text('_______________________________________________________________________________________', 20, 182);
    doc.setFontSize(8);
    doc.text('endereço da criança / adolescente: rua, número e complemento', 35, 186);

    doc.setFontSize(10);
    doc.text('Bairro:____________________________ ; Cidade/Estado: _____________________________________', 20, 194);
    doc.setFontSize(8);
    doc.text('nome do bairro                                                                 nome da cidade / sigla do Estado', 35, 198);

    doc.text('acompanhado por______________________________________________________________________________', 20, 206);
    doc.setFontSize(8);
    doc.text('Nome do(a) acompanhante da criança ou adolescente', 70, 210);

    doc.setFontSize(10);
    doc.text('Tel:(___)______-_______ Portador(a) do RG:________________/_____ CPF ______.______.______ - ____', 20, 218);
    doc.setFontSize(8);
    doc.text('nº Celular                                           nº identidade / órgão expedidor               nº CPF', 25, 222);

    const today = new Date();
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    doc.setFontSize(10);
    doc.text('_____________________________________, ______ de _____________ de 20____.', 20, 235);
    doc.text('Cascavel - PR', 25, 234);
    doc.text(String(today.getDate()), 85, 234);
    doc.text(months[today.getMonth()], 105, 234);
    doc.text(String(today.getFullYear()).substring(2), 155, 234);
    
    doc.setFontSize(8);
    doc.text('Local (Cidade/Estado)                                    Dia             Mês                            Ano', 30, 239);

    doc.line(40, 260, 170, 260);
    doc.setFontSize(9);
    doc.text('Assinatura de pai, mãe, tutor, guardião ou rep. legal do menor de 16 anos', 105, 265, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('times', 'italic');
    doc.text('(Obrigatório o reconhecimento de firma, conforme Resolução CNJ 295/2019)', 105, 269, { align: 'center' });

    doc.save(`Autorizacao_Viagem_${p.name || 'Menor'}.pdf`);
  };

  const openAddModal = () => {
    setEditingGroupId(null);
    setTempGroup([]);
    resetCurrentP('');
    setShowModal(true);
  };

  const openEditGroupModal = (groupId: string) => {
    const groupMembers = passengers.filter(p => p.groupId === groupId);
    if (groupMembers.length === 0) return;
    
    setEditingGroupId(groupId);
    setTempGroup([...groupMembers]);
    resetCurrentP(groupMembers[0].payerName);
    setShowModal(true);
  };

  const resetCurrentP = (payerName: string = '') => {
    setCurrentP({
      name: '',
      document: '',
      age: undefined,
      mobile: '',
      payerName: payerName,
      accommodationType: 'NORMAL',
      sitsOnLap: false,
      travelingWithParent: false,
      isPayer: false,
      selectedDays: []
    });
  };

  const validateMember = (p: Partial<Passenger>) => {
    if (!p.name || !p.document || p.age === undefined) {
      alert('Preencha Nome, Documento e Idade.');
      return false;
    }
    if (p.age < 6 && (p.accommodationType !== 'LAP' && p.accommodationType !== 'SEAT')) {
      alert('Para menores de 6 anos, selecione se irá no colo ou no assento.');
      return false;
    }
    if (isRegionalConvention && (!p.selectedDays || p.selectedDays.length === 0)) {
      alert('Para Congressos, é obrigatório selecionar pelo menos um dia de participação.');
      return false;
    }
    return true;
  };

  const handleAddMemberToTemp = () => {
    if (!validateMember(currentP)) return;

    const payer = editingGroupId ? tempGroup[0]?.payerName : (tempGroup.length > 0 ? tempGroup[0].payerName : currentP.payerName);
    if (!payer) {
      alert('O nome do responsável financeiro é obrigatório.');
      return;
    }

    const newMember: Partial<Passenger> = {
      ...currentP,
      id: currentP.id || `temp-${Date.now()}`,
      groupId: editingGroupId || 'pending',
      congregationId: user.congregationId,
      eventId: activeEvent?.id,
      payerName: payer,
      sitsOnLap: currentP.accommodationType === 'LAP',
      isUnaccompaniedMinor: currentP.age! < 16 && !currentP.travelingWithParent,
    };

    const updatedGroup = [...tempGroup.filter(m => m.id !== newMember.id), newMember];
    setTempGroup(updatedGroup);
    resetCurrentP(payer);
  };

  const removeMemberFromTemp = (id: string) => {
    setTempGroup(tempGroup.filter(m => m.id !== id));
  };

  const handleFinalizeGroup = () => {
    let finalGroup = [...tempGroup];
    
    if (currentP.name || currentP.document) {
      if (validateMember(currentP)) {
        const payer = finalGroup.length > 0 ? finalGroup[0].payerName : currentP.payerName;
        finalGroup.push({
          ...currentP,
          id: currentP.id || `temp-${Date.now()}-final`,
          groupId: editingGroupId || 'pending',
          congregationId: user.congregationId,
          eventId: activeEvent?.id,
          payerName: payer,
          sitsOnLap: currentP.accommodationType === 'LAP',
          isUnaccompaniedMinor: currentP.age! < 16 && !currentP.travelingWithParent,
        });
      } else {
        return;
      }
    }

    if (finalGroup.length === 0) {
      alert('Adicione pelo menos um passageiro.');
      return;
    }

    onAddPassengerGroup(finalGroup, editingGroupId || undefined);
    setShowModal(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Lista de Passageiros</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Gerencie grupos de viagem e autorizações.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none text-sm flex items-center gap-2"
        >
          <span>+</span> Novo Cadastro
        </button>
      </div>

      {isRegionalConvention && eventDates.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Resumo por Dia (Congresso)</h3>
            {selectedFilterDay && (
              <button 
                onClick={() => setSelectedFilterDay(null)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Limpar Filtro
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {eventDates.map(dateStr => {
              // Count from ALL passengers, not just the filtered ones
              const count = passengers.filter(p => p.congregationId === user.congregationId && p.eventId === activeEvent?.id && p.selectedDays?.includes(dateStr)).length;
              const dateObj = new Date(dateStr + 'T12:00:00');
              const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
              const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const isSelected = selectedFilterDay === dateStr;
              
              return (
                <div 
                  key={dateStr} 
                  onClick={() => setSelectedFilterDay(isSelected ? null : dateStr)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/40 dark:border-indigo-700 shadow-sm' 
                      : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <p className={`text-xs font-bold uppercase mb-1 capitalize ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {dayName} ({formattedDate})
                  </p>
                  <p className={`text-2xl font-black ${isSelected ? 'text-indigo-700 dark:text-indigo-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                    {count} <span className="text-sm font-medium opacity-70">passageiros</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-8 shadow-2xl my-8 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {editingGroupId ? 'Editar Grupo' : 'Novo Cadastro de Passageiro'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">Dados do Passageiro</h4>
                
                <div className="space-y-4">
                  {(tempGroup.length === 0 && !editingGroupId) && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável Financeiro *</label>
                      <input
                        type="text"
                        value={currentP.payerName}
                        onChange={e => setCurrentP({ ...currentP, payerName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                        placeholder="Nome de quem pagará"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo *</label>
                    <input
                      type="text"
                      value={currentP.name}
                      onChange={e => setCurrentP({ ...currentP, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none font-medium focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documento *</label>
                      <input
                        type="text"
                        value={currentP.document}
                        onChange={e => setCurrentP({ ...currentP, document: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none font-medium focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Idade *</label>
                      <input
                        type="number"
                        value={currentP.age ?? ''}
                        onChange={e => {
                          const age = parseInt(e.target.value);
                          setCurrentP({ 
                            ...currentP, 
                            age: isNaN(age) ? undefined : age,
                            accommodationType: (!isNaN(age) && age < 6) ? currentP.accommodationType : 'NORMAL'
                          });
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none font-bold focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {currentP.age !== undefined && currentP.age < 16 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Menor de Idade</p>
                        {!currentP.travelingWithParent && (
                          <button 
                            type="button" 
                            onClick={handleDownloadTerm} 
                            className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-600 uppercase hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                          >
                            📥 Baixar Termo
                          </button>
                        )}
                      </div>
                      <label className="flex items-start space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={currentP.travelingWithParent}
                          onChange={e => setCurrentP({ ...currentP, travelingWithParent: e.target.checked })}
                        />
                        <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">Viajando com Pai/Mãe ou parente de 1º grau?</span>
                      </label>
                    </div>
                  )}

                  {currentP.age !== undefined && currentP.age < 6 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                      <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase mb-2">Acomodação</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button"
                          onClick={() => setCurrentP({...currentP, accommodationType: 'LAP'})}
                          className={`p-2 rounded-lg border text-xs font-bold uppercase transition-all ${currentP.accommodationType === 'LAP' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                        >
                          No Colo
                        </button>
                        <button 
                          type="button"
                          onClick={() => setCurrentP({...currentP, accommodationType: 'SEAT'})}
                          className={`p-2 rounded-lg border text-xs font-bold uppercase transition-all ${currentP.accommodationType === 'SEAT' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                        >
                          No Assento
                        </button>
                      </div>
                    </div>
                  )}

                  {isRegionalConvention && eventDates.length > 0 && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl">
                      <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase mb-3">Dias de Participação *</p>
                      <div className="space-y-2">
                        {eventDates.map((dateStr, idx) => {
                          const dateObj = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone shifts
                          const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                          const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          const isSelected = currentP.selectedDays?.includes(dateStr);
                          
                          return (
                            <label key={dateStr} className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newDays = e.target.checked 
                                    ? [...(currentP.selectedDays || []), dateStr]
                                    : (currentP.selectedDays || []).filter(d => d !== dateStr);
                                  setCurrentP({ ...currentP, selectedDays: newDays });
                                }}
                              />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                                {dayName} <span className="text-slate-500 dark:text-slate-400 text-xs">({formattedDate})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddMemberToTemp}
                    className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:opacity-90 transition shadow-md"
                  >
                    {currentP.id && !currentP.id.toString().startsWith('temp') ? 'Atualizar Integrante' : 'Adicionar Passageiro'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resumo do Grupo</h4>
                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-md">{tempGroup.length} PESSOAS</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[350px]">
                  {tempGroup.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 py-12 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Grupo Vazio</p>
                      <p className="text-[10px] text-slate-400 mt-1">Adicione passageiros ao lado</p>
                    </div>
                  ) : (
                    tempGroup.map((m) => (
                      <div key={m.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{m.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{m.age} anos • {m.accommodationType === 'LAP' ? 'Colo' : 'Assento'}</p>
                          {isRegionalConvention && m.selectedDays && m.selectedDays.length > 0 && (
                            <p className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5 truncate">
                              Dias: {m.selectedDays.map(d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setCurrentP({...m})} className="w-8 h-8 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">✏️</button>
                          <button onClick={() => removeMemberFromTemp(m.id!)} className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleFinalizeGroup}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition transform active:scale-[0.98]"
                  >
                    Concluir e Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Passageiro / Grupo</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Idade</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acomodação</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {myPassengers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs font-medium uppercase tracking-wider">Nenhum passageiro cadastrado</td></tr>
              ) : (
                myPassengers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{p.name}</p>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-2">Resp: {p.payerName}</p>
                      
                      {isRegionalConvention && p.selectedDays && p.selectedDays.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.selectedDays.map(dateStr => {
                            const dateObj = new Date(dateStr + 'T12:00:00');
                            const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                            return (
                              <span key={dateStr} className="bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                                {dayName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      
                      {p.age < 16 && (
                        <div className="flex items-center gap-3">
                          {p.termOfResponsibilityUrl ? (
                            <div className="flex items-center gap-2 animate-in fade-in duration-300">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30">
                                ✅ Termo Enviado
                              </span>
                              <a
                                href={p.termOfResponsibilityUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 hover:underline"
                              >
                                Ver
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">
                                🔴 Pendente Termo
                              </span>
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700">
                                📎 Enviar
                                <input
                                  type="file"
                                  accept=".pdf,image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      onUploadDoc(p.id, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-600 dark:text-slate-400">{p.age}</td>
                    <td className="px-6 py-4">
                      {p.accommodationType === 'LAP' ? (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-blue-200 dark:border-blue-800">Colo</span>
                      ) : (
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200 dark:border-emerald-800">Assento</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEditGroupModal(p.groupId)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar Grupo">✏️</button>
                        <button onClick={() => setPassengerToDelete(p.id)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Excluir">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!passengerToDelete}
        title="Remover Passageiro"
        message="Deseja realmente remover este passageiro? Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (passengerToDelete) {
            onRemovePassenger(passengerToDelete);
            setPassengerToDelete(null);
          }
        }}
        onCancel={() => setPassengerToDelete(null)}
      />
    </div>
  );
};

export default PassengerManagement;
