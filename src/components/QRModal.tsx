'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRModalProps {
  inviteCode: string
  groupName: string
  onClose: () => void
}

export default function QRModal({ inviteCode, groupName, onClose }: QRModalProps) {
  const url = `${window.location.origin}/join/${inviteCode}`

  const handleDownload = () => {
    const svg = document.getElementById('qr-svg')
    if (!svg) return
    const serializer = new XMLSerializer()
    const svgStr = serializer.serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 400, 480)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 50, 50, 300, 300)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(groupName, 200, 400)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px Inter, sans-serif'
      ctx.fillText('Scan to join on Junta', 200, 430)
      const a = document.createElement('a')
      a.download = `junta-${groupName.toLowerCase().replace(/\s+/g, '-')}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgStr)
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm border border-slate-700/50 p-6 flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Share Group</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4">
          <QRCodeSVG
            id="qr-svg"
            value={url}
            size={220}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
          />
        </div>

        <div className="text-center">
          <p className="text-white font-medium">{groupName}</p>
          <p className="text-slate-400 text-sm mt-1">Anyone with this QR can join</p>
        </div>

        <div className="w-full flex gap-3">
          <button
            onClick={() => { navigator.clipboard.writeText(url) }}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
          >
            Copy Link
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Save Image
          </button>
        </div>
      </div>
    </div>
  )
}
