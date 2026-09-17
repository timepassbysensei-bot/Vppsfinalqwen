export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-sm">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mb-4"></div>
      <p className="text-cadet font-medium">{message}</p>
    </div>
  )
}
