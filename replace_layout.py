import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

# Define the new content
new_layout = """      {/* 1. Static Hero Section (Top): 3 Main Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Total Kekayaan Bersih (Net Worth) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Kekayaan Bersih</span>
              <div className="flex items-baseline gap-0.5 tabular-nums">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{balanceParts.main}</span>
                <span className="text-sm font-bold text-gray-400">{balanceParts.cents}</span>
              </div>
            </div>
            <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-3">
            <button onClick={() => onOpenForm('pemasukan')} className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <TrendingUp size={14} /> Pemasukan
            </button>
            <button onClick={() => onOpenForm('pengeluaran')} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer">
              <TrendingDown size={14} /> Pengeluaran
            </button>
          </div>
        </div>

        {/* Card 2: Arus Kas (Income vs Expense) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Arus Kas Bulanan</span>
              <div className="flex items-baseline mt-1 gap-0.5 tabular-nums">
                <span className="text-2xl font-black text-emerald-600 tracking-tight">{monthlyIncomeParts.main}</span>
                <span className="text-xs font-bold text-emerald-400">{monthlyIncomeParts.cents}</span>
              </div>
              <div className="flex items-baseline gap-0.5 tabular-nums">
                <span className="text-xl font-bold text-rose-500 tracking-tight">-{monthlyExpenseParts.main}</span>
                <span className="text-[10px] font-bold text-rose-300">{monthlyExpenseParts.cents}</span>
              </div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <Target size={20} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50">
            <div className="text-xs text-gray-500 font-medium">Sisa dana: <span className="font-bold text-slate-800">{formatIDR(finalDisplayIncome - finalDisplayExpense)}</span></div>
          </div>
        </div>

        {/* Card 3: Peringatan Anggaran (Budget Warning) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between min-h-[180px]">
          <div className="flex justify-between items-start mb-2">
             <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Peringatan Anggaran</span>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {formatIDR(totalExpense)} / {formatIDR(monthlyBudget)}
              </div>
             </div>
             <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
          {monthlyBudget > 0 ? (
            <div className="mt-auto">
              <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                <span className={budgetPercentage >= 90 ? "text-red-600" : "text-indigo-600"}>
                  {budgetPercentage >= 90 ? "Kritis" : "Aman"}
                </span>
                <span className="text-gray-400">{budgetPercentage}% Terpakai</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${budgetPercentage}%` }}
                  className={`h-full transition-all duration-500 rounded-full ${
                    budgetPercentage >= 90 
                      ? 'bg-red-600' 
                      : budgetPercentage >= 75 
                        ? 'bg-amber-500' 
                        : 'bg-indigo-600'
                  }`}
                />
              </div>
            </div>
          ) : (
            <div className="mt-auto text-xs text-gray-400 font-medium pb-2">
              Belum ada target anggaran.
            </div>
          )}
        </div>
      </div>

      {/* 2. Toggleable Widget Section (Middle/Bottom) */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Widget Dasbor</h3>
          <button 
            onClick={() => setShowCustomizeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
          >
            <Settings2 size={14} /> Sesuaikan Dasbor
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Widget: Cashflow Stats */}
          {visibleWidgets.cashflowStats && (
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                    📈 Statistik Arus Kas
                  </h3>
                  <p className="text-xs text-gray-400">Kurva perbandingan arus kas bulanan secara riil</p>
                </div>
                
                {/* Controls Row */}
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-xs text-gray-500 font-bold mr-3">Pemasukan</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" />
                  <span className="text-xs text-gray-500 font-bold mr-3">Pengeluaran</span>
                  
                  {/* Month Selector Dropdown */}
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-gray-200 bg-white rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Area Chart with smooth curvas */}
              <div className="h-[280px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartIncomeColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="chartExpenseColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="tanggal" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} 
                    />
                    <Tooltip 
                      formatter={(value) => [formatIDR(value as number), '']}
                      labelFormatter={(label) => `Periode: ${label}`}
                      contentStyle={{ borderRadius: '16px', borderColor: '#f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                    />
                    <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#chartIncomeColor)" />
                    <Area type="monotone" dataKey="Pengeluaran" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#chartExpenseColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Widget: Expense Distribution */}
          {visibleWidgets.expenseDistribution && (
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Semua Pengeluaran</h3>
                <p className="text-xs text-gray-400">Berdasarkan kategori bulan ini</p>
              </div>
              
              {/* Concentric Circle SVG Chart */}
              <div className="h-[180px] flex items-center justify-center relative my-2">
                <svg className="w-40 h-40 transform -rotate-90">
                  {expenseCategoriesBreakdown.map((item, idx) => {
                    const radius = 64 - idx * 13;
                    const strokeWidth = 8;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (Math.min(item.percentage, 100) / 100) * circumference;
                    return (
                      <g key={idx}>
                        <circle cx="80" cy="80" r={radius} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="transparent" />
                        <circle cx="80" cy="80" r={radius} stroke={item.color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                      </g>
                    );
                  })}
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                  <span className="text-sm font-black text-slate-900">{formatIDR(totalExpense)}</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-3 mt-2">
                {expenseCategoriesBreakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-gray-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-gray-400 font-medium">{formatIDR(item.amount)}</span>
                      <span className="font-extrabold text-slate-900 w-8 text-right">{Math.round(item.percentage)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Widget: Recent Transactions */}
          {visibleWidgets.recentTransactions && (
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center min-h-[220px]">
              <div className="h-12 w-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
                <Calendar size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Transaksi Terkini</h4>
              <p className="text-xs text-gray-500 max-w-[200px] mb-4">Lacak aktivitas transaksi terbaru Anda di sini.</p>
              <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer">
                Lihat Selengkapnya
              </button>
            </div>
          )}

          {/* Widget: Project Funds Monitor */}
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
          )}

          {/* Widget: Gold/Asset Spread Simulator */}
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
          )}
        </div>
      </div>"""

# Replace the section
start_marker = "{/* 2. Top Metrics Grid Row (My Balance, Monthly Income, Monthly Expense) */}"
end_marker = "{/* ================= MODALS & POPUPS ================= */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_layout + "\n\n      " + content[end_idx:]
    with open('src/features/reports/Dashboard.tsx', 'w') as f:
        f.write(new_content)
    print("Successfully replaced layout section.")
else:
    print(f"Could not find markers. start: {start_idx}, end: {end_idx}")

