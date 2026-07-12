import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add states for the gold simulator at the top of Dashboard
state_insertion = """
  // Gold Simulator State
  const [goldGrams, setGoldGrams] = useState<number>(10);
  const [goldBuyPrice, setGoldBuyPrice] = useState<number>(1400000);
  const [goldSellPrice, setGoldSellPrice] = useState<number>(1350000);
"""

# Insert state after "const [showCustomizeModal, setShowCustomizeModal] = useState(false);"
match_state = re.search(r'const \[showCustomizeModal, setShowCustomizeModal\] = useState\(false\);', content)
if match_state:
    content = content[:match_state.end()] + state_insertion + content[match_state.end():]

# Now let's replace the widgets
old_project_funds = """          {/* Widget: Project Funds Monitor */}
          {visibleWidgets.projectFunds && (
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center min-h-[220px]">
              <div className="h-12 w-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                <Target size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Project Funds Monitor</h4>
              <p className="text-xs text-gray-500 max-w-[200px] mb-4">Pantau dana khusus proyek atau tujuan finansial Anda.</p>
              <button className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer">
                Atur Proyek
              </button>
            </div>
          )}"""

old_gold_simulator = """          {/* Widget: Gold/Asset Spread Simulator */}
          {visibleWidgets.goldSimulator && (
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center min-h-[220px]">
              <div className="h-12 w-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3">
                <Award size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Gold/Asset Spread Simulator</h4>
              <p className="text-xs text-gray-500 max-w-[200px] mb-4">Simulasikan sebaran aset dan emas Anda.</p>
              <button className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer">
                Buka Simulator
              </button>
            </div>
          )}"""

new_project_funds = """          {/* Widget: Project Funds Monitor */}
          {visibleWidgets.projectFunds && (
            <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[280px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Target size={16} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Project Funds Monitor</h3>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Distribusi dana operasional proyek</p>
                </div>
                <button className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer border border-gray-200">
                  Kelola Proyek
                </button>
              </div>

              <div className="flex items-center justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Dana Dialokasikan</span>
                    <div className="text-xl font-black text-slate-900 tabular-nums tracking-tight">Rp 50.000.000</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Sisa Dana Distribusi</span>
                    <div className="text-xl font-black text-emerald-600 tabular-nums tracking-tight">Rp 12.500.000</div>
                  </div>
                </div>

                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                    <circle 
                      cx="56" cy="56" r="48" 
                      stroke="#3b82f6" 
                      strokeWidth="12" 
                      fill="transparent" 
                      strokeDasharray="301.59" 
                      strokeDashoffset="75.39" /* 75% utilized */
                      strokeLinecap="round" 
                      className="transition-all duration-1000 ease-out" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-900">75%</span>
                    <span className="text-[10px] font-bold text-gray-400">Terpakai</span>
                  </div>
                </div>
              </div>
            </div>
          )}"""

new_gold_simulator = """          {/* Widget: Gold/Asset Spread Simulator */}
          {visibleWidgets.goldSimulator && (
            <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between min-h-[280px]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                      <Award size={16} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Simulasi Sebaran Emas</h3>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Kalkulasi nilai emas berdasarkan harga Antam terkini</p>
                </div>
                {/* Sparkline mini-chart placeholder using SVG */}
                <div className="h-8 w-24 flex items-end">
                  <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                    <path d="M0,25 Q10,15 20,20 T40,10 T60,15 T80,5 T100,0" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="100" cy="0" r="3" fill="#f59e0b" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1 tracking-wider">Gram</span>
                  <input 
                    type="number" 
                    value={goldGrams} 
                    onChange={(e) => setGoldGrams(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1 tracking-wider">Harga Beli (/g)</span>
                  <input 
                    type="number" 
                    value={goldBuyPrice} 
                    onChange={(e) => setGoldBuyPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold text-emerald-600 outline-none"
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1 tracking-wider">Harga Jual (/g)</span>
                  <input 
                    type="number" 
                    value={goldSellPrice} 
                    onChange={(e) => setGoldSellPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold text-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Estimasi Nilai Jual (Buyback)</span>
                  <div className="text-xl font-black text-slate-900 tabular-nums tracking-tight">
                    {formatIDR(goldGrams * goldSellPrice)}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Spread (Selisih)</span>
                  <div className="text-sm font-bold text-rose-500 tabular-nums">
                    -{formatIDR(goldGrams * (goldBuyPrice - goldSellPrice))}
                  </div>
                </div>
              </div>
            </div>
          )}"""

content = content.replace(old_project_funds, new_project_funds)
content = content.replace(old_gold_simulator, new_gold_simulator)

# Let's also adjust the "recentTransactions" span if needed, but it was 4, I can change it to 12.
content = content.replace(
    """<div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center min-h-[220px]">
              <div className="h-12 w-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
                <Calendar size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Transaksi Terkini</h4>""",
    """<div className="lg:col-span-12 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center min-h-[220px]">
              <div className="h-12 w-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
                <Calendar size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Transaksi Terkini</h4>"""
)

with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(content)
print("Replaced widgets.")

