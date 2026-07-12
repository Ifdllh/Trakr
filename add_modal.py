with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

modal_content = """
      {/* MODAL: CUSTOMIZE DASHBOARD */}
      {showCustomizeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Sesuaikan Dasbor</h4>
                  <p className="text-[10px] text-gray-400">Pilih widget yang ingin ditampilkan</p>
                </div>
              </div>
              <button onClick={() => setShowCustomizeModal(false)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              {Object.entries(visibleWidgets).map(([key, isVisible]) => (
                <label key={key} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <span className="text-sm font-bold text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => setVisibleWidgets(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>

            <button
              onClick={() => setShowCustomizeModal(false)}
              className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      )}
"""

content = content.replace("{/* ================= MODALS & POPUPS ================= */}", "{/* ================= MODALS & POPUPS ================= */}" + modal_content)

with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(content)
print("Successfully added customize modal.")
