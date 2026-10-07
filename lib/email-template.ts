export type EmailRow = { label: string; value: string };
export type EmailSection = { title: string; rows: EmailRow[] };
export type OwnerEmail = {
  category: string;
  title: string;
  summary: string;
  reference: string;
  sections: EmailSection[];
  nextStep: string;
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function htmlLines(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function renderOwnerEmailText(email: OwnerEmail): string {
  return [
    "VEATH CRAFTED",
    email.title,
    email.summary,
    `Reference: ${email.reference}`,
    ...email.sections.flatMap((section) => [
      "",
      section.title.toUpperCase(),
      ...section.rows.map((row) => `${row.label}: ${row.value}`),
    ]),
    "",
    `NEXT STEP: ${email.nextStep}`,
    "",
    "Sent from veathcrafted.com",
  ].join("\n");
}

export function renderOwnerEmailHtml(email: OwnerEmail): string {
  const sections = email.sections.map((section) => `<tr><td style="padding:0 32px 26px">
    <h2 style="margin:0 0 10px;color:#173d46;font:600 16px Arial,Helvetica,sans-serif">${escapeHtml(section.title)}</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #dce5e0">${section.rows.map((row) => `<tr>
      <td style="width:33%;padding:11px 12px 11px 0;border-bottom:1px solid #e8eeeb;color:#61777b;font:13px/1.5 Arial,Helvetica,sans-serif;vertical-align:top">${escapeHtml(row.label)}</td>
      <td style="padding:11px 0;border-bottom:1px solid #e8eeeb;color:#18343c;font:14px/1.5 Arial,Helvetica,sans-serif;vertical-align:top;overflow-wrap:anywhere">${htmlLines(row.value)}</td>
    </tr>`).join("")}</table>
  </td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#f3f5f1;color:#18343c;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(email.summary)} · Reference ${escapeHtml(email.reference)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f5f1"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border:1px solid #dce5e0">
    <tr><td style="padding:24px 32px;background:#173d46;color:#fff;border-bottom:4px solid #e6c990">
      <div style="font:700 13px Arial,Helvetica,sans-serif;letter-spacing:2px">VEATH CRAFTED</div>
      <div style="margin-top:9px;color:#e6c990;font:700 11px Arial,Helvetica,sans-serif;letter-spacing:1.5px;text-transform:uppercase">${escapeHtml(email.category)}</div>
    </td></tr>
    <tr><td style="padding:30px 32px 24px">
      <h1 style="margin:0 0 10px;color:#173d46;font:normal 30px/1.2 Georgia,'Times New Roman',serif">${escapeHtml(email.title)}</h1>
      <p style="margin:0 0 17px;color:#526a70;font:14px/1.6 Arial,Helvetica,sans-serif">${escapeHtml(email.summary)}</p>
      <p style="margin:0;color:#61777b;font:12px/1.5 Arial,Helvetica,sans-serif">REFERENCE <strong style="color:#173d46;letter-spacing:.3px">${escapeHtml(email.reference)}</strong></p>
    </td></tr>
    ${sections}
    <tr><td style="padding:0 32px 30px"><div style="padding:16px 18px;background:#eaf1ee;border-left:3px solid #246a77">
      <strong style="display:block;margin-bottom:5px;color:#173d46;font:700 12px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:1px">Next step</strong>
      <span style="color:#304d54;font:14px/1.6 Arial,Helvetica,sans-serif">${htmlLines(email.nextStep)}</span>
    </div></td></tr>
    <tr><td style="padding:18px 32px;background:#f7f7f3;border-top:1px solid #dce5e0;color:#61777b;font:12px/1.5 Arial,Helvetica,sans-serif">Veath Crafted · Sent from veathcrafted.com</td></tr>
  </table></td></tr></table></body></html>`;
}
