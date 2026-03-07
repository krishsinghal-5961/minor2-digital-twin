import { AlertTriangle } from 'lucide-react'
export default function ConfidenceNote({ note }) {
  if (!note) return null
  return (
    <div className="flex items-start gap-3 bg-risk-medium/5 border border-risk-medium/20 rounded-xl px-4 py-3 mb-6">
      <AlertTriangle size={15} className="text-risk-medium mt-0.5 shrink-0" />
      <p className="text-risk-medium/80 text-sm font-body">{note}</p>
    </div>
  )
}
