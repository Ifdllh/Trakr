import re

with open('src/hooks/useAppData.ts', 'r') as f:
    data = f.read()

data = data.replace(
    "showToast(err?.message || 'Gagal menyinkronkan data dari server', 'error');",
    """if (err?.message?.includes('Quota') || err?.message?.includes('429')) {
        showToast('Batas penggunaan database harian tercapai. Silakan coba lagi besok.', 'error');
      } else {
        showToast(err?.message || 'Gagal menyinkronkan data dari server', 'error');
      }"""
)

with open('src/hooks/useAppData.ts', 'w') as f:
    f.write(data)

print("Done")
