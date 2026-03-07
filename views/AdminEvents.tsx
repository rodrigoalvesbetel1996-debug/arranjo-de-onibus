
import React, { useState } from 'react';
import { JWEvent, EventType } from '@/types';

interface AdminEventsProps {
  events: JWEvent[];
  onAddEvent: (ev: Partial<JWEvent>) => void;
  onToggleEvent: (id: string) => void;
  onEditEvent: (ev: JWEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const AdminEvents: React.FC<AdminEventsProps> = ({ events, onAddEvent, onToggleEvent, onEditEvent, onDeleteEvent }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<JWEvent>>({
    name: '',
    type: EventType.CIRCUIT_ASSEMBLY,
    startDate: '',
    days: 1,
    pricePerTicket: 0,
    isActive: true,
    paymentDeadline: '',
    registrationDeadline: '',
    info: '',
    fileUrl: '',
    fileName: ''
  });

  const handleTypeChange = (type: EventType) => {
    const days = type === EventType.REGIONAL_CONVENTION ? 3 : 1;
    setNewEvent({ ...newEvent, type, days });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEventId) {
      onEditEvent({ ...newEvent, id: editingEventId } as JWEvent);
    } else {
      onAddEvent(newEvent);
    }
    setShowForm(false);
    setEditingEventId(null);
    setNewEvent({ name: '', type: EventType.CIRCUIT_ASSEMBLY, startDate: '', days: 1, pricePerTicket: 0, isActive: true, paymentDeadline: '', registrationDeadline: '', info: '', fileUrl: '', fileName: '' });
  };

  const handleEditClick = (ev: JWEvent) => {
    setNewEvent(ev);
    setEditingEventId(ev.id);
    setShowForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setEventToDelete(id);
  };

  const confirmDelete = () => {
    if (eventToDelete) {
      onDeleteEvent(eventToDelete);
      setEventToDelete(null);
    }
  };

  const cancelDelete = () => {
    setEventToDelete(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEventId(null);
    setNewEvent({ name: '', type: EventType.CIRCUIT_ASSEMBLY, startDate: '', days: 1, pricePerTicket: 0, isActive: true, paymentDeadline: '', registrationDeadline: '', info: '', fileUrl: '', fileName: '' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvent(prev => ({
          ...prev,
          fileUrl: reader.result as string,
          fileName: file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Gerir Eventos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Configuração mestre das janelas de transporte.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100 dark:shadow-none text-sm"
        >
          + Novo Evento
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">{editingEventId ? 'Editar Evento' : 'Criar Evento'}</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título</label>
                <input
                  required
                  type="text"
                  autoFocus
                  value={newEvent.name}
                  onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                  placeholder="Nome do congresso ou assembleia"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                <select
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                  value={newEvent.type}
                  onChange={e => handleTypeChange(e.target.value as EventType)}
                >
                  <option value={EventType.CIRCUIT_ASSEMBLY}>Assembleia de Circuito</option>
                  <option value={EventType.BETHEL_ASSEMBLY}>Assembleia (Representante de Betel)</option>
                  <option value={EventType.REGIONAL_CONVENTION}>Congresso Regional</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Início</label>
                  <input
                    required
                    type="date"
                    value={newEvent.startDate}
                    onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passagem (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newEvent.pricePerTicket}
                    onChange={e => setNewEvent({ ...newEvent, pricePerTicket: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest italic">Duração calculada: {newEvent.days} dia(s)</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Limite Pagamento</label>
                  <input
                    type="date"
                    value={newEvent.paymentDeadline || ''}
                    onChange={e => setNewEvent({ ...newEvent, paymentDeadline: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Limite Inscrição</label>
                  <input
                    type="date"
                    value={newEvent.registrationDeadline || ''}
                    onChange={e => setNewEvent({ ...newEvent, registrationDeadline: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informações / Avisos</label>
                <textarea
                  value={newEvent.info || ''}
                  onChange={e => setNewEvent({ ...newEvent, info: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm min-h-[80px] resize-y"
                  placeholder="Avisos importantes, horários, etc."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Arquivo do Evento</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                    Escolher Arquivo
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </label>
                  {newEvent.fileName && (
                    <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]" title={newEvent.fileName}>
                      {newEvent.fileName}
                    </span>
                  )}
                  {newEvent.fileUrl && (
                    <button 
                      type="button" 
                      onClick={() => setNewEvent(prev => ({ ...prev, fileUrl: '', fileName: '' }))}
                      className="text-xs text-red-500 hover:underline font-bold"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={handleCancel} className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:underline text-sm uppercase">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none text-sm uppercase tracking-wide">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {eventToDelete && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Excluir Evento?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-100 dark:shadow-none hover:bg-red-700 transition-colors text-sm uppercase tracking-wide"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {events.map((ev, index) => (
          <div key={ev.id || `ev-${index}`} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all shadow-sm">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="font-bold text-lg text-slate-800 dark:text-white">{ev.name}</h4>
                {!ev.isActive && <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-slate-200 dark:border-slate-700">Inativo</span>}
                {ev.isActive && <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-emerald-100 dark:border-emerald-900/40">Ativo</span>}
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <span className="flex items-center"><span className="mr-1.5 opacity-50 text-base">📁</span> {ev.type}</span>
                <span className="flex items-center"><span className="mr-1.5 opacity-50 text-base">⏳</span> {ev.days} dia(s)</span>
                <span className="flex items-center"><span className="mr-1.5 opacity-50 text-base">💸</span> R$ {ev.pricePerTicket.toFixed(2)}</span>
                <span className="flex items-center text-indigo-600 dark:text-indigo-400 italic">
                  📅 {(() => {
                    const [y, m, d] = ev.startDate.split('-').map(Number);
                    const start = new Date(y, m - 1, d, 12, 0, 0);
                    if (ev.days > 1) {
                      const end = new Date(start);
                      end.setDate(end.getDate() + ev.days - 1);
                      return `${start.toLocaleDateString()} a ${end.toLocaleDateString()}`;
                    }
                    return start.toLocaleDateString();
                  })()}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
              <button
                onClick={() => handleEditClick(ev)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border text-slate-600 bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Editar
              </button>
              <button
                onClick={() => onToggleEvent(ev.id)}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${ev.isActive ? 'text-amber-600 bg-white border-amber-100 hover:bg-amber-50 dark:bg-slate-900 dark:border-amber-900/40 dark:hover:bg-amber-900/20' : 'text-emerald-600 bg-white border-emerald-100 hover:bg-emerald-50 dark:bg-slate-900 dark:border-emerald-900/40 dark:hover:bg-emerald-900/20'}`}
              >
                {ev.isActive ? 'Desativar' : 'Reativar'}
              </button>
              <button
                onClick={() => handleDeleteClick(ev.id)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border text-red-600 bg-white border-red-100 hover:bg-red-50 dark:bg-slate-900 dark:border-red-900/40 dark:hover:bg-red-900/20"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminEvents;
