const { google } = require('googleapis');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  // Credentials stored as a single env var: GOOGLE_SERVICE_ACCOUNT_JSON
  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch {
    return { statusCode: 500, body: 'Missing or invalid GOOGLE_SERVICE_ACCOUNT_JSON env var' };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const SHEET_ID = process.env.BIRTHDAY_SHEET_ID; // e.g. "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"

  if (!SHEET_ID) {
    return { statusCode: 500, body: 'Missing BIRTHDAY_SHEET_ID env var' };
  }

  // ── Build row ─────────────────────────────────────────────────────────────
  // Students come in as an array; flatten to a readable string
  const studentLines = (data.students || [])
    .map((s, i) => `${i + 1}. ${s.name || ''} (age ${s.age || '?'}) — Guardian: ${s.guardian || ''} | Waiver: ${s.waiver ? 'Y' : 'N'} | In: ${s.checkedIn ? 'Y' : 'N'}`)
    .join('\n');

  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });

  const row = [
    now,                                    // Submitted At
    data.partyDate || '',                   // Date of Party
    data.partyTime || '',                   // Time
    data.birthdayChild || '',               // Birthday Child
    data.leadGuardian || '',                // Lead Guardian
    data.partyPackage || '',                // Package
    data.addOn || '',                       // Add-On
    data.ageRange || '',                    // Age Range
    data.leadCoach || '',                   // Lead Coach
    data.closingCoach || '',                // Closing Coach
    data.characterCoach || '',             // Character Coach
    data.bdayDateTime || '',               // Birthday Date & Time
    data.waiverStatus || '',               // Waiver Status
    data.hatsStatus || '',                 // 17Hats Status
    data.memberCredit || '',               // Member Credit
    data.studentsBooked || '',             // # Students Booked
    data.waiversSigned || '',              // # Waivers Signed
    data.coachCount || '',                 // # Coaches
    data.gamesToPlay || '',                // Games
    data.parentRequests || '',             // Parent Requests
    data.specialRequests || '',            // Special Requests
    data.addNotes || '',                   // Notes
    data.packagePrice || '',               // Package Price
    data.addOnPrice || '',                 // Add-On Price
    data.depositPaid || '',                // Deposit Paid
    data.remainingBalance || '',           // Remaining Balance
    data.totalPaidToday || '',             // Total Paid Today
    data.cardOnFile || '',                 // Card on File
    data.tipPerCoach || '',                // Tip Per Coach
    data.tipTotal || '',                   // Total Tip
    data.sigGuardian || '',                // Guardian Sig
    data.sigLiaison || '',                 // Liaison Sig
    studentLines,                          // Student List (full detail)
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'birthdays!A1',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('Sheets write error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
