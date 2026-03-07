import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SHReport, Congregation, Passenger } from '@/types';

export const generatePassengerListPdf = (congregation: Congregation, passengers: Passenger[], eventDate?: string, dayName?: string) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 15;
  
  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  const title = dayName ? `PLANILHA DE ASSENTOS - ${dayName.toUpperCase()}` : 'PLANILHA DE ASSENTOS NO ÔNIBUS';
  doc.text(title, 105, 20, { align: 'center' });
  
  // Subtitle block
  doc.setFillColor(200, 200, 200);
  doc.rect(margin, 25, 180, 8, 'F');
  doc.setDrawColor(0);
  doc.rect(margin, 25, 180, 8, 'S');
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text('Este formulário deve ser preenchido e enviado ao Coordenador no circuito.', 105, 30, { align: 'center' });
  
  // Fields
  doc.setFontSize(11);
  doc.text(`Congregação: ${congregation.name || ''}`, margin, 42);
  doc.line(margin + 23, 43, 195, 43); // Underline for Congregação
  
  const cityState = congregation.cityState || '';
  const circuit = congregation.circuit || '';
  doc.text(`Cidade/Estado: ${cityState}`, margin, 50);
  doc.line(margin + 27, 51, 130, 51); // Underline for Cidade/Estado
  doc.text(`Circuito: ${circuit}`, 135, 50);
  doc.line(152, 51, 195, 51); // Underline for Circuito
  
  // Instruction
  doc.setFontSize(10);
  doc.text('(Anote nas colunas abaixo o nome do passageiro e o numero da Cédula de Identidade [RG].)', 105, 60, { align: 'center' });
  
  // Table
  // We need 6 columns: Nome, RG, Nome, RG, Nome, RG
  // We have 3 pairs per row.
  const tableData: string[][] = [];
  
  // Include all passengers
  const allPassengers = [...passengers];
  
  // Sort passengers alphabetically
  allPassengers.sort((a, b) => a.name.localeCompare(b.name));
  
  // Create rows of 3 passengers each
  for (let i = 0; i < allPassengers.length; i += 3) {
    const p1 = allPassengers[i];
    const p2 = allPassengers[i + 1];
    const p3 = allPassengers[i + 2];
    
    tableData.push([
      p1 ? p1.name : '', p1 ? p1.document : '',
      p2 ? p2.name : '', p2 ? p2.document : '',
      p3 ? p3.name : '', p3 ? p3.document : ''
    ]);
  }
  
  // Ensure we have at least 22 rows to match the visual template and fit on 1 page
  while (tableData.length < 22) {
    tableData.push(['', '', '', '', '', '']);
  }
  
  autoTable(doc, {
    startY: 65,
    head: [['Nome', 'RG', 'Nome', 'RG', 'Nome', 'RG']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: 0
    },
    bodyStyles: {
      textColor: 0,
      lineWidth: 0.1,
      lineColor: 0,
      minCellHeight: 8
    },
    styles: {
      font: 'times',
      fontSize: 10,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 20 },
      4: { cellWidth: 40 },
      5: { cellWidth: 20 }
    },
    margin: { left: margin, right: margin }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  let formattedDate = '......../........./........';
  if (eventDate) {
    try {
      // Append T12:00:00 to avoid timezone shifts (treat as noon local time)
      const dateToParse = eventDate.includes('T') ? eventDate : `${eventDate}T12:00:00`;
      const d = new Date(dateToParse);
      formattedDate = d.toLocaleDateString('pt-BR');
    } catch (e) {
      // ignore
    }
  }

  const coordinatorName = congregation.coordinatorName || '';
  
  // Ensure it stays on the same page if possible
  doc.text(`Data: ${formattedDate}`, margin, finalY);
  
  doc.text(coordinatorName, 120, finalY, { align: 'center' });
  doc.line(80, finalY + 1, 160, finalY + 1);
  doc.text('Encarregado', 120, finalY + 5, { align: 'center' });
  
  const filename = dayName 
    ? `Planilha de Assentos - ${dayName} - ${congregation.name}.pdf`
    : `lista_passageiros_${congregation.name.replace(/\s+/g, '_')}.pdf`;
    
  doc.save(filename);
};

