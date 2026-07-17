'use client'

interface WeightPickerProps {
  value: string
  onChange: (val: string) => void
  label?: string
}

export function WeightPicker({ value, onChange, label = 'Weight' }: WeightPickerProps) {
  const currentVal = parseFloat(value) || 0

  const handleStep = (step: number) => {
    const newVal = Math.max(0, currentVal + step)
    // Round to 2 decimal places to avoid floating point precision issues
    onChange(Number(newVal.toFixed(2)).toString())
  }

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-muted border border-border rounded-[18px] w-full">
      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
        {label} <span className="normal-case tracking-normal opacity-70">(kg)</span>
      </span>
      <div className="flex items-center gap-2 w-full justify-between">
        <button
          type="button"
          onClick={() => handleStep(-2.5)}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-xs text-destructive active:scale-90 transition-transform cursor-pointer"
        >
          -2.5
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
          step="0.5"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-14 h-10 bg-transparent text-center text-base font-bold text-foreground focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-border focus:border-primary"
        />
        <span className="sr-only">kg</span>

        <button
          type="button"
          onClick={() => handleStep(1)}
          className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-xs text-primary/80 active:scale-90 transition-transform cursor-pointer"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => handleStep(2.5)}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-xs text-primary active:scale-90 transition-transform cursor-pointer"
        >
          +2.5
        </button>
      </div>
    </div>
  )
}
