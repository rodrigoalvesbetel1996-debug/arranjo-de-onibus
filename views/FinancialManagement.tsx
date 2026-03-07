
import React, { useState, useMemo } from 'react';
import { User, Passenger, JWEvent, PaymentReceipt, ExcessTreatment } from '../types';
import ConfirmModal from '../components/ConfirmModal';

interface FinancialManagementProps {
  user: User;
  passengers: Passenger[];
  events: JWEvent[];
  payments: PaymentReceipt[];
  onAddPayment: (payment: Partial<PaymentReceipt>) => void;
  onDeletePayment: (id: string) => void;
}

const FinancialManagement: React.FC<FinancialManagementProps> = ({ user, passengers, events, payments, onAddPayment, onDeletePayment }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentObs, setPaymentObs] = useState('');
  const [justification, setJustification] = useState('');
  const [excessTreatment, setExcessTreatment] = useState<ExcessTreatment | ''>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [excessFile, setExcessFile] = useState<File | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  // New state for Congregation Payments
  const [showCongregationModal, setShowCongregationModal] = useState(false);
  const [congregationAmount, setCongregationAmount] = useState('');
  const [congregationFiles, setCongregationFiles] = useState<FileList | null>(null);
  const [congregationObs, setCongregationObs] = useState('');

  const activeEvent = events.find(e => e.isActive);
  const ticketPrice = activeEvent?.pricePerTicket || 0;

  const congregationPayments = useMemo(() => 
    payments.filter(p => p.congregationId === user.congregationId && p.eventId === activeEvent?.id && p.payerName === 'CONGREGAÇÃO'),
  [payments, user.congregationId, activeEvent]);

  const handleCongregationPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !congregationAmount) return;

    const files = congregationFiles ? Array.from(congregationFiles) : [];
    const urls = files.map(f => URL.createObjectURL(f));

    onAddPayment({
      congregationId: user.congregationId,
      eventId: activeEvent.id,
      payerName: 'CONGREGAÇÃO',
      amount: parseFloat(congregationAmount),
      appliedAmount: parseFloat(congregationAmount),
      excessAmount: 0,
      date: new Date().toISOString(),
      status: 'PENDING',
      observation: congregationObs,
      imageUrls: urls,
      imageUrl: urls[0] // Fallback
    });

    setShowCongregationModal(false);
    setCongregationAmount('');
    setCongregationFiles(null);
    setCongregationObs('');
  };

  const myPassengers = useMemo(() => 
    passengers.filter(p => p.congregationId === user.congregationId && p.eventId === activeEvent?.id),
  [passengers, user.congregationId, activeEvent]);

  const myPayments = useMemo(() => 
    payments.filter(p => p.congregationId === user.congregationId && p.eventId === activeEvent?.id),
  [payments, user.congregationId, activeEvent]);

  const payerSummaries = useMemo(() => {
    const summaries: Record<string, { totalDue: number, totalPaid: number, appliedTotal: number, tickets: number, receipts: PaymentReceipt[] }> = {};

    myPassengers.forEach(p => {
      if (!summaries[p.payerName]) {
        summaries[p.payerName] = { totalDue: 0, totalPaid: 0, appliedTotal: 0, tickets: 0, receipts: [] };
      }
      if (p.accommodationType !== 'LAP') {
        summaries[p.payerName].totalDue += ticketPrice;
        summaries[p.payerName].tickets += 1;
      }
    });

    myPayments.forEach(pay => {
      if (summaries[pay.payerName]) {
        summaries[pay.payerName].totalPaid += pay.amount;
        summaries[pay.payerName].appliedTotal += pay.appliedAmount !== undefined ? pay.appliedAmount : 0;
        summaries[pay.payerName].receipts.push(pay);
      }
    });

    return summaries;
  }, [myPassengers, myPayments, ticketPrice]);

  const debtIgnoringCurrent = useMemo(() => {
    if (!selectedPayer) return 0;
    const summary = payerSummaries[selectedPayer];
    if (!summary) return 0;
    
    if (editingPaymentId) {
      const currentPay = summary.receipts.find(r => r.id === editingPaymentId);
      const appliedByOthers = summary.appliedTotal - (currentPay?.appliedAmount || 0);
      return Math.max(0, summary.totalDue - appliedByOthers);
    }
    
    return Math.max(0, summary.totalDue - summary.appliedTotal);
  }, [selectedPayer, payerSummaries, editingPaymentId]);

  const currentAmount = parseFloat(paymentAmount) || 0;
  const isOverpaid = currentAmount > (debtIgnoringCurrent + 0.01);

  const openPaymentModal = (payerName: string, paymentToEdit?: PaymentReceipt) => {
    setSelectedPayer(payerName);
    if (paymentToEdit) {
      setEditingPaymentId(paymentToEdit.id);
      setPaymentAmount(paymentToEdit.amount.toString());
      setPaymentObs(paymentToEdit.observation || '');
      setJustification(paymentToEdit.justification || '');
      setExcessTreatment(paymentToEdit.excessTreatment || '');
    } else {
      setEditingPaymentId(null);
      setPaymentAmount('');
      setPaymentObs('');
      setJustification('');
      setExcessTreatment('');
    }
    setReceiptFile(null);
    setExcessFile(null);
    setShowModal(true);
  };

  /**
   * Dispara a remoção do registro, fecha o modal e limpa o estado de edição.
   */
  const handleConfirmDelete = (id: string) => {
    setPaymentToDelete(id);
  };

  const executeDelete = () => {
    if (paymentToDelete) {
      onDeletePayment(paymentToDelete);
      setShowModal(false);
      setEditingPaymentId(null);
      setPaymentToDelete(null);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !paymentAmount) {
      alert('Preencha o valor do pagamento.');
      return;
    }

    const totalAmount = parseFloat(paymentAmount);
    const applied = Math.min(totalAmount, debtIgnoringCurrent);
    const excess = Math.max(0, totalAmount - applied);

    if (excess > 0.01) {
      if (!justification.trim()) {
        alert('Justificativa obrigatória para aceitação do valor excedente.');
        return;
      }
      if (!excessTreatment) {
        alert('Selecione se o valor adicional será Donativo ou Troco.');
        return;
      }
    }

    // Identificação pelo ID para garantir UPDATE em vez de CREATE
    onAddPayment({
      id: editingPaymentId || undefined,
      congregationId: user.congregationId,
      eventId: activeEvent.id,
      payerName: selectedPayer,
      amount: totalAmount,
      appliedAmount: applied,
      excessAmount: excess,
      excessTreatment: excess > 0 ? (excessTreatment as ExcessTreatment) : undefined,
      justification: excess > 0 ? justification : undefined,
      excessDocUrl: excessFile ? URL.createObjectURL(excessFile) : (editingPaymentId ? myPayments.find(p => p.id === editingPaymentId)?.excessDocUrl : undefined),
      observation: paymentObs,
      date: editingPaymentId ? (myPayments.find(p => p.id === editingPaymentId)?.date || new Date().toISOString()) : new Date().toISOString(),
      status: 'PENDING',
      imageUrl: receiptFile ? URL.createObjectURL(receiptFile) : (editingPaymentId ? myPayments.find(p => p.id === editingPaymentId)?.imageUrl : undefined)
    });

    setShowModal(false);
    setEditingPaymentId(null);
  };

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Controle Financeiro</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Gestão de pagamentos e tratamento de excedentes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlobalFinanceCard 
          title="Total Devido (Assentos)" 
          value={Object.values(payerSummaries).reduce((acc, s) => acc + s.totalDue, 0)} 
          subText="Calculado por poltronas" 
          color="slate" 
        />
        <GlobalFinanceCard 
          title="Total Arrecadado (Aplicado)" 
          value={Object.values(payerSummaries).reduce((acc, s) => acc + s.appliedTotal, 0)} 
          subText="Montante que quita dívidas" 
          color="emerald" 
        />
        <GlobalFinanceCard 
          title="Total Enviado" 
          value={congregationPayments.reduce((acc, p) => acc + p.amount, 0)} 
          subText="Repassado à Organização" 
          color="blue" 
        />
        <GlobalFinanceCard 
          title="Total a Receber" 
          value={Object.values(payerSummaries).reduce((acc, s) => acc + Math.max(0, s.totalDue - s.appliedTotal), 0)} 
          subText="Pendência global" 
          color="red" 
        />
      </div>

      {/* SECTION: CONGREGATION PAYMENTS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Comprovantes de Remessa</h3>
            <p className="text-xs text-slate-500">Envie aqui os comprovantes de depósito/transferência do valor total para a Organização.</p>
          </div>
          <button 
            onClick={() => setShowCongregationModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>📤</span> Enviar Comprovante
          </button>
        </div>

        {congregationPayments.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-500">Nenhum comprovante enviado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {congregationPayments.map(p => (
              <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 relative group/card transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">R$ {p.amount.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button 
                    onClick={() => handleConfirmDelete(p.id)}
                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
                {p.observation && <p className="text-xs text-slate-500 italic mb-2">"{p.observation}"</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.imageUrls && p.imageUrls.length > 0 ? (
                    p.imageUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/30 hover:underline flex items-center gap-1">
                        📎 Comprovante {idx + 1}
                      </a>
                    ))
                  ) : p.imageUrl ? (
                     <a href={p.imageUrl} target="_blank" rel="noreferrer" className="text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/30 hover:underline flex items-center gap-1">
                        📎 Comprovante
                      </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Assentos</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Histórico de Pagamentos</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {Object.keys(payerSummaries).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                    Sem passageiros vinculados para cobrança nesta janela.
                  </td>
                </tr>
              ) : (
                Object.entries(payerSummaries).map(([name, summary]) => {
                  const balance = summary.totalDue - summary.appliedTotal;
                  const isQuitado = balance <= 0.01;
                  return (
                    <tr key={name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-6 align-top min-w-[250px]">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-2">{name}</p>
                        <button
                          onClick={() => openPaymentModal(name)}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wide"
                        >
                          + Novo Pagamento
                        </button>
                      </td>
                      <td className="px-6 py-6 text-center align-top">
                        <span className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-8 h-8 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700">
                          {summary.tickets}
                        </span>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="space-y-3">
                          {summary.receipts.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Nenhum pagamento registrado</span>
                          ) : (
                            summary.receipts.map(r => (
                              <div key={r.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 relative group/card transition-all hover:shadow-md">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-0.5">
                                    <div className="flex items-baseline gap-2">
                                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">R$ {r.amount.toFixed(2)}</p>
                                      <span className="text-[10px] text-slate-400">{new Date(r.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    {r.observation && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{r.observation}"</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => openPaymentModal(name, r)}
                                      className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                                      title="Editar"
                                    >
                                      ✏️
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleConfirmDelete(r.id);
                                      }}
                                      className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-500 hover:text-red-600 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                                      title="Excluir"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                                
                                {r.imageUrl && (
                                  <a href={r.imageUrl} target="_blank" rel="noreferrer" className="mt-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 hover:underline flex items-center gap-1">
                                    📎 Ver Comprovante
                                  </a>
                                )}

                                {r.excessAmount > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                                        Sobra: R$ {r.excessAmount.toFixed(2)}
                                      </span>
                                      <span className="text-[9px] font-semibold text-slate-400">
                                        {r.excessTreatment === 'DONATION' ? 'DONATIVO' : 'TROCO'}
                                      </span>
                                    </div>
                                    {r.justification && <p className="text-[9px] text-slate-400 italic line-clamp-1">{r.justification}</p>}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right align-top min-w-[200px]">
                        <div className="flex flex-col items-end gap-1">
                           <div className="flex flex-col text-right">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Devido</span>
                              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">R$ {summary.totalDue.toFixed(2)}</span>
                           </div>
                           <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                           <div className="flex flex-col text-right">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-500 uppercase tracking-wider font-semibold">Pago</span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">R$ {summary.appliedTotal.toFixed(2)}</span>
                           </div>
                           
                           <div className="mt-3">
                            {isQuitado ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                  QUITADO ✅
                                </span>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-red-500 uppercase tracking-wider font-bold mb-0.5">Pendente</span>
                                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                                  R$ {balance.toFixed(2)}
                                </span>
                              </div>
                            )}
                           </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingPaymentId ? 'Editar Pagamento' : 'Novo Pagamento'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Responsável</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white mb-2">{selectedPayer}</p>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">Dívida Atual:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">R$ {debtIgnoringCurrent.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor do Recebimento (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  autoFocus
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-2xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                  placeholder="0,00"
                />
              </div>

              {isOverpaid && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Excedente Detectado</p>
                      <p className="text-sm font-semibold">Sobra: R$ {(currentAmount - debtIgnoringCurrent).toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-amber-600/80 uppercase tracking-wider">Destino da sobra *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button" 
                        onClick={() => setExcessTreatment('DONATION')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${excessTreatment === 'DONATION' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/30 text-amber-600 hover:bg-amber-50'}`}
                      >
                        💝 Donativo
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setExcessTreatment('CHANGE')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${excessTreatment === 'CHANGE' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/30 text-amber-600 hover:bg-amber-50'}`}
                      >
                        🔄 Troco
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-600/80 uppercase tracking-wider">Justificativa *</label>
                    <textarea
                      required
                      value={justification}
                      onChange={e => setJustification(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/30 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-amber-500 outline-none resize-none h-20"
                      placeholder="Descreva o motivo..."
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Comprovante</label>
                  <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group bg-slate-50 dark:bg-slate-800/30">
                    <span className="text-xl block mb-1">📎</span>
                    <p className="text-xs font-medium text-slate-500 group-hover:text-indigo-500 transition-colors">{receiptFile ? receiptFile.name : 'Clique para anexar arquivo'}</p>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={e => e.target.files && setReceiptFile(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observação</label>
                  <textarea
                    value={paymentObs}
                    onChange={e => setPaymentObs(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-20 resize-none placeholder:text-slate-400"
                    placeholder="Opcional..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wide shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all transform active:scale-[0.98]"
                >
                  {editingPaymentId ? 'Salvar Alterações' : 'Confirmar Pagamento'}
                </button>

                {editingPaymentId && (
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(editingPaymentId)}
                    className="w-full bg-white dark:bg-slate-800 text-red-600 border border-red-100 dark:border-red-900/30 py-3 rounded-xl font-bold text-sm uppercase tracking-wide hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
                  >
                    Excluir Lançamento
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {showCongregationModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Enviar Comprovante</h3>
              <button onClick={() => setShowCongregationModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
            </div>
            <form onSubmit={handleCongregationPaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total (R$)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={congregationAmount}
                  onChange={e => setCongregationAmount(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arquivos</label>
                <div className="relative border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group bg-slate-50 dark:bg-slate-800/30 mt-1">
                  <span className="text-xl block mb-1">📎</span>
                  <p className="text-xs font-medium text-slate-500 group-hover:text-indigo-500 transition-colors">
                    {congregationFiles && congregationFiles.length > 0 
                      ? `${congregationFiles.length} arquivo(s) selecionado(s)` 
                      : 'Clique para selecionar arquivos'}
                  </p>
                  <input 
                    type="file" 
                    multiple
                    accept=".pdf,image/*"
                    onChange={e => setCongregationFiles(e.target.files)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Pode selecionar múltiplos arquivos (PDF ou Imagem).</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observação</label>
                <textarea
                  value={congregationObs}
                  onChange={e => setCongregationObs(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm outline-none h-20 resize-none text-slate-700 dark:text-slate-200 mt-1"
                  placeholder="Opcional..."
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 dark:shadow-none">
                Enviar Comprovante
              </button>
            </form>
          </div>
        </div>
      )}
      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="Excluir Lançamento"
        message="Deseja realmente excluir este lançamento financeiro? Esta ação é permanente e os totais serão recalculados imediatamente."
        onConfirm={executeDelete}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
};

const GlobalFinanceCard = ({ title, value, subText, color }: { title: string, value: number, subText: string, color: string }) => {
  const colorMap: any = {
    slate: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    red: 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-700 dark:text-red-400',
  };
  
  return (
    <div className={`p-6 rounded-2xl shadow-sm border ${colorMap[color]}`}>
      <p className="text-xs font-bold opacity-60 uppercase tracking-wider mb-2">{title}</p>
      <p className="text-3xl font-bold mb-1 tracking-tight">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      <p className="text-[10px] font-medium opacity-50 uppercase tracking-wide">{subText}</p>
    </div>
  );
};

export default FinancialManagement;
