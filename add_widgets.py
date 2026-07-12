import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

# Update visibleWidgets state
content = content.replace(
"""  // Widget visibility state
  const [visibleWidgets, setVisibleWidgets] = useState({
    cashflowStats: true,
    expenseDistribution: true,
    recentTransactions: true,
    projectFunds: true,
    goldSimulator: true
  });""",
"""  // Widget visibility state
  const [visibleWidgets, setVisibleWidgets] = useState({
    cashflowStats: true,
    expenseDistribution: true,
    upcomingBills: true,
    recentTransactions: true,
    projectFunds: true,
    goldSimulator: true
  });"""
)

# Insert static data and top 5 recent transactions inside the component
# e.g., right before formatting helpers
data_logic = """
  // Top 5 recent transactions
  const topRecentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Mock upcoming bills
  const upcomingBillsData = [
    { id: 'b1', name: 'Netflix Subscription', date: new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), amount: 186000, category: 'Hiburan' },
    { id: 'b2', name: 'Tagihan Listrik (PLN)', date: new Date(currentDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(), amount: 450000, category: 'Utilitas' },
    { id: 'b3', name: 'Spotify Premium', date: new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(), amount: 54900, category: 'Hiburan' },
  ];
"""

match = re.search(r'  // Format IDR Helper', content)
if match:
    content = content[:match.start()] + data_logic + content[match.start():]
else:
    print("Could not find Format IDR Helper")

# Now update the UI for Recent Transactions and Upcoming Bills

old_recent = """          {/* Widget: Recent Transactions */}
          {visibleWidgets.recentTransactions && (
            <div className="lg:col-span-12 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center min-h-[220px]">
              <div className="h-12 w-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
                <Calendar size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">Transaksi Terkini</h4>
              <p className="text-xs text-gray-500 max-w-[200px] mb-4">Lacak aktivitas transaksi terbaru Anda di sini.</p>
              <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer">
                Lihat Selengkapnya
              </button>
            </div>
          )}"""

new_recent = """          {/* Widget: Upcoming Bills */}
          {visibleWidgets.upcomingBills && (
            <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[280px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Tagihan Mendatang</h3>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">Pengeluaran rutin dalam 7 hari ke depan</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 flex-1">
                {upcomingBillsData.map((bill) => {
                  const billDate = new Date(bill.date);
                  const isToday = billDate.toDateString() === currentDate.toDateString();
                  
                  return (
                    <div key={bill.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-50 text-gray-500 rounded-xl flex flex-col items-center justify-center shrink-0 border border-gray-100">
                          <span className="text-[9px] font-bold uppercase">{MONTHS[billDate.getMonth()].label.substring(0, 3)}</span>
                          <span className="text-sm font-black text-slate-900 leading-none">{billDate.getDate()}</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{bill.name}</h4>
                          <span className="text-[10px] font-medium text-gray-400">{bill.category}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-black text-rose-600 tabular-nums">{formatIDR(bill.amount)}</span>
                        <button className="text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md transition-colors cursor-pointer opacity-0 group-hover:opacity-100 flex items-center gap-1">
                          <Check size={10} /> Tandai Dibayar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Widget: Recent Transactions */}
          {visibleWidgets.recentTransactions && (
            <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-[280px]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center">
                      <Repeat size={16} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Aktivitas Terkini</h3>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium">5 transaksi terakhir yang tercatat</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 flex-1">
                {topRecentTransactions.length > 0 ? (
                  topRecentTransactions.map((t) => {
                    const isIncome = t.type === 'pemasukan';
                    const isTransfer = t.type === 'transfer';
                    const Icon = isTransfer ? ArrowRightLeft : (isIncome ? TrendingUp : TrendingDown);
                    const colorClass = isTransfer ? "text-slate-500 bg-slate-50" : (isIncome ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50");
                    const amountColor = isTransfer ? "text-slate-800" : (isIncome ? "text-emerald-600" : "text-rose-600");
                    const prefix = isTransfer ? "" : (isIncome ? "+" : "-");
                    
                    return (
                      <div key={t.id} className="flex items-center justify-between pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                            <Icon size={14} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{t.description || t.category}</h4>
                            <span className="text-[10px] font-medium text-gray-400">{t.date}</span>
                          </div>
                        </div>
                        <span className={`text-xs font-black tabular-nums ${amountColor}`}>
                          {prefix}{formatIDR(t.amount)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="h-10 w-10 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mb-2">
                      <Search size={16} />
                    </div>
                    <span className="text-xs font-bold text-gray-400">Belum ada transaksi</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                <button 
                  onClick={() => setActiveTab('transactions')} 
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  Lihat Semua <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}"""

content = content.replace(old_recent, new_recent)

with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(content)
print("Updated widgets and data.")
