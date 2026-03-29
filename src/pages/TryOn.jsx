import { useCallback, useEffect, useRef, useState } from 'react'
import '@mediapipe/pose'
import { resolveClothingAssetUrl } from '../data/wardrobe.js'
import { useLook } from '../hooks/useLook.js'
import { readMirrorTopPath } from '../lib/mirrorTopStorage.js'

const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12

const SMOOTH_ALPHA = 0.22
const LANDMARK_SMOOTH = 0.3
const WIDTH_SCALE = 1.5
const TORSO_OFFSET_RATIO = 0.14

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function TryOn() {
  const { selectedLook, virtualMirrorTopPath } = useLook()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const smoothRef = useRef({ cx: null, cy: null, drawW: null })
  const landmarkSmoothRef = useRef({
    nlx: null,
    nly: null,
    nrx: null,
    nry: null,
  })
  const garmentLoadedRef = useRef(false)
  const firstPoseDoneRef = useRef(false)
  const mirrorSessionRef = useRef(0)
  const [hasFirstPoseResults, setHasFirstPoseResults] = useState(false)

  const rawTopSource =
    virtualMirrorTopPath ??
    readMirrorTopPath() ??
    selectedLook?.top?.imagePath
  const topUrl = resolveClothingAssetUrl(rawTopSource)

  useEffect(() => {
    smoothRef.current = { cx: null, cy: null, drawW: null }
    landmarkSmoothRef.current = { nlx: null, nly: null, nrx: null, nry: null }
    garmentLoadedRef.current = false
    firstPoseDoneRef.current = false
    const session = ++mirrorSessionRef.current
    requestAnimationFrame(() => {
      if (mirrorSessionRef.current === session) {
        setHasFirstPoseResults(false)
      }
    })
  }, [topUrl])

  useEffect(() => {
    if (!topUrl) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')

    const PoseCtor = globalThis.Pose
    if (!PoseCtor) {
      console.error('[TryOn] MediaPipe Pose not available on window')
      return
    }

    const topImg = new Image()
    topImg.crossOrigin = 'anonymous'
    topImg.decoding = 'async'
    const onGarmentLoad = () => {
      garmentLoadedRef.current = true
    }
    const onGarmentError = () => {
      garmentLoadedRef.current = false
    }
    topImg.addEventListener('load', onGarmentLoad)
    topImg.addEventListener('error', onGarmentError)
    topImg.src = topUrl
    if (topImg.complete && topImg.naturalWidth > 0) {
      garmentLoadedRef.current = true
    }

    const pose = new PoseCtor({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    let cancelled = false
    let rafId = 0
    let mediaStream = null

    pose.onResults((results) => {
      if (cancelled) return

      if (results.poseLandmarks?.length && !firstPoseDoneRef.current) {
        firstPoseDoneRef.current = true
        setHasFirstPoseResults(true)
      }

      const ctx = canvas.getContext('2d')
      if (!ctx || !video.videoWidth || !video.videoHeight) return

      const w = video.videoWidth
      const h = video.videoHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const lm = results.poseLandmarks
      const ls = lm?.[LEFT_SHOULDER]
      const rs = lm?.[RIGHT_SHOULDER]
      const visOk = (v) => (v?.visibility ?? 1) > 0.25

      if (!ls || !rs || !visOk(ls) || !visOk(rs)) {
        return
      }

      const S = landmarkSmoothRef.current
      const nlx = ls.x
      const nly = ls.y
      const nrx = rs.x
      const nry = rs.y
      if (S.nlx == null) {
        S.nlx = nlx
        S.nly = nly
        S.nrx = nrx
        S.nry = nry
      } else {
        S.nlx = lerp(S.nlx, nlx, LANDMARK_SMOOTH)
        S.nly = lerp(S.nly, nly, LANDMARK_SMOOTH)
        S.nrx = lerp(S.nrx, nrx, LANDMARK_SMOOTH)
        S.nry = lerp(S.nry, nry, LANDMARK_SMOOTH)
      }

      const lx = S.nlx * w
      const ly = S.nly * h
      const rx = S.nrx * w
      const ry = S.nry * h

      const midX = (lx + rx) / 2
      const midY = (ly + ry) / 2
      const shoulderWidth = Math.hypot(rx - lx, ry - ly)
      const targetDrawW = Math.max(shoulderWidth * WIDTH_SCALE, 12)

      const g = smoothRef.current
      if (g.cx == null || g.cy == null || g.drawW == null) {
        g.cx = midX
        g.cy = midY
        g.drawW = targetDrawW
      } else {
        g.cx = lerp(g.cx, midX, SMOOTH_ALPHA)
        g.cy = lerp(g.cy, midY, SMOOTH_ALPHA)
        g.drawW = lerp(g.drawW, targetDrawW, SMOOTH_ALPHA)
      }

      ctx.clearRect(0, 0, w, h)

      const drawW = g.drawW
      const canDrawGarment =
        garmentLoadedRef.current &&
        topImg.complete &&
        topImg.naturalWidth > 0

      if (canDrawGarment) {
        const iw = topImg.naturalWidth
        const ih = topImg.naturalHeight
        const drawH = (ih / iw) * drawW
        const destX = g.cx - drawW / 2
        const destY = g.cy + drawH * TORSO_OFFSET_RATIO
        ctx.drawImage(topImg, destX, destY, drawW, drawH)
      } else {
        const side = drawW
        const destX = g.cx - side / 2
        const destY = g.cy + side * TORSO_OFFSET_RATIO - side / 2
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = Math.max(2, w / 200)
        ctx.strokeRect(destX, destY, side, side)
      }
    })

    const runFrameLoop = () => {
      if (cancelled) return
      rafId = requestAnimationFrame(async () => {
        if (cancelled) return
        try {
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            await pose.send({ image: video })
          }
        } catch (err) {
          console.error('[TryOn] pose.send failed', err)
        }
        runFrameLoop()
      })
    }

    ;(async () => {
      try {
        await pose.initialize()
      } catch (e) {
        console.error('[TryOn] Pose.initialize failed', e)
      }
      if (cancelled) return

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      } catch (e) {
        console.error('[TryOn] Camera start failed', e)
        return
      }
      if (cancelled) {
        mediaStream.getTracks().forEach((t) => t.stop())
        return
      }

      video.srcObject = mediaStream

      try {
        await video.play()
      } catch (e) {
        console.error('[TryOn] video.play failed', e)
      }

      if (!cancelled) runFrameLoop()
    })()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      topImg.removeEventListener('load', onGarmentLoad)
      topImg.removeEventListener('error', onGarmentError)
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop())
      }
      video.srcObject = null
      pose.close()
    }
  }, [topUrl])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    const overlay = canvasRef.current
    if (!video?.videoWidth || !overlay?.width) return

    const vw = video.videoWidth
    const vh = video.videoHeight
    const out = document.createElement('canvas')
    out.width = vw
    out.height = vh
    const octx = out.getContext('2d')
    if (!octx) return

    octx.translate(vw, 0)
    octx.scale(-1, 1)
    octx.drawImage(video, 0, 0, vw, vh)
    octx.drawImage(overlay, 0, 0, vw, vh)

    out.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `avishu-capture-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [])

  return (
    <div className="flex min-h-full flex-1 flex-col rounded-none border border-black bg-white text-black">
      <header className="shrink-0 border-b border-black px-4 py-3 md:px-6">
        <h2 className="text-xs uppercase tracking-widest">Virtual mirror</h2>
        {selectedLook ? (
          <p className="mt-1 text-[10px] uppercase tracking-widest">
            {selectedLook.vibe.toUpperCase()} — {selectedLook.top.name}
          </p>
        ) : topUrl ? (
          <p className="mt-1 text-[10px] uppercase tracking-widest">
            SELECTED TOP (CONTEXT / STORAGE)
          </p>
        ) : null}
      </header>

      {!topUrl ? (
        <div className="p-6 md:p-10">
          <p className="max-w-md border border-black p-4 text-xs uppercase tracking-widest">
            NO TOP SELECTED. USE OUTFIT GENERATOR — VIRTUAL TRY-ON.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {selectedLook ? (
            <div className="grid shrink-0 grid-cols-3 gap-px border-b border-black bg-black">
              {[
                { label: 'Top', item: selectedLook.top },
                { label: 'Bottom', item: selectedLook.bottom },
                { label: 'Shoes', item: selectedLook.shoes },
              ].map(({ label, item }) => (
                <article
                  key={item.id}
                  className="flex flex-col bg-white p-3"
                >
                  <p className="mb-2 text-[9px] uppercase tracking-widest">
                    {label}
                  </p>
                  <div className="flex h-20 items-center justify-center border border-black bg-white">
                    <img
                      src={resolveClothingAssetUrl(item.imagePath)}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="relative min-h-[min(100svh,100dvh)] w-full flex-1 overflow-hidden bg-black md:min-h-[70svh]">
            {!hasFirstPoseResults ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 border border-black bg-white text-black">
                <p className="text-sm uppercase tracking-[0.35em]">
                  LOADING AI MODEL
                </p>
                <p className="max-w-xs px-6 text-center text-[10px] uppercase tracking-widest">
                  CAMERA + POSE — STAND IN FRAME
                </p>
              </div>
            ) : null}

            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: 'scaleX(-1)' }}
            >
              <div className="relative max-h-full max-w-full">
                <video
                  ref={videoRef}
                  className="block max-h-full max-w-full rounded-none"
                  playsInline
                  muted
                  autoPlay
                  loop
                />
                <canvas
                  ref={canvasRef}
                  className="pointer-events-none absolute left-0 top-0 h-full w-full rounded-none"
                />
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-black bg-white p-4 md:px-6">
            <button
              type="button"
              onClick={handleCapture}
              disabled={!hasFirstPoseResults}
              className="w-full rounded-none border border-black bg-white py-3 text-xs uppercase tracking-widest transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed md:max-w-xs"
            >
              CAPTURE
            </button>
            <p className="mt-3 max-w-xl text-[9px] uppercase tracking-widest">
              LANDMARKS 11–12 · WIDTH × {WIDTH_SCALE} · SMOOTHED · PLACEHOLDER
              IF NO GARMENT
            </p>
          </footer>
        </div>
      )}
    </div>
  )
}
