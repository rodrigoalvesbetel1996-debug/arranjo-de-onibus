
import React, { useState, useMemo } from 'react';
import { Congregation, User, UserRole, Passenger, PaymentReceipt, SHReport, JWEvent } from '@/types';
import { generateSHPdf, generatePassengerListPdf, generateConsolidatedPassengerListPdf } from '@/utils/pdfGenerator';
import ConfirmModal from '@/components/ConfirmModal';

interface CongregationManagementProps {
  user: User;
  congregations: Congregation[];
  passengers: Passenger[];
  payments: PaymentReceipt[];
  reports: SHReport[];
  events: JWEvent[];
  onUpdateCongregation: (cong: Congregation) => void;
  onAddCongregation: (cong: Partial<Congregation>) => void;
  onDeletePayment: (id: string) => void;
  onAddPayment: (pay: Partial<PaymentReceipt>) => void;
}

const CongregationManagement: React.FC<CongregationManagementProps> = ({ 
  user, 
  congregations, 
  passengers, 
  payments, 
  reports, 
  events,
  onUpdateCongregation,
  onAddCongregation,
  onDeletePayment,
  onAddPayment
}) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const activeEvent = events.find(e => e.isActive);
  
  const [selectedCongId, setSelectedCongId] = useState<string | null>(null);
  const [editingCong, setEditingCong] = useState<Congregation | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  // Form states for profile editing
  const [formData, setFormData] = useState({
    name: '',
    coordinatorName: '',
    circuit: '',
    cityState: '',
    phone: ''
  });

  // --- CÁLCULOS E DADOS ---

  const eventDates = useMemo(() => {
    if (!activeEvent || !activeEvent.startDate) return [];
    const days = activeEvent.days || 1;
    const dates = [];
    const [year, month, day] = activeEvent.startDate.split('-').map(Number);
    // Create date at noon to avoid timezone shifts
    const startDateObj = new Date(year, month - 1, day, 12, 0, 0);
    
    for (let i = 0; i < days; i++) {
      const d = new Date(startDateObj);
      d.setDate(d.getDate() + i);
      dates.push({
        dateStr: d.toLocaleDateString('en-CA'), // YYYY-MM-DD
        dayName: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
        formattedDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      });
    }
    return dates;
  }, [activeEvent]);

  const getCongregationStats = (congId: string) => {
    const congPassengers = passengers.filter(p => p.congregationId === congId && p.eventId === activeEvent?.id);
    const congPayments = payments.filter(p => p.congregationId === congId && p.eventId === activeEvent?.id);
    
    const passengerPayments = congPayments.filter(p => p.payerName !== 'CONGREGAÇÃO');
    const congregationTransfers = congPayments.filter(p => p.payerName === 'CONGREGAÇÃO');

    const seats = congPassengers.filter(p => p.accommodationType !== 'LAP').length;
    const lap = congPassengers.filter(p => p.accommodationType === 'LAP').length;
    
    const ticketPrice = activeEvent?.pricePerTicket || 0;
    const totalDue = seats * ticketPrice;
    
    // Total collected from passengers (internal)
    const totalCollected = passengerPayments.reduce((acc, curr) => acc + (curr.appliedAmount ?? curr.amount), 0);
    
    // Total sent to organization (external)
    const totalSent = congregationTransfers.reduce((acc, curr) => acc + (curr.appliedAmount ?? curr.amount), 0);
    
    const remaining = Math.max(0, totalDue - totalSent);

    // Status 1: Pagamento das passagens pelos passageiros (Arrecadado vs Devido)
    let passengerStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
    const remainingCollected = Math.max(0, totalDue - totalCollected);
    if (totalCollected > 0) {
      passengerStatus = remainingCollected <= 0.01 ? 'PAID' : 'PARTIAL';
    }

    // Status 2: Pagamento do ônibus pela congregação (Enviado vs Devido)
    let congregationStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
    if (totalSent > 0) {
      congregationStatus = remaining <= 0.01 ? 'PAID' : 'PARTIAL';
    }

    return {
      passengerCount: congPassengers.length,
      seats,
      lap,
      totalDue,
      totalCollected,
      totalSent,
      remaining,
      passengerStatus,
      congregationStatus,
      passengers: congPassengers,
      payments: congPayments
    };
  };

  const dashboardData = useMemo(() => {
    return congregations.map(cong => {
      const stats = getCongregationStats(cong.id);
      return {
        ...cong,
        stats
      };
    });
  }, [congregations, passengers, payments, activeEvent]);

  const selectedCongData = useMemo(() => {
    if (!selectedCongId) return null;
    return dashboardData.find(c => c.id === selectedCongId);
  }, [selectedCongId, dashboardData]);

  const selectedCongReports = useMemo(() => {
    if (!selectedCongId) return [];
    return reports.filter(r => r.congregationId === selectedCongId && r.eventId === activeEvent?.id);
  }, [selectedCongId, reports, activeEvent]);

  const filteredPassengers = useMemo(() => {
    if (!selectedCongData) return [];
    let list = selectedCongData.stats.passengers;
    if (selectedDayFilter) {
      list = list.filter(p => p.selectedDays?.includes(selectedDayFilter));
    }
    return list;
  }, [selectedCongData, selectedDayFilter]);

  // --- AÇÕES ---

  const handleAddClick = () => {
    setFormData({
      name: '',
      coordinatorName: '',
      circuit: '',
      cityState: '',
      phone: ''
    });
    setShowAddModal(true);
  };

  const handleSaveNewCongregation = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCongregation({
      name: formData.name,
      coordinatorName: formData.coordinatorName,
      circuit: formData.circuit,
      cityState: formData.cityState,
      phone: formData.phone
    });
    setShowAddModal(false);
  };

  const handleEditClick = () => {
    if (!selectedCongData) return;
    setEditingCong(selectedCongData);
    setFormData({
      name: selectedCongData.name,
      coordinatorName: selectedCongData.coordinatorName || '',
      circuit: selectedCongData.circuit || '',
      cityState: selectedCongData.cityState || '',
      phone: selectedCongData.phone || ''
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCong) return;

    const updatedCong: Congregation = {
      ...editingCong,
      coordinatorName: formData.coordinatorName,
      circuit: formData.circuit,
      cityState: formData.cityState,
      phone: formData.phone,
      lastUpdated: new Date().toISOString()
    };

    onUpdateCongregation(updatedCong);
    setShowEditModal(false);
    setEditingCong(null);
  };

  const exportPassengerList = (dateStr?: string, dayName?: string) => {
    if (!selectedCongData) return;
    
    let list = selectedCongData.stats.passengers;
    if (dateStr) {
      list = list.filter(p => p.selectedDays?.includes(dateStr));
    }
    
    // Use startDate as the event date
    generatePassengerListPdf(selectedCongData, list, activeEvent?.startDate, dayName);
  };

  const exportConsolidatedList = () => {
    if (!selectedCongData || !activeEvent) return;
    generateConsolidatedPassengerListPdf(
      selectedCongData, 
      selectedCongData.stats.passengers, 
      activeEvent.startDate, 
      activeEvent.days || 1
    );
  };

  const handleDownloadSHPdf = (report: SHReport) => {
    generateSHPdf(report);
  };

  // --- RENDERIZADORES ---

  if (selectedCongId && selectedCongData) {
    // VISO DETALHADA DA CONGREGAÇÃO
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedCongId(null)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ⬅️
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{selectedCongData.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Painel de Detalhes da Congregação</p>
          </div>
        </div>

        {/* SEÇÃO 1: PERFIL */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Informações da Congregação</h3>
            {isAdmin && (
              <button 
                onClick={handleEditClick}
                className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Editar Perfil
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Encarregado do Arranjo</p>
              <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">{selectedCongData.coordinatorName || '--'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone</p>
              {selectedCongData.phone ? (
                <a 
                  href={`https://wa.me/${selectedCongData.phone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-medium text-indigo-600 dark:text-indigo-400 text-lg hover:underline flex items-center gap-1"
                >
                  <span>📱</span> {selectedCongData.phone}
                </a>
              ) : (
                <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">--</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Circuito</p>
              <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">{selectedCongData.circuit || '--'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cidade / Estado</p>
              <p className="font-medium text-slate-700 dark:text-slate-200 text-lg">{selectedCongData.cityState || '--'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código de Acesso</p>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-700 dark:text-slate-200 text-lg font-mono tracking-wider bg-slate-100 dark:bg-slate-800 px-2 rounded">
                  {selectedCongData.accessCode || '------'}
                </p>
                {isAdmin && (
                  <button
                    onClick={() => {
                        const code = Math.floor(100000 + Math.random() * 900000).toString();
                        onUpdateCongregation({
                            ...selectedCongData,
                            accessCode: code
                        });
                    }}
                    className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    title="Gerar novo código"
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2: RESUMO */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
           <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Passageiros</p>
              <p className="text-2xl font-black text-blue-800 dark:text-blue-300">{selectedCongData.stats.passengerCount}</p>
              <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">{selectedCongData.stats.lap} de colo</p>
           </div>
           <div className="p-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Total a Pagar</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200">R$ {selectedCongData.stats.totalDue.toFixed(2)}</p>
           </div>
           <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 rounded-xl">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Arrecadado</p>
              <p className="text-2xl font-black text-indigo-800 dark:text-indigo-300">R$ {selectedCongData.stats.totalCollected.toFixed(2)}</p>
              <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">Dos passageiros</p>
           </div>
           <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl relative">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Total Enviado</p>
              <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300">R$ {selectedCongData.stats.totalSent.toFixed(2)}</p>
              
              {isAdmin && (
                <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/20 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={!!selectedCongData.isPaidConfirmed} 
                    onChange={(e) => {
                      onUpdateCongregation({
                        ...selectedCongData,
                        isPaidConfirmed: e.target.checked
                      });
                    }}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase cursor-pointer" onClick={() => {
                      onUpdateCongregation({
                        ...selectedCongData,
                        isPaidConfirmed: !selectedCongData.isPaidConfirmed
                      });
                  }}>
                    Confirmar Quitação
                  </label>
                </div>
              )}
           </div>
           <div className={`p-5 border rounded-xl ${selectedCongData.stats.remaining <= 0.01 ? 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700' : 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20'}`}>
              <p className={`text-xs font-bold uppercase mb-1 ${selectedCongData.stats.remaining <= 0.01 ? 'text-slate-500' : 'text-red-600'}`}>Restante</p>
              <p className={`text-2xl font-black ${selectedCongData.stats.remaining <= 0.01 ? 'text-slate-400' : 'text-red-800 dark:text-red-300'}`}>
                R$ {selectedCongData.stats.remaining.toFixed(2)}
              </p>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SEÇÃO 3: FINANCEIRO (COMPROVANTES) */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Comprovantes de Pagamento</h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px] p-2">
              {selectedCongData.stats.payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Nenhum pagamento registrado.</div>
              ) : (
                <div className="space-y-2">
                  {selectedCongData.stats.payments.map(pay => (
                    <div key={pay.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">R$ {pay.amount.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400">{new Date(pay.date).toLocaleDateString()} • {pay.payerName}</p>
                        {pay.observation && <p className="text-[10px] text-slate-500 italic">"{pay.observation}"</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end max-w-[50%]">
                        {pay.imageUrls && pay.imageUrls.length > 0 ? (
                          pay.imageUrls.map((url, idx) => (
                            <a 
                              key={idx}
                              href={url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              Ver {idx + 1}
                            </a>
                          ))
                        ) : pay.imageUrl ? (
                          <a 
                            href={pay.imageUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Visualizar
                          </a>
                        ) : null}
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPaymentToDelete(pay.id);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 hover:text-red-600 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                            title="Excluir"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* SEÇÃO 4: QUALIDADE (SH) */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Relatórios de Qualidade (SH)</h3>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[300px] p-2">
              {selectedCongReports.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">Nenhum relatório enviado.</div>
              ) : (
                <div className="space-y-2">
                  {selectedCongReports.map(rep => (
                    <div key={rep.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-200">SH - {new Date(rep.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400">Motorista: {rep.answers.driverName}</p>
                      </div>
                      <button 
                        onClick={() => handleDownloadSHPdf(rep)}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:indigo-900/30 rounded-lg text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                      >
                        📄 PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* SEÇÃO 5: LISTA DE PASSAGEIROS */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Lista de Passageiros</h3>
              <div className="flex gap-2 flex-wrap">
                {eventDates.length > 0 ? (
                  <>
                    <button 
                      onClick={exportConsolidatedList}
                      className="text-xs font-bold uppercase bg-slate-800 text-white border border-slate-900 px-3 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <span>📑</span> Completa
                    </button>
                    {eventDates.map(d => (
                      <button
                        key={d.dateStr}
                        onClick={() => exportPassengerList(d.dateStr, d.dayName)}
                        className="text-xs font-bold uppercase bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-3 py-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors flex items-center gap-2"
                      >
                        <span>📥</span> {d.dayName}
                      </button>
                    ))}
                  </>
                ) : (
                  <button 
                    onClick={() => exportPassengerList()}
                    className="text-xs font-bold uppercase bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                  >
                    📥 Exportar Lista
                  </button>
                )}
              </div>
            </div>

            {/* FILTROS POR DIA */}
            {eventDates.length > 0 && (
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                <button
                  onClick={() => setSelectedDayFilter(null)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    selectedDayFilter === null 
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Todos
                </button>
                {eventDates.map(d => (
                  <button
                    key={d.dateStr}
                    onClick={() => setSelectedDayFilter(d.dateStr)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      selectedDayFilter === d.dateStr 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {d.dayName}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resp. Financeiro</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPassengers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs font-medium uppercase">
                      Nenhum passageiro encontrado para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredPassengers.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                        {p.name}
                        {p.accommodationType === 'LAP' && <span className="ml-2 text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold">Colo</span>}
                        {p.selectedDays && p.selectedDays.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {p.selectedDays.map(d => {
                              const day = eventDates.find(ed => ed.dateStr === d);
                              return day ? (
                                <span key={d} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 rounded uppercase">
                                  {day.dayName.slice(0, 3)}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400">{p.document}</td>
                      <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400">{p.payerName}</td>
                      <td className="px-6 py-3 text-right">
                         <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                           selectedCongData.stats.congregationStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 
                           (p.accommodationType === 'LAP' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')
                         }`}>
                           {p.accommodationType === 'LAP' ? 'Isento' : (selectedCongData.stats.congregationStatus === 'PAID' ? 'Pago' : 'Pendente')}
                         </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* MODAL EDITAR PERFIL */}
        {showEditModal && editingCong && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Editar Perfil</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{editingCong.name}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
              </div>
              
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Encarregado do Arranjo *</label>
                  <input
                    required
                    type="text"
                    value={formData.coordinatorName}
                    onChange={e => setFormData({ ...formData, coordinatorName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Circuito *</label>
                    <input
                      required
                      type="text"
                      value={formData.circuit}
                      onChange={e => setFormData({ ...formData, circuit: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade / Estado *</label>
                    <input
                      required
                      type="text"
                      value={formData.cityState}
                      onChange={e => setFormData({ ...formData, cityState: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-slate-500 font-bold uppercase hover:underline text-sm">Cancelar</button>
                  <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none text-sm uppercase tracking-wide hover:bg-indigo-700 transition-all">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISAO GERAL (LISTA)
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Dashboard de Congregações</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Visão consolidada financeira e operacional.</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleAddClick}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100 dark:shadow-none text-sm"
          >
            + Nova Congregação
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
               <tr>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Congregação</th>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Assentos</th>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total Devido</th>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Arrecadado</th>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Enviado</th>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status Pass.</th>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status Cong.</th>
                 <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Ação</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {dashboardData.map(cong => (
                 <tr key={cong.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" onClick={() => setSelectedCongId(cong.id)}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{cong.name}</p>
                      <p className="text-[10px] text-slate-400">{cong.cityState || 'Sem local'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs">{cong.stats.seats}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400 text-sm">
                      R$ {cong.stats.totalDue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-indigo-600 dark:text-indigo-400 text-sm">
                      R$ {cong.stats.totalCollected.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400 text-sm">
                      R$ {cong.stats.totalSent.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {cong.stats.passengerStatus === 'PAID' && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30">Pago</span>}
                        {cong.stats.passengerStatus === 'PARTIAL' && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30">Parcial</span>}
                        {cong.stats.passengerStatus === 'PENDING' && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">Pendente</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {cong.stats.congregationStatus === 'PAID' && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30">Pago</span>}
                        {cong.stats.congregationStatus === 'PARTIAL' && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30">Parcial</span>}
                        {cong.stats.congregationStatus === 'PENDING' && <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30">Pendente</span>}
                        
                        {cong.isPaidConfirmed && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/10 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">
                            <span>✅</span> Confirmado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs group-hover:underline">Detalhes &rarr;</span>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ADICIONAR CONGREGAÇÃO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nova Congregação</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Adicionar uma nova congregação ao sistema</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSaveNewCongregation} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Congregação *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Encarregado do Arranjo *</label>
                <input
                  required
                  type="text"
                  value={formData.coordinatorName}
                  onChange={e => setFormData({ ...formData, coordinatorName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Circuito *</label>
                  <input
                    required
                    type="text"
                    value={formData.circuit}
                    onChange={e => setFormData({ ...formData, circuit: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade / Estado *</label>
                  <input
                    required
                    type="text"
                    value={formData.cityState}
                    onChange={e => setFormData({ ...formData, cityState: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-500 font-bold uppercase hover:underline text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none text-sm uppercase tracking-wide hover:bg-indigo-700 transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="Excluir Lançamento"
        message="Deseja realmente excluir este lançamento financeiro? Esta ação é permanente e os totais serão recalculados imediatamente."
        onConfirm={() => {
          if (paymentToDelete) {
            onDeletePayment(paymentToDelete);
            setPaymentToDelete(null);
          }
        }}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
};

export default CongregationManagement;
