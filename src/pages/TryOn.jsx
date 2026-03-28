import { useEffect, useRef } from 'react'
import '@mediapipe/pose'
import '@mediapipe/camera_utils'
import { useLook } from '../hooks/useLook.js'

/** MediaPipe Pose landmark indices (blaze pose). */
const LEFT_SHOULDER = 11
const RIGHT_SHOULDER = 12

const POSE_FILES_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/'

export default function TryOn() {
  const { selectedLook } = useLook()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const topUrl = selectedLook?.top?.placeholder_image_url

  useEffect(() => {
    if (!topUrl) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const PoseCtor = globalThis.Pose
    const CameraCtor = globalThis.Camera
    if (!PoseCtor || !CameraCtor) {
      console.error('MediaPipe Pose or Camera not loaded on window')
      return
    }

    const topImg = new Image()
    topImg.crossOrigin = 'anonymous'
    topImg.decoding = 'async'
    topImg.src = topUrl

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

      ctx.clearRect(0, 0, w, h)

      const lm = results.poseLandmarks
      if (!lm) return

      const ls = lm[LEFT_SHOULDER]
      const rs = lm[RIGHT_SHOULDER]
      if (!ls || !rs) return

      const visOk = (v) => (v?.visibility ?? 1) > 0.25
      if (!visOk(ls) || !visOk(rs)) return

      if (!topImg.complete || topImg.naturalWidth === 0) return

      const lx = ls.x * w
      const ly = ls.y * h
      const rx = rs.x * w
      const ry = rs.y * h

      const cx = (lx + rx) / 2
      const cy = (ly + ry) / 2
      const shoulderWidth = Math.hypot(rx - lx, ry - ly)

      const iw = topImg.naturalWidth
      const ih = topImg.naturalHeight
      const drawW = Math.max(shoulderWidth, 8)
      const drawH = (ih / iw) * drawW

      ctx.drawImage(topImg, cx - drawW / 2, cy - drawH / 2, drawW, drawH)
    })

    const camera = new CameraCtor(video, {
      onFrame: async () => {
        if (cancelled) return
        await pose.send({ image: video })
      },
      width: 1280,
      height: 720,
    })

    camera.start()

    return () => {
      cancelled = true
      camera.stop()
      pose.close()
    }
  }, [topUrl])

  return (
    <div className="flex min-h-full flex-1 flex-col border border-black bg-white p-6 md:p-10">
      <h2 className="mb-6 text-sm">Camera View</h2>

      {!selectedLook ? (
        <p className="max-w-md border border-black p-4 text-xs uppercase tracking-widest">
          No look saved yet. Use Outfit Generator and choose &quot;TRY THIS
          LOOK&quot;.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest">
              Saved look — {selectedLook.vibe.toUpperCase()}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-black/70">
              Top: {selectedLook.top.name}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px border border-black bg-black md:grid-cols-3">
            {[
              { label: 'Top', item: selectedLook.top },
              { label: 'Bottom', item: selectedLook.bottom },
              { label: 'Shoes', item: selectedLook.shoes },
            ].map(({ label, item }) => (
              <article
                key={item.id}
                className="flex flex-col bg-white p-4"
              >
                <p className="mb-2 text-[10px] uppercase tracking-widest text-black/70">
                  {label}
                </p>
                <div className="aspect-[3/4] w-full overflow-hidden border border-black">
                  <img
                    src={item.placeholder_image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <h3 className="mt-2 text-xs uppercase tracking-widest leading-snug">
                  {item.name}
                </h3>
              </article>
            ))}
          </div>

          <div>
            <h3 className="mb-3 text-xs uppercase tracking-widest">
              Virtual try-on
            </h3>
            <div
              className="relative inline-block max-w-full overflow-hidden border border-black bg-black"
              style={{ transform: 'scaleX(-1)' }}
            >
              <video
                ref={videoRef}
                className="block max-h-[min(70vh,720px)] w-full max-w-full bg-black"
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute left-0 top-0 h-full w-full"
              />
            </div>
            <p className="mt-2 max-w-md text-[10px] uppercase tracking-widest text-black/60">
              Allow camera access. Overlay tracks shoulders (11–12) and scales
              your selected top to shoulder width.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