export const generateConsolidatedPassengerListPdf = (
  congregation: Congregation, 
  passengers: Passenger[], 
  eventStartDate: string, 
  eventDays: number
) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Calculate dates
  const dates = [];
  const [year, month, day] = eventStartDate.split('-').map(Number);
  const startDateObj = new Date(year, month - 1, day, 12, 0, 0);
  
  for (let i = 0; i < eventDays; i++) {
    const d = new Date(startDateObj);
    d.setDate(d.getDate() + i);
    dates.push({
      dateStr: d.toLocaleDateString('en-CA'), // YYYY-MM-DD
      dayName: d.toLocaleDateString('pt-BR', { weekday: 'long' }),
      formattedDate: d.toLocaleDateString('pt-BR')
    });
  }

  // Generate a section for each day
  dates.forEach((dateInfo, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Filter passengers for this day
    // If passenger has no selectedDays (legacy), assume they go all days? 
    // Or if selectedDays is empty, they go no days?
    // User said: "Um passageiro pode marcar: 1 dia, 2 dias, ou os 3 dias"
    // So we must filter strictly.
    const dayPassengers = passengers.filter(p => 
      p.selectedDays && p.selectedDays.includes(dateInfo.dateStr)
    );

    // Reuse the logic from generatePassengerListPdf but adapted for single page generation
    // We can't easily reuse the function because it saves the file.
    // So we replicate the drawing logic here.
    
    const margin = 15;
    
    // Title
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    const title = `PLANILHA DE ASSENTOS - ${dateInfo.dayName.toUpperCase()}`;
    doc.text(title, 105, 20, { align: 'center' });
    
    // Subtitle block
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, 25, 180, 8, 'F');
    doc.setDrawColor(0);
    doc.rect(margin, 25, 180, 8, 'S');
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text('Este formulário deve ser preenchido e enviado ao Coordenador no circuito.', 105, 30, { align: 'center' });
    
    // Fields
    doc.setFontSize(11);
    doc.text(`Congregação: ${congregation.name || ''}`, margin, 42);
    doc.line(margin + 23, 43, 195, 43);
    
    const cityState = congregation.cityState || '';
    const circuit = congregation.circuit || '';
    doc.text(`Cidade/Estado: ${cityState}`, margin, 50);
    doc.line(margin + 27, 51, 130, 51);
    doc.text(`Circuito: ${circuit}`, 135, 50);
    doc.line(152, 51, 195, 51);
    
    // Instruction
    doc.setFontSize(10);
    doc.text('(Anote nas colunas abaixo o nome do passageiro e o numero da Cédula de Identidade [RG].)', 105, 60, { align: 'center' });
    
    // Table Data
    const tableData: string[][] = [];
    const sortedPassengers = [...dayPassengers].sort((a, b) => a.name.localeCompare(b.name));
    
    for (let i = 0; i < sortedPassengers.length; i += 3) {
      const p1 = sortedPassengers[i];
      const p2 = sortedPassengers[i + 1];
      const p3 = sortedPassengers[i + 2];
      
      tableData.push([
        p1 ? p1.name : '', p1 ? p1.document : '',
        p2 ? p2.name : '', p2 ? p2.document : '',
        p3 ? p3.name : '', p3 ? p3.document : ''
      ]);
    }
    
    while (tableData.length < 22) {
      tableData.push(['', '', '', '', '', '']);
    }
    
    autoTable(doc, {
      startY: 65,
      head: [['Nome', 'RG', 'Nome', 'RG', 'Nome', 'RG']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 0,
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: 0
      },
      bodyStyles: {
        textColor: 0,
        lineWidth: 0.1,
        lineColor: 0,
        minCellHeight: 8
      },
      styles: {
        font: 'times',
        fontSize: 10,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 20 },
        2: { cellWidth: 40 },
        3: { cellWidth: 20 },
        4: { cellWidth: 40 },
        5: { cellWidth: 20 }
      },
      margin: { left: margin, right: margin }
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const coordinatorName = congregation.coordinatorName || '';
    
    doc.text(`Data: ${dateInfo.formattedDate}`, margin, finalY);
    doc.text(coordinatorName, 120, finalY, { align: 'center' });
    doc.line(80, finalY + 1, 160, finalY + 1);
    doc.text('Encarregado', 120, finalY + 5, { align: 'center' });
  });

  const filename = `lista_passageiros_completa_${congregation.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};

export const generateSHPdf = (report: SHReport) => {
  const doc = new jsPDF();
  const data = report.answers;
  const margin = 15;
  
  // Configurações Globais
  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  // --- CABEÇALHO DIREITO ---
  doc.text(String(data.congregation || ''), 195, 20, { align: 'right' });
  doc.text(String(data.congAddress || ''), 195, 25, { align: 'right' });
  doc.text(String(data.congCity || ''), 195, 30, { align: 'right' });
  doc.text(String(data.date || ''), 195, 40, { align: 'right' });

  // --- CABEÇALHO ESQUERDO ---
  doc.text(String(data.coordinatorName || ''), margin, 50);
  doc.text('Coordenador no circuito', margin, 55);
  doc.text(String(data.coordinatorAddress || ''), margin, 60);
  doc.text(String(data.coordinatorCity || ''), margin, 65);

  // --- TÍTULO PRINCIPAL ---
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, 75, 180, 8, 'F');
  doc.rect(margin, 75, 180, 8, 'S');
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('Relatório de Controle de Qualidade', 105, 81, { align: 'center' });

  // --- GRADE DE DADOS ---
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  
  // Linha Evento
  doc.rect(margin, 83, 180, 10);
  doc.text(`Evento: ${data.eventName || ''}`, margin + 2, 90);
  doc.text('(Assembleia de Circuito / Congresso Regional)', 115, 90);

  // Linha Empresa
  doc.rect(margin, 93, 180, 10);
  doc.text(`Empresa: ${data.company || ''}`, margin + 2, 100);

  // Linha Ônibus e Placas
  doc.rect(margin, 103, 90, 10);
  doc.text(`N.º do Ônibus: ${data.busNumber || ''}`, margin + 2, 110);
  doc.rect(margin + 90, 103, 90, 10);
  doc.text(`Placas: ${data.licensePlate || ''}`, margin + 92, 110);

  // Linha Capitão e Fone
  doc.rect(margin, 113, 90, 10);
  doc.text(`Nome do capitão: ${data.captainName || ''}`, margin + 2, 120);
  doc.rect(margin + 90, 113, 90, 10);
  doc.text(`Fone: ${data.captainPhone || ''}`, margin + 92, 120);

  // Linha Motorista
  doc.rect(margin, 123, 180, 10);
  doc.text(`Nome do Motorista: ${data.driverName || ''}`, margin + 2, 130);

  // --- SEÇÃO DETALHES ---
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, 140, 180, 7, 'F');
  doc.rect(margin, 140, 180, 7, 'S');
  doc.setFont('times', 'bold');
  doc.text('DETALHES (Tique o quadrículo)', 105, 145, { align: 'center' });
  
  doc.setFont('times', 'normal');
  let y = 153;
  
  const drawRow = (label: string, value: any, options: string[]) => {
    doc.rect(margin, y - 6, 180, 9);
    doc.text(label, margin + 2, y);
    let x = 95;
    options.forEach(opt => {
      doc.rect(x, y - 3, 3.5, 3.5); // Quadrículo
      if (String(value) === opt) {
        doc.setFont('times', 'bold');
        doc.text('X', x + 0.5, y);
        doc.setFont('times', 'normal');
      }
      doc.text(opt, x + 5, y);
      x += (opt.length > 8 ? 32 : 22);
    });
    y += 9;
  };

  drawRow('Aparência do motorista', data.driverAppearance, ['Excelente', 'Boa', 'Regular', 'Má']);
  drawRow('Educação', data.driverEducation, ['Excelente', 'Boa', 'Regular', 'Má']);
  drawRow('Condição dos pneus', data.tireCondition, ['Excelente', 'Boa', 'Regular', 'Péssima']);
  drawRow('Havia extintor disponível?', data.extinguisher, ['Sim', 'Não']);
  drawRow('Houve problemas de horário?', data.timeProblems, ['Sim', 'Não']);
  drawRow('Limpeza do carro', data.cleanliness, ['Excelente', 'Boa', 'Regular', 'Péssima']);
  drawRow('Nos pontos de embarque houve problemas?', data.boardingProblems, ['Sim', 'Não']);
  drawRow('Trafegou pelo acostamento?', data.shoulderDriving, ['Sim', 'Não']);
  
  // Velocidade (Linha especial)
  doc.rect(margin, y - 6, 180, 9);
  doc.text('Velocidade que trafegou', margin + 2, y);
  doc.rect(95, y - 3, 3.5, 3.5);
  if (data.speedStatus === 'Dentro do permitido') doc.text('X', 95.5, y);
  doc.text('Dentro do permitido', 100, y);
  doc.rect(135, y - 3, 3.5, 3.5);
  if (data.speedStatus === 'Acima do permitido') doc.text('X', 135.5, y);
  doc.text('Acima do permitido', 140, y);

  // --- PÁGINA 2 ---
  doc.addPage();
  doc.rect(margin, 20, 180, 80);
  doc.text('Informações adicionais e/ou sugestões. Se precisar de mais espaço, use o verso:', margin + 2, 27);
  const splitText = doc.splitTextToSize(String(data.additionalInfo || ''), 170);
  doc.text(splitText, margin + 5, 35);

  // --- ASSINATURA ---
  const bottomY = 120;
  doc.line(70, bottomY, 140, bottomY);
  doc.text('Capitão do ônibus', 105, bottomY + 5, { align: 'center' });
  doc.text(`Fone: ${data.captainPhone || ''}`, 105, bottomY + 10, { align: 'center' });

  // Salvar
  doc.save(`Relatorio_SH_${data.congregation}_${new Date().getTime()}.pdf`);
};
