import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { defer, of, type Observable } from 'rxjs';

interface Competency {
  name: string;
  category: string;
  priority: number;
  description: string;
  skills: string[];
  kpis: string[];
  weight?: number;
}

interface AnalysisResult {
  job_title: string;
  summary: string;
  competencies: {
    core: Competency[];
    behavioral: Competency[];
    leadership: Competency[];
    technical: Competency[];
  };
  stats: {
    words_analyzed: number;
    skills_identified: number;
    sections_analyzed: number;
    confidence_score: number;
  };
}

interface ExportOptions {
  language: 'ar' | 'en';
  translations: {
    title: string;
    jobTitle: string;
    generatedAt: string;
    competencies: string;
    coreTitle: string;
    behavioralTitle: string;
    leadershipTitle: string;
    technicalTitle: string;
    priority: string;
    skills: string;
    kpis: string;
    weight: string;
    summary: string;
    stats: string;
    wordsAnalyzed: string;
    skillsIdentified: string;
    sectionsAnalyzed: string;
    confidenceScore: string;
    total: string;
    poweredBy: string;
  };
}

/**
 * Builds and downloads the PDF.
 *
 * jsPDF is entirely synchronous, so the work runs inside `defer`: nothing
 * happens until someone subscribes, and anything `buildPdf` throws arrives as
 * an error notification instead of an unhandled exception.
 */
export function exportAnalysisToPDF(
  result: AnalysisResult,
  options: ExportOptions
): Observable<void> {
  return defer(() => {
    buildPdf(result, options);
    return of(undefined as void);
  });
}

function buildPdf(result: AnalysisResult, options: ExportOptions): void {
  const { language, translations: t } = options;
  const isRTL = language === 'ar';

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper functions
  const addCenteredText = (
    text: string,
    y: number,
    size: number,
    style: 'normal' | 'bold' = 'normal'
  ) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
    return y + size * 0.5;
  };

  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Colors
  const primaryColor: [number, number, number] = [99, 102, 241]; // Indigo
  const secondaryColor: [number, number, number] = [236, 72, 153]; // Pink
  const tertiaryColor: [number, number, number] = [6, 182, 212]; // Cyan
  const technicalColor: [number, number, number] = [244, 63, 94]; // Rose

  const categoryColors: Record<string, [number, number, number]> = {
    Core: primaryColor,
    Behavioral: secondaryColor,
    Leadership: tertiaryColor,
    Technical: technicalColor,
  };

  // Header with gradient-like effect
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  yPosition = addCenteredText(t.title, 20, 24, 'bold');

  // Job Title
  yPosition = addCenteredText(result.job_title, 35, 16, 'normal');

  yPosition = 55;
  doc.setTextColor(0, 0, 0);

  // Generated date
  const dateStr = new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(`${t.generatedAt}: ${dateStr}`, margin, yPosition);
  yPosition += 15;

  // Summary Stats Box
  doc.setFillColor(249, 250, 251); // Light gray
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 25, 3, 3, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const statsData = [
    { label: t.wordsAnalyzed, value: result.stats.words_analyzed.toString() },
    {
      label: t.skillsIdentified,
      value: result.stats.skills_identified.toString(),
    },
    {
      label: t.sectionsAnalyzed,
      value: result.stats.sections_analyzed.toString(),
    },
    {
      label: `${t.confidenceScore}`,
      value: `${result.stats.confidence_score}%`,
    },
  ];

  const statWidth = (pageWidth - 2 * margin) / statsData.length;
  statsData.forEach((stat, index) => {
    const x = margin + statWidth * index + statWidth / 2;
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    const valueWidth = doc.getTextWidth(stat.value);
    doc.text(stat.value, x - valueWidth / 2, yPosition + 10);

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    const labelWidth = doc.getTextWidth(stat.label);
    doc.text(stat.label, x - labelWidth / 2, yPosition + 18);
  });

  yPosition += 35;

  // Competencies Section
  const categoryTitles: Record<string, string> = {
    core: t.coreTitle,
    behavioral: t.behavioralTitle,
    leadership: t.leadershipTitle,
    technical: t.technicalTitle,
  };

  const categories = ['core', 'behavioral', 'leadership', 'technical'] as const;

  for (const category of categories) {
    const competencies = result.competencies[category];
    if (competencies.length === 0) continue;

    checkPageBreak(40);

    // Category header
    const color = categoryColors[competencies[0]?.category || 'Core'];
    doc.setFillColor(...color);
    doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 10, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${categoryTitles[category]} (${competencies.length})`,
      margin + 5,
      yPosition + 7
    );

    yPosition += 15;

    // Competencies table
    const tableData = competencies.map((comp) => [
      comp.name,
      `${comp.priority}/5`,
      comp.weight ? `${comp.weight}%` : '-',
      comp.skills.slice(0, 3).join(', ') +
        (comp.skills.length > 3 ? '...' : ''),
      comp.kpis.slice(0, 2).join(', ') + (comp.kpis.length > 2 ? '...' : ''),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [[t.competencies, t.priority, t.weight, t.skills, t.kpis]],
      body: tableData,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: {
        fillColor: [...color] as [number, number, number],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 40 },
        4: { cellWidth: 55 },
      },
      didDrawPage: () => {
        yPosition = margin;
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer
  checkPageBreak(20);
  yPosition = pageHeight - 15;

  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.setFont('helvetica', 'normal');
  const footerText = `${t.poweredBy} - ${dateStr}`;
  const footerWidth = doc.getTextWidth(footerText);
  doc.text(footerText, (pageWidth - footerWidth) / 2, yPosition);

  // Total competencies summary on each page
  const totalCompetencies =
    result.competencies.core.length +
    result.competencies.behavioral.length +
    result.competencies.leadership.length +
    result.competencies.technical.length;

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `${t.total}: ${totalCompetencies} ${t.competencies}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
    doc.text(`${i} / ${totalPages}`, margin, pageHeight - 8);
  }

  // Save the PDF
  const fileName = `${result.job_title.replace(
    /[^a-zA-Z0-9\u0600-\u06FF]/g,
    '_'
  )}_competencies_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
