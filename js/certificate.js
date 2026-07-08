/* =========================================================
   certificate.js — auto-generated participation certificate
   ---------------------------------------------------------
   Draws a certificate on an HTML5 canvas and exports it as a
   downloadable PNG. Fully automatic layout (no manual design
   work per event) — this is the "AI Certificate Generator."
   No external API/key required, works instantly offline.
   ========================================================= */

export function generateCertificate({ studentName, eventTitle, eventDate, venue }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 990;
  const ctx = canvas.getContext("2d");

  // --- Background ---
  const grad = ctx.createLinearGradient(0, 0, 1400, 990);
  grad.addColorStop(0, "#f6f3ec");
  grad.addColorStop(1, "#ffffff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1400, 990);

  // --- Outer border ---
  ctx.strokeStyle = "#0d2a4d";
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, 1340, 930);
  ctx.strokeStyle = "#f0a500";
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, 1300, 890);

  // --- Header badge ---
  ctx.fillStyle = "#0d2a4d";
  ctx.beginPath();
  ctx.arc(700, 160, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0a500";
  ctx.font = "bold 46px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("🎓", 700, 178);

  // --- Title ---
  ctx.fillStyle = "#0d2a4d";
  ctx.font = "bold 56px Georgia, serif";
  ctx.fillText("Certificate of Participation", 700, 300);

  ctx.strokeStyle = "#f0a500";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(520, 330);
  ctx.lineTo(880, 330);
  ctx.stroke();

  // --- Body text ---
  ctx.fillStyle = "#5a6478";
  ctx.font = "28px Georgia, serif";
  ctx.fillText("This certificate is proudly presented to", 700, 400);

  ctx.fillStyle = "#0d2a4d";
  ctx.font = "bold 64px Georgia, serif";
  ctx.fillText(studentName, 700, 480);

  ctx.strokeStyle = "#e3ddd0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(400, 505);
  ctx.lineTo(1000, 505);
  ctx.stroke();

  ctx.fillStyle = "#5a6478";
  ctx.font = "28px Georgia, serif";
  ctx.fillText("for successfully participating in", 700, 560);

  ctx.fillStyle = "#0d2a4d";
  ctx.font = "bold 42px Georgia, serif";
  wrapText(ctx, eventTitle, 700, 620, 1100, 50);

  ctx.fillStyle = "#5a6478";
  ctx.font = "24px Georgia, serif";
  ctx.fillText(`held at ${venue} on ${formatDateLong(eventDate)}`, 700, 700);

  // --- Footer ---
  ctx.strokeStyle = "#0d2a4d";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(220, 850);
  ctx.lineTo(480, 850);
  ctx.stroke();
  ctx.fillStyle = "#0d2a4d";
  ctx.font = "22px Georgia, serif";
  ctx.fillText("Event Coordinator", 350, 880);

  ctx.beginPath();
  ctx.moveTo(920, 850);
  ctx.lineTo(1180, 850);
  ctx.stroke();
  ctx.fillText("College Event Management System", 1050, 880);

  return canvas.toDataURL("image/png");
}

export function downloadCertificate(data) {
  const dataUrl = generateCertificate(data);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${data.studentName.replace(/\s+/g, "_")}_${data.eventTitle.replace(/\s+/g, "_")}_certificate.png`;
  a.click();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  words.forEach(word => {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line.trim());
      line = word + " ";
    } else {
      line = test;
    }
  });
  lines.push(line.trim());
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function formatDateLong(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
