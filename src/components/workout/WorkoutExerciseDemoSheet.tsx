'use client'

import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { ExerciseVideoPreview } from '@/components/exercises/ExerciseVideoPreview'

type WorkoutExerciseDemoSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  exerciseName: string
  videoUrl: string
}

export function WorkoutExerciseDemoSheet({
  open,
  onOpenChange,
  exerciseName,
  videoUrl,
}: WorkoutExerciseDemoSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[90] mx-auto flex w-full flex-col rounded-t-[28px] border border-border bg-background outline-none sm:max-w-[430px]"
          style={{ height: '96dvh', maxHeight: '96dvh' }}
        >
          <Drawer.Handle className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted" />

          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-2 pb-3 border-b border-border/50">
            <div className="min-w-0">
              <Drawer.Title className="text-base font-bold text-foreground tracking-tight truncate">
                {exerciseName}
              </Drawer.Title>
              <Drawer.Description className="text-[11px] text-muted-foreground">
                Demo video
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-border bg-card p-2 text-muted-foreground cursor-pointer active:scale-95"
              aria-label="Close demo video"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 bg-black">
            <ExerciseVideoPreview
              url={videoUrl}
              title={`${exerciseName} demo`}
              controls
              autoPlay
              className="h-full"
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
