import { THEME_IDS, THEME_LABELS, type ThemeId } from '../../lib/theme'

type ThemeSwatchPickerProps = {
  value: ThemeId
  onChange: (themeId: ThemeId) => void
  label?: string
  idPrefix?: string
}

/**
 * Compact theme swatch row. Selected state uses brand border tokens.
 */
export default function ThemeSwatchPicker({
  value,
  onChange,
  label = 'Theme',
  idPrefix = 'theme',
}: ThemeSwatchPickerProps) {
  return (
    <div>
      <p className="block text-gray-700 font-semibold mb-2 text-sm sm:text-base" id={`${idPrefix}-label`}>
        {label}
      </p>
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        role="radiogroup"
        aria-labelledby={`${idPrefix}-label`}
      >
        {THEME_IDS.map((id) => {
          const selected = value === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`${idPrefix}-swatch-${id}`}
              onClick={() => onChange(id)}
              className={`flex flex-col items-stretch gap-1.5 p-2 rounded-xl border-2 transition text-left ${
                selected
                  ? 'mingo-border-brand mingo-surface-brand-tint shadow-sm'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span
                data-theme={id}
                className="mingo-shell h-8 sm:h-10 rounded-lg shadow-inner"
                aria-hidden="true"
              />
              <span className={`text-xs sm:text-sm font-semibold ${selected ? 'mingo-text-brand' : 'text-gray-700'}`}>
                {THEME_LABELS[id]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
