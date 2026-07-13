import fs from 'fs';

let code = fs.readFileSync('src/components/ui/Auth.tsx', 'utf8');

code = code.replace(
  /const \[restrictedError, setRestrictedError\] = useState\(false\);/,
  `const [restrictedError, setRestrictedError] = useState(false);\n  const [domainError, setDomainError] = useState(false);`
);

code = code.replace(
  /setRestrictedError\(false\);/,
  `setRestrictedError(false);\n    setDomainError(false);`
);

code = code.replace(
  /if \(err\.code === 'auth\/admin-restricted-operation' \|\| err\.message\?\.includes\('admin-restricted-operation'\)\) \{/,
  `if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setDomainError(true);
        setLoading(false);
        return;
      }
      if (err.code === 'auth/admin-restricted-operation' || err.message?.includes('admin-restricted-operation')) {`
);

const domainErrorJSX = `
          {domainError ? (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col gap-2 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="text-xs font-bold text-amber-900">Domain Belum Diizinkan</h3>
                  <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                    Sistem Firebase memblokir login dari domain ini karena belum didaftarkan.
                  </p>
                </div>
              </div>
              <div className="bg-white/60 p-3 rounded-lg border border-amber-100/50 mt-1 text-[11px] text-slate-700 leading-relaxed space-y-1">
                <p className="font-semibold text-slate-850">Cara Mengaktifkan di Firebase Console:</p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>Buka <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">Firebase Console</a>.</li>
                  <li>Masuk ke menu <strong className="text-slate-800">Authentication</strong> &gt; <strong className="text-slate-800">Settings</strong>.</li>
                  <li>Di bawah tab <strong className="text-slate-800">Authorized domains</strong>, klik <strong className="text-indigo-600">Add domain</strong>.</li>
                  <li>Masukkan domain saat ini: <strong className="text-slate-800">{window.location.hostname}</strong></li>
                </ol>
              </div>
            </div>
          ) : restrictedError ? (
`;

code = code.replace(
  /\{restrictedError \? \(/,
  domainErrorJSX
);

fs.writeFileSync('src/components/ui/Auth.tsx', code);
