import { useCallback, useEffect, useRef, useState } from 'react'
import '@mediapipe/pose'
import '@mediapipe/camera_utils'
import { useLook } from '../hooks/useLook.js'
import { readMirrorTopPath } from '../lib/mirrorTopStorage.js'

/** Blaze Pose landmark indices */
const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12

const POSE_FILES_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/'

const SMOOTH_ALPHA = 0.22
const WIDTH_SCALE = 1.5

/** Nudge garment down from shoulder line (fraction of drawn height) */
const TORSO_OFFSET_RATIO = 0.14

function lerp(a, b, t) {
  return a + (b - a) * t
}

export default function TryOn() {
  const { selectedLook, virtualMirrorTopPath } = useLook()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const smoothRef = useRef({ cx: null, cy: null, drawW: null })
  const [topImageReady, setTopImageReady] = useState(false)
  const [poseReady, setPoseReady] = useState(false)

  const topUrl =
    virtualMirrorTopPath ??
    readMirrorTopPath() ??
    selectedLook?.top?.imagePath

  const pipelineReady = topImageReady && poseReady

  useEffect(() => {
    smoothRef.current = { cx: null, cy: null, drawW: null }
  }, [topUrl])

  useEffect(() => {
    if (!topUrl) {
      setTopImageReady(false)
      setPoseReady(false)
      return
    }

    setTopImageReady(false)
    setPoseReady(false)

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const PoseCtor = globalThis.Pose
    const CameraCtor = globalThis.Camera
    if (!PoseCtor || !CameraCtor) {
      console.error('MediaPipe Pose or Camera not loaded on window')
      setPoseReady(true)
      return
    }

    const topImg = new Image()
    topImg.crossOrigin = 'anonymous'
    topImg.decoding = 'async'

    const onTopLoad = () => setTopImageReady(true)
    const onTopError = () => setTopImageReady(true)
    topImg.addEventListener('load', onTopLoad)
    topImg.addEventListener('error', onTopError)
    topImg.src = topUrl
    if (topImg.complete && topImg.naturalWidth > 0) setTopImageReady(true)

    const pose = new PoseCtor({
      locateFile: (file) => `${POSE_FILES_BASE}${file}`,
    })

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    let cancelled = false

    pose.onResults((results) => {
      if (cancelled) return
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
      const canDraw =
        ls &&
        rs &&
        visOk(ls) &&
        visOk(rs) &&
        topImg.complete &&
        topImg.naturalWidth > 0

      if (!canDraw) return

      ctx.clearRect(0, 0, w, h)

      const lx = ls.x * w
      const ly = ls.y * h
      const rx = rs.x * w
      const ry = rs.y * h

      const midX = (lx + rx) / 2
      const midY = (ly + ry) / 2
      const shoulderWidth = Math.hypot(rx - lx, ry - ly)
      const targetDrawW = Math.max(shoulderWidth * WIDTH_SCALE, 12)

      const s = smoothRef.current
      if (s.cx == null || s.cy == null || s.drawW == null) {
        s.cx = midX
        s.cy = midY
        s.drawW = targetDrawW
      } else {
        s.cx = lerp(s.cx, midX, SMOOTH_ALPHA)
        s.cy = lerp(s.cy, midY, SMOOTH_ALPHA)
        s.drawW = lerp(s.drawW, targetDrawW, SMOOTH_ALPHA)
      }

      const iw = topImg.naturalWidth
      const ih = topImg.naturalHeight
      const drawW = s.drawW
      const drawH = (ih / iw) * drawW

      // Horizontally centered between shoulders; vertical offset onto torso
      const destX = s.cx - drawW / 2
      const destY = s.cy + drawH * TORSO_OFFSET_RATIO

      ctx.drawImage(topImg, destX, destY, drawW, drawH)
    })

    const camera = new CameraCtor(video, {
      onFrame: async () => {
        if (cancelled) return
        await pose.send({ image: video })
      },
      width: 1280,
      height: 720,
      facingMode: 'user',
    })

    ;(async () => {
      try {
        await pose.initialize()
      } catch (e) {
        console.error('Pose initialize failed', e)
      } finally {
        if (!cancelled) setPoseReady(true)
      }
      if (!cancelled) camera.start()
    })()

    return () => {
      cancelled = true
      topImg.removeEventListener('load', onTopLoad)
      topImg.removeEventListener('error', onTopError)
      camera.stop()
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
                      src={item.imagePath}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="relative min-h-[min(100svh,100dvh)] w-full flex-1 overflow-hidden bg-black md:min-h-[70svh]">
            {!pipelineReady ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 border border-black bg-white text-black">
                <p className="text-sm uppercase tracking-[0.35em]">
                  LOADING...
                </p>
                <p className="max-w-xs px-6 text-center text-[10px] uppercase tracking-widest">
                  INITIALIZING POSE MODEL AND TOP ASSET
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
              disabled={!pipelineReady}
              className="w-full rounded-none border border-black bg-white py-3 text-xs uppercase tracking-widest transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed md:max-w-xs"
            >
              CAPTURE
            </button>
            <p className="mt-3 max-w-xl text-[9px] uppercase tracking-widest">
              LANDMARKS 11–12 · WIDTH × {WIDTH_SCALE} · CENTERED ON SHOULDER MID
              · TORSO OFFSET {Math.round(TORSO_OFFSET_RATIO * 100)}% · LERP
            </p>
          </footer>
        </div>
      )}
    </div>
  )
}
