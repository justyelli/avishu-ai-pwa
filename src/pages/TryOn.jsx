import { useCallback, useEffect, useRef, useState } from 'react'
import '@mediapipe/pose'
import {
  buildGoogleImageSearchUrl,
  buildLookSearchQuery,
  buildPinterestSearchUrl,
  resolveClothingAssetUrl,
} from '../data/wardrobe.js'
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

function openDiscovery(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function TryOn() {
  const { selectedLook, virtualMirrorTopPath } = useLook()
  const hiddenVideoRef = useRef(null)
  const displayVideoRef = useRef(null)
  const canvasRef = useRef(null)
  const poseRef = useRef(null)
  const streamRef = useRef(null)
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

  const [mediaStream, setMediaStream] = useState(null)
  const [hasValidShoulderPose, setHasValidShoulderPose] = useState(false)

  const rawTopSource =
    virtualMirrorTopPath ??
    readMirrorTopPath() ??
    selectedLook?.top?.imagePath
  const topUrl = resolveClothingAssetUrl(rawTopSource)
  const lookQuery = selectedLook ? buildLookSearchQuery(selectedLook) : ''

  useEffect(() => {
    smoothRef.current = { cx: null, cy: null, drawW: null }
    landmarkSmoothRef.current = { nlx: null, nly: null, nrx: null, nry: null }
    garmentLoadedRef.current = false
    firstPoseDoneRef.current = false
    const session = ++mirrorSessionRef.current
    requestAnimationFrame(() => {
      if (mirrorSessionRef.current === session) {
        setHasValidShoulderPose(false)
      }
    })
  }, [topUrl])

  useEffect(() => {
    if (!topUrl) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      requestAnimationFrame(() => {
        setMediaStream(null)
      })
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const PoseCtor = globalThis.Pose
    if (!PoseCtor) {
      console.error('[TryOn] MediaPipe Pose not available')
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

    poseRef.current = pose

    let cancelled = false

    pose.onResults((results) => {
      if (cancelled) return

      const hidden = hiddenVideoRef.current
      const ctx = canvas.getContext('2d')
      if (!hidden?.videoWidth || !hidden?.videoHeight || !ctx) return

      const w = hidden.videoWidth
      const h = hidden.videoHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      const lm = results.poseLandmarks
      const ls = lm?.[LEFT_SHOULDER]
      const rs = lm?.[RIGHT_SHOULDER]
      const visOk = (v) => (v?.visibility ?? 1) > 0.25
      const shouldersValid = ls && rs && visOk(ls) && visOk(rs)

      if (shouldersValid && !firstPoseDoneRef.current) {
        firstPoseDoneRef.current = true
        setHasValidShoulderPose(true)
      }

      if (!shouldersValid) {
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

    ;(async () => {
      try {
        await pose.initialize()
      } catch (e) {
        console.error('[TryOn] Pose.initialize failed', e)
      }
      if (cancelled) return

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setMediaStream(stream)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        alert(`[AVISHU] Camera could not start: ${msg}`)
        console.error('[TryOn] getUserMedia failed', e)
      }
    })()

    return () => {
      cancelled = true
      topImg.removeEventListener('load', onGarmentLoad)
      topImg.removeEventListener('error', onGarmentError)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setMediaStream(null)
      pose.close()
      poseRef.current = null
    }
  }, [topUrl])

  useEffect(() => {
    const hidden = hiddenVideoRef.current
    const display = displayVideoRef.current
    if (!mediaStream) {
      if (hidden) hidden.srcObject = null
      if (display) display.srcObject = null
      return
    }
    hidden?.setAttribute('playsinline', '')
    hidden?.setAttribute('webkit-playsinline', '')
    display?.setAttribute('playsinline', '')
    display?.setAttribute('webkit-playsinline', '')
    if (hidden) hidden.srcObject = mediaStream
    if (display) display.srcObject = mediaStream
    hidden?.play().catch((e) => {
      const msg = e instanceof Error ? e.message : String(e)
      alert(`[AVISHU] Camera playback failed: ${msg}`)
      console.error('[TryOn] hidden video.play', e)
    })
    display?.play().catch((e) => {
      const msg = e instanceof Error ? e.message : String(e)
      alert(`[AVISHU] Camera playback failed: ${msg}`)
      console.error('[TryOn] display video.play', e)
    })
  }, [mediaStream])

  useEffect(() => {
    if (!topUrl || !mediaStream) return
    const pose = poseRef.current
    const hidden = hiddenVideoRef.current
    if (!pose || !hidden) return

    let cancelled = false
    let rafId = 0

    const loop = () => {
      if (cancelled) return
      rafId = requestAnimationFrame(async () => {
        if (cancelled) return
        try {
          if (hidden.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            await pose.send({ image: hidden })
          }
        } catch (err) {
          console.error('[TryOn] pose.send failed', err)
        }
        loop()
      })
    }
    loop()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [topUrl, mediaStream])

  const handleCapture = useCallback(() => {
    const hidden = hiddenVideoRef.current
    const overlay = canvasRef.current
    if (!hidden?.videoWidth || !overlay?.width) return

    const vw = hidden.videoWidth
    const vh = hidden.videoHeight
    const out = document.createElement('canvas')
    out.width = vw
    out.height = vh
    const octx = out.getContext('2d')
    if (!octx) return

    octx.translate(vw, 0)
    octx.scale(-1, 1)
    octx.drawImage(hidden, 0, 0, vw, vh)
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
            <>
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
              <div className="flex flex-wrap gap-px border-b border-black bg-black p-px">
                <button
                  type="button"
                  onClick={() =>
                    openDiscovery(buildPinterestSearchUrl(lookQuery))
                  }
                  className="min-h-[44px] flex-1 rounded-none border border-black bg-white px-3 py-2 text-[9px] uppercase tracking-widest text-black hover:bg-black hover:text-white md:min-w-0"
                >
                  Find on Pinterest
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openDiscovery(buildGoogleImageSearchUrl(lookQuery))
                  }
                  className="min-h-[44px] flex-1 rounded-none border border-black bg-white px-3 py-2 text-[9px] uppercase tracking-widest text-black hover:bg-black hover:text-white md:min-w-0"
                >
                  Google Lens
                </button>
              </div>
            </>
          ) : null}

          <video
            ref={hiddenVideoRef}
            className="rounded-none"
            style={{ display: 'none' }}
            autoPlay
            playsInline
            muted
            aria-hidden
          />

          <div className="relative min-h-[min(100svh,100dvh)] w-full flex-1 overflow-hidden bg-black md:min-h-[70svh]">
            {!hasValidShoulderPose ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 border border-black bg-white p-6 text-black">
                <p className="text-center text-xs uppercase tracking-[0.25em]">
                  AI MODEL INITIALIZING (10-15S)...
                </p>
                <p className="max-w-xs text-center text-[10px] uppercase tracking-widest">
                  ALLOW CAMERA · STAND IN FRAME · SHOULDERS VISIBLE
                </p>
              </div>
            ) : null}

            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: 'scaleX(-1)' }}
            >
              <div className="relative max-h-full max-w-full">
                <video
                  ref={displayVideoRef}
                  className="block max-h-full max-w-full rounded-none"
                  autoPlay
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

          <footer className="shrink-0 space-y-3 border-t border-black bg-white p-4 md:px-6">
            <button
              type="button"
              onClick={handleCapture}
              disabled={!hasValidShoulderPose}
              className="w-full rounded-none border border-black bg-white py-3 text-xs uppercase tracking-widest transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed md:max-w-xs"
            >
              CAPTURE
            </button>
            <p className="max-w-xl text-[9px] uppercase tracking-widest">
              LANDMARKS 11–12 · WIDTH × {WIDTH_SCALE} · VITE ASSETS · IOS CAMERA
            </p>
          </footer>
        </div>
      )}
    </div>
  )
}
