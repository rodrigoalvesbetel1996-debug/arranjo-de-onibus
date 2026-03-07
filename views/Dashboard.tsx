
import React, { useMemo, useState } from 'react';
import { User, UserRole, JWEvent, Passenger, PaymentReceipt, Congregation, Expense } from '@/types';

interface DashboardProps {
  user: User;
  events: JWEvent[];
  passengers: Passenger[];
  payments: PaymentReceipt[];
  congregations: Congregation[];
  expenses: Expense[];
  onSaveExpense: (expense: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, events, passengers, payments, congregations, expenses, onSaveExpense, onDeleteExpense }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const activeEvent = events.find(e => e.isActive);
  const [showPendingDocsModal, setShowPendingDocsModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpenseListModal, setShowExpenseListModal] = useState(false);
  const [showPassengersModal, setShowPassengersModal] = useState(false);
  const [showSeatsModal, setShowSeatsModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '' });

  const eventDays = useMemo(() => {
    if (!activeEvent) return [];
    const days = [];
    const start = new Date(activeEvent.startDate + 'T12:00:00');
    for (let i = 0; i < activeEvent.days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push({
        dateStr: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        fullDate: date.toLocaleDateString('pt-BR')
      });
    }
    return days;
  }, [activeEvent]);

  const stats = useMemo(() => {
    const filteredPass = isAdmin ? passengers : passengers.filter(p => p.congregationId === user.congregationId);
    const filteredPay = isAdmin ? payments : payments.filter(p => p.congregationId === user.congregationId);
    const filteredExpenses = isAdmin ? expenses.filter(e => e.eventId === activeEvent?.id) : [];

    const totalTickets = filteredPass.filter(p => p.accommodationType !== 'LAP').length;
    const totalDue = totalTickets * (activeEvent?.pricePerTicket || 0);
    
    // Calcula o arrecadado considerando apenas o valor aplicado (sem excedentes)
    const totalArrecadado = filteredPay.reduce((acc, curr) => acc + (curr.appliedAmount !== undefined ? curr.appliedAmount : curr.amount), 0);
    
    // Split collected amount
    const totalCollectedPassengers = filteredPay
      .filter(p => p.payerName !== 'CONGREGAÇÃO')
      .reduce((acc, curr) => acc + (curr.appliedAmount !== undefined ? curr.appliedAmount : curr.amount), 0);

    const totalCollectedCongregations = filteredPay
      .filter(p => p.payerName === 'CONGREGAÇÃO')
      .reduce((acc, curr) => acc + (curr.appliedAmount !== undefined ? curr.appliedAmount : curr.amount), 0);

    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Nova Regra: Qualquer menor de 16 anos sem termo é pendência
    const pendingDocs = filteredPass.filter(p => p.age < 16 && !p.termOfResponsibilityUrl).length;

    const dailyStats = eventDays.map(day => {
      const dayPassengers = filteredPass.filter(p => p.selectedDays?.includes(day.dateStr));
      const daySeats = dayPassengers.filter(p => p.accommodationType !== 'LAP');
      return {
        ...day,
        passengers: dayPassengers.length,
        seats: daySeats.length
      };
    });

    return { totalTickets, totalDue, totalArrecadado, totalCollectedPassengers, totalCollectedCongregations, totalExpenses, pendingDocs, passengerCount: filteredPass.length, filteredExpenses, dailyStats };
  }, [isAdmin, user.congregationId, passengers, payments, activeEvent, expenses, eventDays]);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    
    onSaveExpense({
      eventId: activeEvent.id,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount.replace(',', '.')),
      date: new Date().toISOString()
    });
    setExpenseForm({ description: '', amount: '' });
    setShowExpenseModal(false);
  };

  const pendingByCongregation = useMemo(() => {
    if (!isAdmin) return [];
    
    const pendingPassengers = passengers.filter(p => p.age < 16 && !p.termOfResponsibilityUrl);
    
    const counts: Record<string, number> = {};
    pendingPassengers.forEach(p => {
      counts[p.congregationId] = (counts[p.congregationId] || 0) + 1;
    });
  
    return Object.entries(counts).map(([congId, count]) => {
      const cong = congregations.find(c => c.id === congId);
      return {
        name: cong ? cong.name : 'Desconhecida',
        count
      };
    }).sort((a, b) => b.count - a.count);
  }, [isAdmin, passengers, congregations]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Painel Geral</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {activeEvent ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Evento Ativo: {activeEvent.name}
              </span>
            ) : 'Nenhum evento ativo.'}
          </p>
        </div>
      </header>

      {activeEvent && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center gap-2">
            <span>📅</span> Informações do Evento
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Coluna da Esquerda: Métricas e Datas (1/3) */}
            <div className="lg:col-span-4 space-y-8">
              {/* Datas Importantes */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Datas Importantes</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Data do Evento</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {new Date(activeEvent.startDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {activeEvent.registrationDeadline && (
                    <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Limite Inscrição</span>
                      <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
                        {new Date(activeEvent.registrationDeadline + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {activeEvent.paymentDeadline && (
                    <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Limite Pagamento</span>
                      <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                        {new Date(activeEvent.paymentDeadline + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Rápido */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Rápido</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    onClick={() => setShowPassengersModal(true)}
                    className="p-3 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <span className="text-xl mb-1">👥</span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Passageiros</span>
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 leading-none mt-1">{stats.passengerCount}</span>
                  </div>
                  
                  <div 
                    onClick={() => setShowSeatsModal(true)}
                    className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <span className="text-xl mb-1">💺</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Assentos</span>
                    <span className="text-lg font-black text-blue-700 dark:text-blue-300 leading-none mt-1">{stats.totalTickets}</span>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex flex-col items-center justify-center text-center">
                    <span className="text-xl mb-1">⚠️</span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendências</span>
                    <span className="text-lg font-black text-amber-700 dark:text-amber-300 leading-none mt-1">{stats.pendingDocs}</span>
                  </div>
                </div>
              </div>

              {/* Valor da Passagem */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Financeiro</h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor da Passagem</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100 block leading-none">
                      R$ {activeEvent.pricePerTicket.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Por assento</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna da Direita: Avisos e Arquivos (2/3) */}
            <div className="lg:col-span-8">
              <div className="h-full bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Avisos e Arquivos</h4>
                
                <div className="flex-1 space-y-6">
                  <div className="prose dark:prose-invert max-w-none">
                    {activeEvent.info ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{activeEvent.info}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nenhum aviso no momento.</p>
                    )}
                  </div>

                  {activeEvent.fileUrl && activeEvent.fileName && (
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-auto">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Downloads Disponíveis</h5>
                      <a 
                        href={activeEvent.fileUrl} 
                        download={activeEvent.fileName}
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                            📄
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{activeEvent.fileName}</p>
                            <p className="text-xs text-slate-500 group-hover:text-indigo-500 transition-colors">Clique para baixar o arquivo</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          Baixar
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
            <span>Resumo Financeiro</span>
            {isAdmin && (
              <button 
                onClick={() => setShowExpenseModal(true)}
                className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold uppercase transition-colors"
              >
                + Despesa
              </button>
            )}
          </h3>
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Total Congregação Devedor</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">R$ {stats.totalDue.toFixed(2)}</span>
            </div>
            {isAdmin && stats.totalExpenses > 0 && (
              <div className="flex justify-between items-center cursor-pointer hover:opacity-80" onClick={() => setShowExpenseListModal(true)}>
                <span className="text-slate-500 dark:text-slate-400 font-medium text-sm flex items-center gap-1">
                  Total Despesas Extras <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-slate-500">ℹ️</span>
                </span>
                <span className="font-bold text-red-500 dark:text-red-400 text-lg">R$ {stats.totalExpenses.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Total Arrecadado (Passageiros)</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">R$ {stats.totalCollectedPassengers.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Total Arrecadado (Congregações)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">R$ {stats.totalCollectedCongregations.toFixed(2)}</span>
            </div>
            <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-800 dark:text-slate-300 font-bold text-sm">Saldo Pendente</span>
              <span className={`text-2xl font-bold ${(stats.totalDue + stats.totalExpenses) - stats.totalCollectedCongregations > 0.01 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                R$ {Math.max(0, (stats.totalDue + stats.totalExpenses) - stats.totalCollectedCongregations).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-4">Status de Operação</h3>
          <div className="space-y-4">
            {stats.pendingDocs > 0 && (
              <div 
                onClick={() => isAdmin && setShowPendingDocsModal(true)}
                className={`flex items-start space-x-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl ${isAdmin ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors' : ''}`}
              >
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-400 text-sm">Termos de Responsabilidade</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1">Existem {stats.pendingDocs} menores sem documentação enviada.</p>
                  {isAdmin && <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase mt-2">Clique para ver detalhes</p>}
                </div>
              </div>
            )}
            {stats.totalDue > stats.totalArrecadado && (
              <div className="flex items-start space-x-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl">
                <span className="text-xl">💳</span>
                <div>
                  <p className="font-bold text-red-800 dark:text-red-400 text-sm">Pendência Financeira</p>
                  <p className="text-xs text-red-700 dark:text-red-300/80 mt-1">O valor arrecadado não cobre o número de assentos reservados.</p>
                </div>
              </div>
            )}
            {stats.pendingDocs === 0 && stats.totalDue <= stats.totalArrecadado && stats.passengerCount > 0 && (
              <div className="flex items-start space-x-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">Pronto para Viagem</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-1">Todos os passageiros e pagamentos aplicados estão em conformidade.</p>
                </div>
              </div>
            )}
            {stats.passengerCount === 0 && (
              <div className="flex items-start space-x-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Aguardando Dados</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comece cadastrando os passageiros na aba lateral.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPassengersModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Passageiros por Dia</h3>
              <button onClick={() => setShowPassengersModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
            </div>
            <div className="space-y-3">
              {stats.dailyStats.map((day, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 capitalize">{day.label}</p>
                    <p className="text-xs text-slate-400">{day.fullDate}</p>
                  </div>
                  <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-lg font-bold px-3 py-1 rounded-lg">
                    {day.passengers}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowPassengersModal(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-bold text-sm uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSeatsModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Assentos por Dia</h3>
              <button onClick={() => setShowSeatsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
            </div>
            <div className="space-y-3">
              {stats.dailyStats.map((day, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 capitalize">{day.label}</p>
                    <p className="text-xs text-slate-400">{day.fullDate}</p>
                  </div>
                  <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-lg font-bold px-3 py-1 rounded-lg">
                    {day.seats}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowSeatsModal(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-bold text-sm uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPendingDocsModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Pendências de Termos</h3>
              <button onClick={() => setShowPendingDocsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {pendingByCongregation.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhuma pendência encontrada.</p>
              ) : (
                pendingByCongregation.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{item.name}</span>
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 py-1 rounded-lg">
                      {item.count} pendentes
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowPendingDocsModal(false)}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl font-bold text-sm uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Registrar Despesa Extra</h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  placeholder="Ex: Pedágio, Lanche motorista..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  placeholder="0,00"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-sm uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm uppercase hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExpenseListModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Despesas Extras</h3>
              <button onClick={() => setShowExpenseListModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">✕</button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {stats.filteredExpenses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhuma despesa registrada.</p>
              ) : (
                stats.filteredExpenses.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">{exp.description}</p>
                      <p className="text-xs text-slate-400">{new Date(exp.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-500 dark:text-red-400 text-sm">R$ {exp.amount.toFixed(2)}</span>
                      <button 
                        onClick={() => onDeleteExpense(exp.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total</span>
              <span className="text-xl font-black text-red-500 dark:text-red-400">R$ {stats.totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, color, onClick, className }: { title: string, value: string | number, icon: string, color: string, onClick?: () => void, className?: string }) => {
  const colorMap: any = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
  };
  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-xl shadow-sm border ${colorMap[color]} flex items-center gap-4 transition-all hover:translate-y-[-2px] ${className || ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-white dark:bg-slate-800 shadow-sm shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-0.5">{title}</p>
        <p className="text-xl font-black leading-none">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
