export default function VisibilityBadge({ visibility }) {
  const isPublic = visibility === 'public'

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded ${
        isPublic ? 'bg-teal-600 text-white' : 'bg-gray-500 text-white'
      }`}
    >
      {isPublic ? 'Public' : 'Private'}
    </span>
  )
}
