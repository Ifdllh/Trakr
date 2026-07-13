import sys

with open('src/components/ui/Auth.tsx', 'r') as f:
    content = f.read()

old_button_dev = '''            <button
              type="button"
              onClick={() => handleGoogleLogin('dev')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <g transform="matrix(1, 0, 0, 1, 0, 0)">
                      <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.32 -0.03,-0.61 -0.07,-0.9z" fill="#4285F4" />
                      <path d="M12,20.7c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.32,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H1.37v2.66c1.49,2.96 4.54,4.81 8.01,4.81z" fill="#34A853" />
                      <path d="M6.97,13.23a5.55,5.55 0 0 1 0,-3.46V7.11H1.37a9.23,9.23 0 0 0 0,8.78l5.6,-2.66z" fill="#FBBC05" />
                      <path d="M12,6.13c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.42,2.7 12,2.7c-3.47,0 -6.52,1.85 -8.01,4.81l5.6,2.66c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                    </g>
                  </svg>
                  Masuk dengan Google {hasPrdConfig && "(Dev)"}
                </>
              )}
            </button>'''

new_button_dev = '''            {hasPrdConfig && (
              <div className="w-full flex flex-col gap-1.5 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Development (Sandbox)</span>
                <button
                  type="button"
                  onClick={() => handleGoogleLogin('dev')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 0, 0)">
                          <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.32 -0.03,-0.61 -0.07,-0.9z" fill="#4285F4" />
                          <path d="M12,20.7c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.32,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H1.37v2.66c1.49,2.96 4.54,4.81 8.01,4.81z" fill="#34A853" />
                          <path d="M6.97,13.23a5.55,5.55 0 0 1 0,-3.46V7.11H1.37a9.23,9.23 0 0 0 0,8.78l5.6,-2.66z" fill="#FBBC05" />
                          <path d="M12,6.13c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.42,2.7 12,2.7c-3.47,0 -6.52,1.85 -8.01,4.81l5.6,2.66c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                        </g>
                      </svg>
                      Masuk dengan Google (Dev)
                    </>
                  )}
                </button>
              </div>
            )}
            
            {!hasPrdConfig && (
              <button
                type="button"
                onClick={() => handleGoogleLogin('dev')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 0, 0)">
                        <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.32 -0.03,-0.61 -0.07,-0.9z" fill="#4285F4" />
                        <path d="M12,20.7c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.32,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H1.37v2.66c1.49,2.96 4.54,4.81 8.01,4.81z" fill="#34A853" />
                        <path d="M6.97,13.23a5.55,5.55 0 0 1 0,-3.46V7.11H1.37a9.23,9.23 0 0 0 0,8.78l5.6,-2.66z" fill="#FBBC05" />
                        <path d="M12,6.13c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.42,2.7 12,2.7c-3.47,0 -6.52,1.85 -8.01,4.81l5.6,2.66c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                      </g>
                    </svg>
                    Masuk dengan Google
                  </>
                )}
              </button>
            )}'''

content = content.replace(old_button_dev, new_button_dev)

old_button_prd = '''            {hasPrdConfig && (
              <button
                type="button"
                onClick={() => handleGoogleLogin('prd')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-sm font-bold text-indigo-700 transition-all disabled:opacity-50 cursor-pointer shadow-sm hover:shadow-md"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                      <g transform="matrix(1, 0, 0, 1, 0, 0)">
                        <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.32 -0.03,-0.61 -0.07,-0.9z" fill="#4285F4" />
                        <path d="M12,20.7c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.32,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H1.37v2.66c1.49,2.96 4.54,4.81 8.01,4.81z" fill="#34A853" />
                        <path d="M6.97,13.23a5.55,5.55 0 0 1 0,-3.46V7.11H1.37a9.23,9.23 0 0 0 0,8.78l5.6,-2.66z" fill="#FBBC05" />
                        <path d="M12,6.13c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.42,2.7 12,2.7c-3.47,0 -6.52,1.85 -8.01,4.81l5.6,2.66c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                      </g>
                    </svg>
                    Masuk dengan Google (Prod)
                  </>
                )}
              </button>
            )}'''

new_button_prd = '''            {hasPrdConfig && (
              <div className="w-full flex flex-col gap-1.5 mt-2">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider pl-1">Production (Live Data)</span>
                <button
                  type="button"
                  onClick={() => handleGoogleLogin('prd')}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-indigo-600 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="h-5 w-5 shrink-0 bg-white rounded-full p-[2px]" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 0, 0)">
                          <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47c0,-0.32 -0.03,-0.61 -0.07,-0.9z" fill="#4285F4" />
                          <path d="M12,20.7c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.32,0.98 -2.34,0 -4.33,-1.58 -5.03,-3.7H1.37v2.66c1.49,2.96 4.54,4.81 8.01,4.81z" fill="#34A853" />
                          <path d="M6.97,13.23a5.55,5.55 0 0 1 0,-3.46V7.11H1.37a9.23,9.23 0 0 0 0,8.78l5.6,-2.66z" fill="#FBBC05" />
                          <path d="M12,6.13c1.32,0 2.51,0.45 3.44,1.35l2.58,-2.58C16.46,3.48 14.42,2.7 12,2.7c-3.47,0 -6.52,1.85 -8.01,4.81l5.6,2.66c0.7,-2.12 2.69,-3.7 5.03,-3.7z" fill="#EA4335" />
                        </g>
                      </svg>
                      Masuk dengan Google
                    </>
                  )}
                </button>
              </div>
            )}'''

content = content.replace(old_button_prd, new_button_prd)

with open('src/components/ui/Auth.tsx', 'w') as f:
    f.write(content)

