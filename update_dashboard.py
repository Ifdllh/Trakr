import re

with open('src/features/reports/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add dashboardPeriod state
state_match = re.search(r'  const \[selectedYear, setSelectedYear\] = useState<number>\(currentDate\.getFullYear\(\)\);', content)
if state_match:
    content = content[:state_match.end()] + "\n  const [dashboardPeriod, setDashboardPeriod] = useState<'current_month' | 'last_month' | 'this_year'>('current_month');" + content[state_match.end():]

# Now we need to remove the Dynamic Nav Tabs and replace it with Timeframe Filter Segmented Control.
# Let's find the header block where tabs are.
old_tabs = """        {/* Dynamic Nav Tabs within the Dashboard */}
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 xl:border-none pb-2 xl:pb-0">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2 text-xs font-bold transition-all text-indigo-700 bg-indigo-50/50 rounded-xl"
          >
            Ringkasan
          </button>
          <button 
            onClick={() => setShowWalletModal(true)}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
          >
            Dompet
          </button>
          <button 
            onClick={() => setShowAnalyticsModal(true)}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
          >
            Analisis
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
          >
            Transaksi
          </button>
          <button 
            onClick={() => setShowChatModal(true)}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
          >
            Konsultasi AI
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
          >
            Kategori
          </button>
        </div>"""

new_filter = """        {/* Timeframe Filter (Segmented Control) */}
        <div className="flex flex-wrap items-center gap-1 bg-gray-50/50 p-1 rounded-2xl border border-gray-100">
          <button 
            onClick={() => setDashboardPeriod('current_month')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${dashboardPeriod === 'current_month' ? 'text-indigo-700 bg-white shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            Bulan Ini
          </button>
          <button 
            onClick={() => setDashboardPeriod('last_month')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${dashboardPeriod === 'last_month' ? 'text-indigo-700 bg-white shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            Bulan Lalu
          </button>
          <button 
            onClick={() => setDashboardPeriod('this_year')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${dashboardPeriod === 'this_year' ? 'text-indigo-700 bg-white shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            Tahun Ini
          </button>
          <button className="px-3 py-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center border-l border-gray-200 ml-1 pl-4">
            <Calendar size={14} />
          </button>
        </div>"""

content = content.replace(old_tabs, new_filter)

with open('src/features/reports/Dashboard.tsx', 'w') as f:
    f.write(content)
print("Updated successfully.")
