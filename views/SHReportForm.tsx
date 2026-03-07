
import React, { useState, useMemo } from 'react';
import { User, UserRole, JWEvent, SHReport } from '../types';
import { generateSHPdf } from '../utils/pdfGenerator';
import ConfirmModal from '../components/ConfirmModal';

interface SHReportFormProps {
  user: User;
  events: JWEvent[];
  reports: SHReport[];
  onSaveReport: (report: Partial<SHReport>) => void;
  onDeleteReport?: (id: string) => void;
}

const SHReportForm: React.FC<SHReportFormProps> = ({ user, events, reports, onSaveReport, onDeleteReport }) => {
  const activeEvent = events.find(e => e.isActive);
  const isAdmin = user.role === UserRole.ADMIN;
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const initialAnswers = {
    congregation: '',
    congAddress: '',
    congCity: '',
    date: new Date().toLocaleDateString('pt-BR'),
    coordinatorName: '',
    coordinatorAddress: '',
    coordinatorCity: '',
    eventName: activeEvent?.name || '',
    company: '',
    busNumber: '',
    licensePlate: '',
    captainName: '',
    captainPhone: '',
    driverName: '',
    driverAppearance: 'Boa',
    driverEducation: 'Boa',
    tireCondition: 'Boa',
    extinguisher: 'Sim',
    timeProblems: 'Não',
    cleanliness: 'Boa',
    boardingProblems: 'Não',
    shoulderDriving: 'Não',
    speedStatus: 'Dentro do permitido',
    additionalInfo: ''
  };

  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);

  const myReports = useMemo(() => {
    if (isAdmin) return reports;
    return reports.filter(r => r.congregationId === user.congregationId);
  }, [reports, user.congregationId, isAdmin]);

  const openNewForm = () => {
    if (!activeEvent) {
      alert('Nenhum evento ativo selecionado.');
      return;
    }
    setSelectedReportId(null);
    setAnswers({ 
      ...initialAnswers, 
      congregation: user.name.replace('Responsável - ', ''),
      eventName: activeEvent.name 
    });
    setIsFormOpen(true);
  };

  const openEditForm = (report: SHReport) => {
    setSelectedReportId(report.id);
    setAnswers({ ...initialAnswers, ...report.answers });
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const originalReport = reports.find(r => r.id === selectedReportId);
    onSaveReport({
      id: selectedReportId || undefined,
      congregationId: originalReport ? originalReport.congregationId : user.congregationId,
      eventId: activeEvent?.id,
      date: new Date().toISOString(),
      answers
    });
    setIsFormOpen(false);
  };

  const handleDownloadPDF = (report: SHReport) => {
    generateSHPdf(report);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Relatórios SH</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Controle de Qualidade do Transporte.</p>
        </div>
        {!isAdmin && (
          <button
            onClick={openNewForm}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-black shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            + Novo Relatório
          </button>
        )}
      </header>

      {isFormOpen ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-10 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">SH - Relatório de Controle de Qualidade</h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
          </div>

          <form onSubmit={handleSave} className="space-y-12">
            <section className="space-y-6">
              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] border-l-4 border-indigo-600 pl-3">1. Cabeçalho e Identificação</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Congregação</label>
                  <input required value={answers.congregation} onChange={e => setAnswers({...answers, congregation: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Relatório</label>
                  <input required value={answers.date} onChange={e => setAnswers({...answers, date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço de Correspondência</label>
                  <input value={answers.congAddress} onChange={e => setAnswers({...answers, congAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade/Estado</label>
                  <input value={answers.congCity} onChange={e => setAnswers({...answers, congCity: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] border-l-4 border-slate-400 pl-3">2. Destinatário (Coordenador do Circuito)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                  <input value={answers.coordinatorName} onChange={e => setAnswers({...answers, coordinatorName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço</label>
                  <input value={answers.coordinatorAddress} onChange={e => setAnswers({...answers, coordinatorAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade/Estado</label>
                  <input value={answers.coordinatorCity} onChange={e => setAnswers({...answers, coordinatorCity: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] border-l-4 border-emerald-600 pl-3">3. Dados da Viagem</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento</label>
                  <input value={answers.eventName} readOnly className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 opacity-70" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Empresa de Ônibus</label>
                  <input value={answers.company} onChange={e => setAnswers({...answers, company: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº do Ônibus</label>
                  <input value={answers.busNumber} onChange={e => setAnswers({...answers, busNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Placas</label>
                  <input value={answers.licensePlate} onChange={e => setAnswers({...answers, licensePlate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Capitão</label>
                  <input value={answers.captainName} onChange={e => setAnswers({...answers, captainName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fone do Capitão</label>
                  <input value={answers.captainPhone} onChange={e => setAnswers({...answers, captainPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Motorista</label>
                  <input value={answers.driverName} onChange={e => setAnswers({...answers, driverName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3" />
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] border-l-4 border-amber-600 pl-3">4. Detalhes da Avaliação</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {[
                  { label: 'Aparência do motorista', key: 'driverAppearance', options: ['Excelente', 'Boa', 'Regular', 'Má'] },
                  { label: 'Educação', key: 'driverEducation', options: ['Excelente', 'Boa', 'Regular', 'Má'] },
                  { label: 'Condição dos pneus', key: 'tireCondition', options: ['Excelente', 'Boa', 'Regular', 'Péssima'] },
                  { label: 'Limpeza do carro', key: 'cleanliness', options: ['Excelente', 'Boa', 'Regular', 'Péssima'] },
                ].map(item => (
                  <div key={item.key} className="space-y-3">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.options.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({...answers, [item.key]: opt})}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 transition-all ${answers[item.key] === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {[
                  { label: 'Havia extintor de incêndio disponível?', key: 'extinguisher' },
                  { label: 'Houve problemas quanto ao horário?', key: 'timeProblems' },
                  { label: 'Nos pontos de embarque houve problemas?', key: 'boardingProblems' },
                  { label: 'Trafegou pelo acostamento?', key: 'shoulderDriving' },
                ].map(item => (
                  <div key={item.key} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 pr-4">{item.label}</p>
                    <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-inner border border-slate-100 dark:border-slate-800">
                      {['Sim', 'Não'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({...answers, [item.key]: opt})}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${answers[item.key] === opt ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="md:col-span-2 p-6 bg-slate-900 text-white rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6">
                  <p className="font-bold">Velocidade que trafegou:</p>
                  <div className="flex gap-4">
                    {['Dentro do permitido', 'Acima do permitido'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers({...answers, speedStatus: opt})}
                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-2 ${answers.speedStatus === opt ? 'bg-white text-slate-900 border-white' : 'border-white/20 text-white/60 hover:border-white/40'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações adicionais e/ou sugestões</label>
              <textarea 
                value={answers.additionalInfo} 
                onChange={e => setAnswers({...answers, additionalInfo: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-4 min-h-[160px]"
                placeholder="Detalhes sobre a viagem, ocorrências, etc."
              />
            </section>

            <div className="flex gap-4 pt-8">
              <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 text-slate-500 font-black uppercase">Cancelar</button>
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg">Salvar Relatório</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {myReports.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-20 rounded-3xl text-center border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Nenhum relatório enviado.</p>
            </div>
          ) : (
            myReports.map((rep, index) => (
              <div key={rep.id || `rep-${index}`} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex justify-between items-center gap-6">
                <div>
                  <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100">{rep.answers.congregation}</h4>
                  <p className="text-sm font-bold text-slate-400">Ônibus: {rep.answers.busNumber} • Motorista: {rep.answers.driverName} • Data: {new Date(rep.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEditForm(rep)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Editar">✏️</button>
                  {onDeleteReport && (
                    <button onClick={() => setReportToDelete(rep.id)} className="p-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Excluir">🗑️</button>
                  )}
                  <button onClick={() => handleDownloadPDF(rep)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-colors">Baixar Relatório (PDF)</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!reportToDelete}
        title="Excluir Relatório"
        message="Deseja realmente excluir este relatório SH? Esta ação não pode ser desfeita."
        onConfirm={() => {
          if (reportToDelete && onDeleteReport) {
            onDeleteReport(reportToDelete);
            setReportToDelete(null);
          }
        }}
        onCancel={() => setReportToDelete(null)}
      />
    </div>
  );
};

export default SHReportForm;
