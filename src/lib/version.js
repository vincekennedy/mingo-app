/* global __VERCEL_ENV__, __COMMIT_HASH__, __APP_VERSION__ */
/** App version string for UI chip and feedback reports (Vite-injected globals). */
export function getVersion() {
  const vercelEnv = typeof __VERCEL_ENV__ !== 'undefined' ? __VERCEL_ENV__ : (import.meta.env.MODE === 'development' ? 'development' : 'production')
  const commitHash = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : import.meta.env.VITE_APP_VERSION || '0.0.0'

  if (import.meta.env.MODE === 'development') {
    return commitHash.substring(0, 5)
  } else if (vercelEnv === 'preview') {
    return `${appVersion}+${commitHash.substring(0, 5)}`
  } else {
    return appVersion
  }
}
