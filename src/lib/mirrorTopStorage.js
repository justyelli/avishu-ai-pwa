export const MIRROR_TOP_PATH_KEY = 'avishu_mirror_top_path'

export function readMirrorTopPath() {
  try {
    return localStorage.getItem(MIRROR_TOP_PATH_KEY)
  } catch {
    return null
  }
}

export function writeMirrorTopPath(path) {
  try {
    if (path) {
      localStorage.setItem(MIRROR_TOP_PATH_KEY, path)
    } else {
      localStorage.removeItem(MIRROR_TOP_PATH_KEY)
    }
  } catch {
    /* ignore quota / private mode */
  }
}
