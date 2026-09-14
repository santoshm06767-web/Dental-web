import { jsPDF } from 'jspdf';
import { Appointment, ClinicSettings, Profile, Payment } from '../types';
import { numberToWords } from '../utils/numberToWords';

export function generateConsultationSlipDoc(
  appointment: Appointment,
  settings: ClinicSettings,
  staffProfile?: Profile
): jsPDF {
  // Standard A4 portrait (210 x 297 mm) - provides ample space for Doctor's prescription & clinical advice
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182 mm

  // Professional Clinic Palette
  const primaryColor = [14, 116, 144]; // Deep Medical Cyan / Sky-700
  const navyColor = [15, 23, 42]; // Slate-900
  const textColor = [30, 41, 59]; // Slate-800
  const mutedColor = [100, 116, 139]; // Slate-500
  const softBg = [248, 250, 252]; // Slate-50
  const borderCol = [203, 213, 225]; // Slate-300
  const lightRuling = [226, 232, 240]; // Slate-200 for doctor writing lines

  let y = margin;

  // ==========================================
  // 1. CLINIC HEADER (Logo, Clinic Name, Address, Token & Slip Badge)
  // ==========================================
  const headerHeight = 28;
  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.roundedRect(margin, y, contentWidth, headerHeight, 2, 2, 'F');
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, headerHeight, 2, 2, 'S');

  // Logo / Emblem on Left
  const logoBoxSize = 20;
  const logoX = margin + 4;
  const logoY = y + 4;
  let hasDrawnLogo = false;

  if (settings?.logo_url) {
    try {
      let format = 'PNG';
      if (settings.logo_url.startsWith('data:image/jpeg') || settings.logo_url.startsWith('data:image/jpg')) {
        format = 'JPEG';
      } else if (settings.logo_url.startsWith('data:image/webp')) {
        format = 'WEBP';
      }
      doc.addImage(settings.logo_url, format, logoX, logoY, logoBoxSize, logoBoxSize, undefined, 'FAST');
      hasDrawnLogo = true;
    } catch (logoErr) {
      console.warn('Unable to embed logo image into jsPDF document, falling back to clinical emblem:', logoErr);
    }
  }

  if (!hasDrawnLogo) {
    // Clinical Tooth / Medical Cross Emblem
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(logoX, logoY, logoBoxSize, logoBoxSize, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('+', logoX + logoBoxSize / 2, logoY + 14, { align: 'center' });
  }

  // Clinic Title & Address (Beside Logo)
  const clinicTextLeft = logoX + logoBoxSize + 6;
  const clinicName = settings?.clinic_name || 'AROGYA DENTAL CARE & IMPLANT CENTRE';
  const clinicAddress = settings?.address || 'Pratima Medical Store, Khodasingi, Berhampur, 760001';

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(13.5);
  doc.setFont('helvetica', 'bold');
  doc.text(clinicName, clinicTextLeft, y + 8);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(clinicAddress, clinicTextLeft, y + 14);

  const subDetails = `Ph: ${settings?.phone || '+91 94370 12345'}  |  Email: ${settings?.email || 'contact@arogyadental.com'}${settings?.website ? '  |  ' + settings.website : ''}`;
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(7.5);
  doc.text(subDetails, clinicTextLeft, y + 19.5);

  if (settings?.gst_number) {
    doc.setFontSize(7);
    doc.setTextColor(140, 150, 165);
    doc.text(`Reg/GST No: ${settings.gst_number}`, clinicTextLeft, y + 24.5);
  }

  // Right Side: Slip Badge & Token No.
  const tokenBoxWidth = 38;
  const tokenBoxX = margin + contentWidth - tokenBoxWidth - 3;
  const tokenBoxY = y + 3;

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(tokenBoxX, tokenBoxY, tokenBoxWidth, 22, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('APPOINTMENT SLIP', tokenBoxX + tokenBoxWidth / 2, tokenBoxY + 5, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('TOKEN NO.', tokenBoxX + tokenBoxWidth / 2, tokenBoxY + 10, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const tokenFormatted = `${settings?.token_prefix ? settings.token_prefix + '-' : ''}${String(appointment.token_number).padStart(2, '0')}`;
  doc.text(tokenFormatted, tokenBoxX + tokenBoxWidth / 2, tokenBoxY + 17, { align: 'center' });

  y += headerHeight + 3;

  // ==========================================
  // 2. PATIENT & DOCTOR DETAILS STRIP (Matching user sample doc)
  // ==========================================
  const detailsHeight = 26;
  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.roundedRect(margin, y, contentWidth, detailsHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, contentWidth, detailsHeight, 1.5, 1.5, 'S');

  // Vertical divider between Patient and Doctor
  const splitX = margin + contentWidth * 0.58;
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.line(splitX, y, splitX, y + detailsHeight);

  // Left: Patient Details
  const patient = appointment.patient;
  const patName = patient ? `${patient.first_name} ${patient.last_name}` : 'Walk-in Patient';
  const patAge = patient?.age ? `${patient.age} Yrs` : 'N/A';
  const patGender = patient?.gender || 'N/A';
  const patCode = patient?.patient_code || appointment.patient_id;
  const patMobile = patient?.mobile || 'N/A';

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT DETAILS', margin + 4, y + 5.5);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8.5);
  
  // Row 1: Name & Age
  doc.setFont('helvetica', 'bold');
  doc.text('Name :', margin + 4, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(patName, margin + 17, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Age / Sex :', splitX - 36, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${patAge} / ${patGender}`, splitX - 18, y + 11.5);

  // Row 2: Patient ID & Mobile
  doc.setFont('helvetica', 'bold');
  doc.text('Patient ID :', margin + 4, y + 17.5);
  doc.setFont('helvetica', 'normal');
  doc.text(patCode, margin + 22, y + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Mobile :', margin + 54, y + 17.5);
  doc.setFont('helvetica', 'normal');
  doc.text(patMobile, margin + 68, y + 17.5);

  // Row 3: Chief Complaint / Reason
  doc.setFont('helvetica', 'bold');
  doc.text('Complaint :', margin + 4, y + 23);
  doc.setFont('helvetica', 'normal');
  const complaintStr = appointment.reason || 'General Consultation & Dental Checkup';
  doc.text(doc.splitTextToSize(complaintStr, splitX - margin - 26)[0] || complaintStr, margin + 22, y + 23);

  // Right: Doctor Details & Slip Meta
  const doctor = appointment.doctor;
  const docName = doctor?.name || 'Dr. Mridusmita Pathak';
  const docQual = doctor?.qualification || 'BDS, MDS (Orthodontics)';
  const docSpec = doctor?.specialization || 'Dental Surgeon';
  const docRoom = doctor?.consultation_room || 'Consultation Room';
  const isDirector = docName.includes('Nirmal') || doctor?.id === 'doc-003';

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCTOR & SCHEDULE', splitX + 4, y + 5.5);

  // Doctor Photo / Monogram Badge in top right corner
  const avatarSize = 13;
  const avatarX = margin + contentWidth - avatarSize - 3;
  const avatarY = y + 7;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 2, 2, 'S');

  let imageRendered = false;
  if (doctor?.photo_url && (doctor.photo_url.startsWith('data:image/jpeg') || doctor.photo_url.startsWith('data:image/png'))) {
    try {
      const format = doctor.photo_url.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(doctor.photo_url, format, avatarX + 0.5, avatarY + 0.5, avatarSize - 1, avatarSize - 1);
      imageRendered = true;
    } catch (e) {
      imageRendered = false;
    }
  }

  if (!imageRendered) {
    // Elegant doctor monogram badge
    if (isDirector) {
      doc.setFillColor(180, 83, 9); // amber-700
    } else if (docName.includes('Swagat')) {
      doc.setFillColor(13, 148, 136); // teal-600
    } else {
      doc.setFillColor(14, 116, 144); // cyan-700
    }
    doc.circle(avatarX + avatarSize / 2, avatarY + avatarSize / 2, 4.8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    const docInitial = docName.replace(/^Dr\.?\s*/i, '').trim().charAt(0).toUpperCase() || 'D';
    doc.text(docInitial, avatarX + avatarSize / 2 - 1.4, avatarY + avatarSize / 2 + 2.4);
  }

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Dr Name :', splitX + 4, y + 11.5);
  doc.setFont('helvetica', 'normal');
  const maxDocTextW = avatarX - (splitX + 21) - 2;
  const fullDocTitle = `${docName}${isDirector ? ' (Director)' : ''}`;
  doc.text(doc.splitTextToSize(fullDocTitle, maxDocTextW)[0] || fullDocTitle, splitX + 21, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Specialty :', splitX + 4, y + 17.5);
  doc.setFont('helvetica', 'normal');
  const specText = `${docSpec} • ${docRoom}`;
  doc.text(doc.splitTextToSize(specText, maxDocTextW)[0] || specText, splitX + 21, y + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Date & Time :', splitX + 4, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.text(`${appointment.appointment_date} at ${appointment.appointment_time}`, splitX + 25, y + 23);

  y += detailsHeight + 2;

  // Medical Allergy Alert if present
  if (patient?.allergies && patient.allergies.toLowerCase() !== 'none') {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'S');

    doc.setTextColor(185, 28, 28);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`MEDICAL ALLERGY ALERT: ${patient.allergies}`, margin + 3, y + 4.2);
    y += 8;
  } else {
    y += 2;
  }

  // ==========================================
  // 3. DOCTOR'S PRESCRIPTION (Rx) SECTION - AMPLE SPACE
  // ==========================================
  // Large Rx Symbol
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Rx', margin, y + 6.5);

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('(Prescription & Medications)', margin + 14, y + 5.5);

  y += 9;

  // Rx Table Header
  const rxTableHeight = 6;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, rxTableHeight, 1, 1, 'F');
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, rxTableHeight, 1, 1, 'S');

  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('#', margin + 3, y + 4.2);
  doc.text('Medicine Name & Strength', margin + 12, y + 4.2);
  doc.text('Dosage (M - A - N)', margin + 92, y + 4.2);
  doc.text('Duration', margin + 130, y + 4.2);
  doc.text('Instructions (Food / Use)', margin + 152, y + 4.2);

  y += rxTableHeight;

  // 6 Spacious Ruled Prescription Lines for Doctor to write or typed notes
  const rxLineHeight = 8.5;
  const numRxLines = 6;
  doc.setDrawColor(lightRuling[0], lightRuling[1], lightRuling[2]);
  doc.setLineWidth(0.25);

  for (let i = 0; i < numRxLines; i++) {
    const lineY = y + (i + 1) * rxLineHeight;
    doc.line(margin, lineY, margin + contentWidth, lineY);

    // Subtle line number marker
    doc.setTextColor(200, 210, 225);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${i + 1}.`, margin + 3, lineY - 2.5);
  }

  y += numRxLines * rxLineHeight + 4;

  // ==========================================
  // 4. DOCTOR'S CLINICAL FINDINGS & ADVICE SECTION - SUFFICIENT GENEROUS SPACE
  // ==========================================
  // Prominent Advice Header matching sample doc
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Advice & Clinical Findings', margin, y + 4);

  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('(Examinations, Procedures Done, Post-op Care, Dental Hygiene & Precautions)', margin + 55, y + 3.8);

  y += 7;

  // Ruled writing area with generous lines for doctor's advice & instructions
  const adviceLineHeight = 8.0;
  const numAdviceLines = 10; // 10 spacious lines for doctor's advice!
  doc.setDrawColor(lightRuling[0], lightRuling[1], lightRuling[2]);
  doc.setLineWidth(0.25);

  // If appointment notes exist, print them in the first lines, leaving the rest ruled
  let printedNoteLines = 0;
  if (appointment.notes) {
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(`Notes: ${appointment.notes}`, contentWidth - 8);
    for (let nl = 0; nl < Math.min(noteLines.length, 3); nl++) {
      doc.text(noteLines[nl], margin + 4, y + (nl + 1) * adviceLineHeight - 2.5);
      printedNoteLines++;
    }
  }

  for (let i = 0; i < numAdviceLines; i++) {
    const lineY = y + (i + 1) * adviceLineHeight;
    doc.line(margin, lineY, margin + contentWidth, lineY);
  }

  y += numAdviceLines * adviceLineHeight + 5;

  // ==========================================
  // 5. NEXT VISIT / FOLLOW-UP & DOCTOR'S SIGNATURE
  // ==========================================
  const signSectionY = y;
  
  // Left: Next Visit / Review Date Box
  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.roundedRect(margin, signSectionY, 85, 16, 1.5, 1.5, 'F');
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, signSectionY, 85, 16, 1.5, 1.5, 'S');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('NEXT VISIT / REVIEW DATE', margin + 4, signSectionY + 4.5);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const nextVisitDateText = appointment.next_visit_date 
    ? `${appointment.next_visit_date}${appointment.next_visit_time ? ' at ' + appointment.next_visit_time : ''}`
    : '_____ / _____ / 20___';
  doc.text(`Date : ${nextVisitDateText}`, margin + 4, signSectionY + 9.5);

  const nextVisitNotes = appointment.next_visit_notes || 'Routine follow-up / suture removal / review';
  doc.setFontSize(7);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Remarks: ${nextVisitNotes}`, margin + 4, signSectionY + 13.5);

  // Right: Doctor's Signature Block
  const sigX = margin + contentWidth - 75;
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.4);
  doc.line(sigX, signSectionY + 10, sigX + 75, signSectionY + 10);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("Doctor's Signature / Stamp", sigX + 37.5, signSectionY + 14, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`${docName} (${docSpec})`, sigX + 37.5, signSectionY + 18, { align: 'center' });

  y += 22;

  // ==========================================
  // 6. FOOTER SECTION (Divider, Instructions, Phone, Email, Url)
  // ==========================================
  // Exact layout from sample document:
  // Footer
  // ________________
  // Phone :                   email :                          Url :
  const footerY = 274;
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  // Footer text advice
  const footerText = settings?.footer_text || 'Please bring this prescription slip during follow-up visits. In case of emergency or pain, contact the clinic.';
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.text(footerText, pageWidth / 2, footerY + 5, { align: 'center' });

  // Contact Info Row: Phone, Email, URL
  const phoneText = settings?.phone || '+91 94370 12345';
  const emailText = settings?.email || 'contact@arogyadental.com';
  const urlText = settings?.website || 'https://arogyadental.com';

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const col1X = margin + 4;
  const col2X = margin + 65;
  const col3X = margin + 125;

  doc.setFont('helvetica', 'bold');
  doc.text('Phone :', col1X, footerY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(phoneText, col1X + 13, footerY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('email :', col2X, footerY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(emailText, col2X + 11, footerY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Url :', col3X, footerY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(urlText, col3X + 8, footerY + 11);

  return doc;
}

export function downloadConsultationSlipPDF(
  appointment: Appointment,
  settings: ClinicSettings,
  staffProfile?: Profile
) {
  const doc = generateConsultationSlipDoc(appointment, settings, staffProfile);
  const patName = appointment.patient ? `${appointment.patient.first_name}_${appointment.patient.last_name}` : 'Patient';
  const cleanName = patName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Prescription_Slip_${cleanName}_${appointment.appointment_date}.pdf`;
  doc.save(filename);
}

export function printConsultationSlipPDF(
  appointment: Appointment,
  settings: ClinicSettings,
  staffProfile?: Profile
) {
  const doc = generateConsultationSlipDoc(appointment, settings, staffProfile);
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } else {
    // Fallback: trigger standard download if popup was blocked
    const patName = appointment.patient ? `${appointment.patient.first_name}_${appointment.patient.last_name}` : 'Patient';
    const cleanName = patName.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Prescription_Slip_${cleanName}_${appointment.appointment_date}.pdf`);
  }
}

// ==========================================
// OFFICIAL MONEY RECEIPT PDF GENERATOR (A5 / Half-A4 Format)
// ==========================================
export function generateMoneyReceiptDoc(
  payment: Payment,
  settings: ClinicSettings,
  staffProfile?: Profile
): jsPDF {
  // A5 Landscape format (210 x 148 mm) - standard clinic receipt voucher slip
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 210;
  const pageHeight = 148;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190 mm

  // Palette
  const primaryColor = [14, 116, 144]; // Deep Medical Cyan / Sky-700
  const emeraldColor = [5, 150, 105]; // Emerald-600
  const navyColor = [15, 23, 42]; // Slate-900
  const textColor = [30, 41, 59]; // Slate-800
  const mutedColor = [100, 116, 139]; // Slate-500
  const softBg = [248, 250, 252]; // Slate-50
  const borderCol = [203, 213, 225]; // Slate-300

  let y = margin;

  // Outer Border
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 2, 2, 'S');

  // Header Banner
  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.roundedRect(margin + 1, margin + 1, contentWidth - 2, 22, 2, 2, 'F');
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.line(margin + 1, margin + 23, margin + contentWidth - 1, margin + 23);

  // Clinic Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  const clinicName = settings?.clinic_name || 'AROGYA DENTAL CARE & IMPLANT CENTRE';
  doc.text(clinicName.toUpperCase(), margin + 6, y + 6);

  // Clinic Subtitle / Address
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const addressLine = settings?.address || 'Pratima Medical Store, Khodasingi, Berhampur, 760001';
  doc.text(addressLine, margin + 6, y + 11);

  const contactLine = `Phone: ${settings?.phone || '+91 98540 12000'} | Email: ${settings?.email || 'care@arogyadental.com'}${settings?.gst_number ? ` | GSTIN: ${settings.gst_number}` : ''}`;
  doc.text(contactLine, margin + 6, y + 15);

  // Money Receipt Badge (Right Header)
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.roundedRect(pageWidth - margin - 50, y + 3, 44, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('MONEY RECEIPT', pageWidth - margin - 28, y + 7.8, { align: 'center' });

  // Receipt Number & Date
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`No: ${payment.receipt_number}`, pageWidth - margin - 50, y + 14);

  const pDate = new Date(payment.collected_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const pTime = new Date(payment.collected_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Date: ${pDate} ${pTime}`, pageWidth - margin - 50, y + 19);

  y = margin + 27;

  // Patient & Doctor Information Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 4, y, contentWidth - 8, 26, 1.5, 1.5, 'S');

  const pat = payment.patient;
  const docObj = payment.doctor;

  // Column 1: Patient details
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('PATIENT DETAILS', margin + 7, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  const patFullName = pat ? `${pat.first_name} ${pat.last_name}` : 'Registered Patient';
  doc.text(patFullName, margin + 7, y + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Patient ID / UHID: `, margin + 7, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(pat?.patient_code || payment.patient_id, margin + 35, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Mobile: ${pat?.mobile || 'N/A'}${pat?.gender ? ` | ${pat.gender}` : ''}${pat?.age ? ` (${pat.age} yrs)` : ''}`, margin + 7, y + 21);

  // Column 2: Doctor & Clinical details
  const col2X = margin + 105;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('ATTENDING DOCTOR / SERVICE', col2X, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(docObj ? docObj.name : 'Dental OPD Clinic', col2X, y + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(docObj ? `${docObj.specialization} (${docObj.qualification})` : 'Arogya Dental Care', col2X, y + 16);

  if (payment.appointment) {
    doc.text(`Appointment: ${payment.appointment.appointment_code} (Token #${payment.appointment.token_number})`, col2X, y + 21);
  } else {
    doc.text(`Status: Paid in Full`, col2X, y + 21);
  }

  y += 30;

  // Payment Particulars Table
  const tableX = margin + 4;
  const tableW = contentWidth - 8;
  const tableHeaderY = y;

  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.roundedRect(tableX, tableHeaderY, tableW, 7, 1, 1, 'F');
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.line(tableX, tableHeaderY + 7, tableX + tableW, tableHeaderY + 7);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('S.NO', tableX + 3, tableHeaderY + 4.8);
  doc.text('PARTICULARS / DESCRIPTION', tableX + 18, tableHeaderY + 4.8);
  doc.text('TYPE', tableX + 115, tableHeaderY + 4.8);
  doc.text('AMOUNT (INR)', tableX + tableW - 4, tableHeaderY + 4.8, { align: 'right' });

  // Row 1
  const rowY = tableHeaderY + 8;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('1.', tableX + 3, rowY + 5.5);

  let desc = 'Dental Healthcare Services';
  if (payment.payment_type === 'REGISTRATION') {
    desc = 'Patient Registration & Lifetime UHID Enrollment Fee';
  } else if (payment.payment_type === 'CONSULTATION') {
    desc = `Doctor Consultation Fee - ${docObj ? docObj.name : 'Dental OPD'}`;
  } else if (payment.payment_type === 'FOLLOW_UP') {
    desc = `Follow-Up Consultation Fee - ${docObj ? docObj.name : 'Dental OPD'}`;
  } else if (payment.payment_type === 'PROCEDURE') {
    desc = payment.notes || 'Dental Clinical Procedure & Dental Consumables';
  } else if (payment.notes) {
    desc = payment.notes;
  }
  doc.text(desc, tableX + 18, rowY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(payment.payment_type, tableX + 115, rowY + 5.5);

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Rs. ${Number(payment.amount).toFixed(2)}`, tableX + tableW - 4, rowY + 5.5, { align: 'right' });

  // Total Line
  const totalY = rowY + 11;
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.line(tableX, totalY, tableX + tableW, totalY);

  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.rect(tableX, totalY, tableW, 8, 'F');
  doc.line(tableX, totalY + 8, tableX + tableW, totalY + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('TOTAL AMOUNT RECEIVED:', tableX + 85, totalY + 5.5);

  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFontSize(10.5);
  doc.text(`Rs. ${Number(payment.amount).toFixed(2)}`, tableX + tableW - 4, totalY + 5.5, { align: 'right' });

  // Amount in words & payment method
  const wordsY = totalY + 12;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('AMOUNT IN WORDS: ', tableX, wordsY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  const words = numberToWords(payment.amount);
  doc.text(words, tableX + 32, wordsY);

  // Payment Method and Reference
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  let methodStr = `Payment Mode: ${payment.payment_method}`;
  if (payment.transaction_reference) {
    methodStr += ` | Ref / UTR: ${payment.transaction_reference}`;
  }
  doc.text(methodStr, tableX, wordsY + 5);

  // Footer / Signatures
  const footerY = pageHeight - margin - 15;
  doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
  doc.line(tableX, footerY - 2, tableX + tableW, footerY - 2);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Thank you for choosing Arogya Dental Care. Keep this receipt for your records.', tableX, footerY + 4);
  doc.text('Computer generated receipt. Valid without physical seal.', tableX, footerY + 8);

  // Cashier / Receiver Signature line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  const collectorName = payment.collected_by_name || staffProfile?.full_name || 'Front Desk Cashier';
  doc.text(`Received By: ${collectorName}`, tableX + tableW - 4, footerY + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Authorized Signatory', tableX + tableW - 4, footerY + 8, { align: 'right' });

  return doc;
}

export function downloadMoneyReceiptPDF(
  payment: Payment,
  settings: ClinicSettings,
  staffProfile?: Profile
) {
  const doc = generateMoneyReceiptDoc(payment, settings, staffProfile);
  const filename = `Receipt_${payment.receipt_number}.pdf`;
  doc.save(filename);
}

export function printMoneyReceiptPDF(
  payment: Payment,
  settings: ClinicSettings,
  staffProfile?: Profile
) {
  const doc = generateMoneyReceiptDoc(payment, settings, staffProfile);
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  } else {
    downloadMoneyReceiptPDF(payment, settings, staffProfile);
  }
}


