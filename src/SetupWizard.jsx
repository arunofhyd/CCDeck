import React, { useState } from 'react';
import { ShieldCheck, ChevronRight, Check, Loader2, Copy, ExternalLink, Settings } from 'lucide-react';
import ProfileMenu from './ProfileMenu';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function SetupWizard({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleExtractId = () => {
    setError('');
    // Regex to match Google Sheets ID
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      setSheetId(match[1]);
      setStep(2);
    } else {
      setError("Could not extract Sheet ID. Please ensure you pasted the full Google Sheets URL.");
    }
  };

  const handleSaveWebAppUrl = async () => {
    if (!webAppUrl.startsWith('https://script.google.com/macros/s/')) {
      setError("Invalid Web App URL. It should start with 'https://script.google.com/macros/s/'.");
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      // Use Promise.race to prevent getting stuck if Firestore hangs
      const savePromise = setDoc(doc(db, "users", user.uid), {
        appScriptUrl: webAppUrl
      }, { merge: true });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout saving to database")), 5000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      localStorage.setItem('ccdeck_appScriptUrl', webAppUrl); // Fallback storage
      onComplete(webAppUrl);
    } catch (err) {
      console.warn("Firestore save failed, falling back to local storage:", err);
      // Fallback: Even if Firestore fails, allow the user to proceed locally
      localStorage.setItem('ccdeck_appScriptUrl', webAppUrl);
      onComplete(webAppUrl);
    } finally {
      setIsSaving(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appScriptCode = `// ccdeck Apps Script Integration
const SPREADSHEET_ID = "${sheetId}";

function syncTransactions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];

  // Create headers if empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['date', 'merchant', 'amount', 'card']);
  }

  // Search for recent transaction emails (adjust query as needed)
  const threads = GmailApp.search('subject:"transaction" OR subject:"payment" OR subject:"spent" in:inbox newer_than:7d');

  // Get existing dates to avoid duplicates (basic check)
  const existingData = sheet.getDataRange().getValues();
  const existingDates = new Set(existingData.map(row => row[0].toString()));

  let newRows = [];

  for (let thread of threads) {
    const messages = thread.getMessages();
    for (let msg of messages) {
      const body = msg.getPlainBody();
      const dateStr = msg.getDate().toISOString();

      if (existingDates.has(dateStr)) continue;

      // Basic extraction logic (needs tailoring to your specific bank emails)
      let amountMatch = body.match(/(?:Rs\.?|INR)\s*([\\d,]+\\.?\\d*)/i);
      let cardMatch = body.match(/(?:ending in|card no\.?)\s*x{0,4}(\\d{4})/i);
      let merchantMatch = body.match(/at\\s+(.*?)\\s+(?:on|for)/i) || body.match(/info:\\s*(.*?)\\s*\\n/i);

      if (amountMatch && cardMatch) {
        const amount = amountMatch[1].replace(/,/g, '');
        const card = cardMatch[1];
        const merchant = merchantMatch ? merchantMatch[1].trim() : 'Unknown Merchant';

        newRows.push([dateStr, merchant, amount, card]);
        existingDates.add(dateStr);
      }
    }
  }

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
  }
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // Check if it's a portfolio/settings update
    if (data.card === 'GLOBAL_PORTFOLIO' || data.limit !== undefined) {
      const settingsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Settings") ||
                           SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet("Settings");

      let found = false;
      const dataRange = settingsSheet.getDataRange().getValues();
      for (let i = 0; i < dataRange.length; i++) {
        if (dataRange[i][0] == data.card) {
           settingsSheet.getRange(i+1, 2).setValue(JSON.stringify(data));
           found = true;
           break;
        }
      }
      if (!found) {
        settingsSheet.appendRow([data.card, JSON.stringify(data)]);
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success", type: "settings"})).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({status: "ignored"})).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Trigger sync on load
  try {
    syncTransactions();
  } catch(e) {
    // Ignore sync errors to still return data
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const mainSheet = ss.getSheets()[0];
    const dataRange = mainSheet.getDataRange().getValues();

    // Assuming headers: date, merchant, amount, card
    const headers = dataRange[0].map(h => h.toString().toLowerCase());
    const dateIdx = headers.indexOf('date');
    const merchantIdx = headers.indexOf('merchant');
    const amountIdx = headers.indexOf('amount');
    const cardIdx = headers.indexOf('card');

    let transactions = [];
    if (dateIdx > -1 && merchantIdx > -1 && amountIdx > -1 && cardIdx > -1) {
      for (let i = 1; i < dataRange.length; i++) {
        let row = dataRange[i];
        if (row[dateIdx] && row[amountIdx]) {
           transactions.push({
             date: row[dateIdx],
             merchant: row[merchantIdx],
             amount: row[amountIdx],
             card: String(row[cardIdx])
           });
        }
      }
    }

    let settingsObj = {};
    const settingsSheet = ss.getSheetByName("Settings");
    if (settingsSheet) {
       const sData = settingsSheet.getDataRange().getValues();
       for(let i=0; i<sData.length; i++){
          if(sData[i][0] && sData[i][1]){
             try {
               settingsObj[sData[i][0]] = JSON.parse(sData[i][1]);
             } catch(e) {}
          }
       }
    }

    return ContentService.createTextOutput(JSON.stringify({
      transactions: transactions,
      settings: settingsObj
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// Ensure CORS headers are handled
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  return ContentService.createTextOutput("").setHeaders(headers);
}`;

  return (
    <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30 relative overflow-hidden text-white">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,_#312e81_0%,_transparent_50%)] opacity-40"></div>

      <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[3rem] w-full max-w-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="absolute top-6 right-6">
          <ProfileMenu user={user} />
        </div>

        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg mb-6">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1 uppercase">Database Setup</h1>
          <p className="text-[9px] font-bold text-indigo-400 tracking-[0.3em] uppercase">Connect Google Sheets</p>
        </div>

        <div className="flex justify-between items-center mb-10 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-white/10 -z-10"></div>
          {[1, 2, 3].map((num) => (
            <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-colors ${
              step > num ? 'bg-indigo-600 border-indigo-600 text-white' :
              step === num ? 'bg-[#0c1017] border-indigo-500 text-indigo-400' :
              'bg-[#0c1017] border-white/10 text-gray-600'
            }`}>
              {step > num ? <Check size={16} /> : num}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold text-center">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter mb-4 text-indigo-400">1. Create a Google Sheet</h3>
              <ol className="list-decimal list-inside space-y-3 text-sm text-gray-300 font-medium">
                <li>Go to <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">Google Sheets <ExternalLink size={12}/></a> and create a new Blank spreadsheet.</li>
                <li>In the first row, create exactly these 4 column headers: <br/><code className="bg-white/10 px-2 py-1 rounded text-white font-mono text-xs ml-5 mt-2 inline-block">date | merchant | amount | card</code></li>
                <li>Copy the full URL of your new Google Sheet from the address bar.</li>
              </ol>
            </div>

            <div className="pt-4">
              <label className="block text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Paste Google Sheet URL</label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1A2B3C4D5E6F7G8H9I0J..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white font-black outline-none text-xs placeholder:text-gray-600 focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <button
              onClick={handleExtractId}
              disabled={!sheetUrl}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-7 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg text-xs uppercase tracking-widest mt-4"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter mb-4 text-indigo-400">2. Add Apps Script Code</h3>
              <ol className="list-decimal list-inside space-y-3 text-sm text-gray-300 font-medium">
                <li>In your Google Sheet, click <strong>Extensions &gt; Apps Script</strong>.</li>
                <li>Delete any code in the editor and <strong>paste the code below</strong>.</li>
                <li>Click the Save icon (💾) or press Ctrl+S/Cmd+S.</li>
              </ol>
            </div>

            <div className="relative group">
              <div className="absolute right-4 top-4 z-20">
                <button
                  onClick={copyCode}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                >
                  {copied ? <Check size={14} className="text-emerald-400"/> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <pre className="bg-[#0c1017] border border-white/10 rounded-2xl p-6 text-[10px] sm:text-xs text-gray-300 font-mono overflow-x-auto h-64 relative">
                <code>{appScriptCode}</code>
              </pre>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setStep(1)} className="flex-1 bg-white/5 hover:bg-white/10 text-white px-7 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-white/10">Back</button>
              <button onClick={() => setStep(3)} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg text-xs uppercase tracking-widest">Next Step <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter mb-4 text-indigo-400">3. Deploy Web App</h3>
              <ol className="list-decimal list-inside space-y-3 text-sm text-gray-300 font-medium">
                <li>In Apps Script, click the blue <strong>Deploy</strong> button (top right) &gt; <strong>New deployment</strong>.</li>
                <li>Click the gear icon next to "Select type" and choose <strong>Web app</strong>.</li>
                <li>Set "Execute as" to <strong>Me</strong>.</li>
                <li>Set "Who has access" to <strong>Anyone</strong>.</li>
                <li>Click <strong>Deploy</strong>. <em>(You may need to "Review permissions" &gt; choose your account &gt; Advanced &gt; Go to project)</em>.</li>
                <li>Copy the <strong>Web app URL</strong> provided.</li>
              </ol>
            </div>

            <div className="pt-4">
              <label className="block text-[9px] font-black text-gray-500 uppercase mb-3 tracking-widest">Paste Web App URL</label>
              <input
                type="text"
                placeholder="https://script.google.com/macros/s/AKfycb..."
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white font-black outline-none text-xs placeholder:text-gray-600 focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setStep(2)} disabled={isSaving} className="flex-1 bg-white/5 hover:bg-white/10 text-white px-7 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-white/10">Back</button>
              <button
                onClick={handleSaveWebAppUrl}
                disabled={!webAppUrl || isSaving}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-7 py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-lg text-xs uppercase tracking-widest"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16}/> Finish Setup</>}
              </button>
            </div>
          </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 10px; }`}} />
    </div>
  );
}