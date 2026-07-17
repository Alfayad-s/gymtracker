'use client'

interface RepPickerProps {
  value: number
  onChange: (val: number) => void
  label?: string
}

export function RepPicker({ value, onChange, label = 'Reps' }: RepPickerProps) {
  const handleStep = (step: number) => {
    const newVal = Math.max(0, value + step)
    onChange(newVal)
  }

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-muted border border-border rounded-[18px] w-full">
      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{label}</span>
      <div className="flex items-center gap-2 w-full justify-between">
        <button
          type="button"
          onClick={() => handleStep(-5)}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-xs text-destructive active:scale-90 transition-transform cursor-pointer"
        >
          -5
        </button>
        <button
          type="button"
          onClick={() => handleStep(-1)}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-xs text-destructive/80 active:scale-90 transition-transform cursor-pointer"
        >
          -1
        </button>
        
        <input
          type="number"
          value={value === 0 ? '' : value}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10)
            onChange(isNaN(val) ? 0 : val)
          }}
          placeholder="0"
          className="w-14 h-10 bg-transparent text-center text-base font-bold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-border focus:border-primary"
        />

        <button
          type="button"
          onClick={() => handleStep(1)}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-xs text-primary/80 active:scale-90 transition-transform cursor-pointer"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => handleStep(5)}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-xs text-primary active:scale-90 transition-transform cursor-pointer"
        >
          +5
        </button>
      </div>
    </div>
  )
}
