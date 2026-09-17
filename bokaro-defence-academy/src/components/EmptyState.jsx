import { Inbox } from 'lucide-react'

export default function EmptyState({ title = 'No data available', description = '', action = null }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
      <Inbox className="h-16 w-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-navy mb-2">{title}</h3>
      {description && <p className="text-cadet text-sm text-center mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
