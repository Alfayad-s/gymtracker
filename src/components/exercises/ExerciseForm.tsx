'use client'

import { useMemo, useState } from 'react'
import {
  DEFAULT_EXERCISE_IMAGE,
  EQUIPMENT_OPTIONS,
  getMuscleGroupDefaults,
  type CreateExerciseInput,
  type ExerciseDifficulty,
} from '@/data/exercises'
import { Button } from '@/components/ui/button'
import { ExerciseMediaFields } from '@/components/exercises/ExerciseMediaFields'
import { useMuscleGroups } from '@/hooks/useMuscleGroups'

type ExerciseFormProps = {
  initial?: Partial<CreateExerciseInput>
  submitLabel: string
  onSubmit: (input: CreateExerciseInput) => void
  onCancel: () => void
  /** Stable key for Cloudinary public ids when editing an existing exercise */
  exerciseKey?: string
}

const DIFFICULTIES: ExerciseDifficulty[] = ['beginner', 'intermediate', 'advanced']

export function ExerciseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  exerciseKey,
}: ExerciseFormProps) {
  const muscleGroups = useMuscleGroups()
  const [name, setName] = useState(initial?.name ?? '')
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscleGroup ?? 'Chest')
  const [target, setTarget] = useState(initial?.target ?? '')
  const [equipment, setEquipment] = useState(initial?.equipment ?? 'Barbell')
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>(
    initial?.difficulty ?? 'beginner'
  )
  const [instructionsText, setInstructionsText] = useState(
    initial?.instructions?.join('\n') ?? ''
  )
  const [secondaryText, setSecondaryText] = useState(initial?.secondary?.join(', ') ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? DEFAULT_EXERCISE_IMAGE)
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '')

  const selectedGroup = useMemo(
    () => muscleGroups.find((group) => group.name === muscleGroup),
    [muscleGroups, muscleGroup]
  )
  const anatomyBaseGroup = selectedGroup?.anatomyBaseGroup ?? 'Full Body'
  const defaultTarget = getMuscleGroupDefaults(anatomyBaseGroup).target

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const instructions = instructionsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const secondary = secondaryText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    onSubmit({
      name: name.trim(),
      muscleGroup,
      anatomyBaseGroup,
      target: target.trim() || defaultTarget,
      equipment,
      difficulty,
      instructions,
      secondary,
      imageUrl,
      ...(videoUrl.trim() ? { videoUrl: videoUrl.trim() } : { videoUrl: '' }),
    })
  }

  const inputClass =
    'w-full h-12 bg-muted border border-border rounded-[16px] px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Exercise name *
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cable Fly"
          className={inputClass}
          required
        />
      </div>

      <ExerciseMediaFields
        imageUrl={imageUrl}
        videoUrl={videoUrl}
        exerciseKey={exerciseKey}
        onImageUrlChange={setImageUrl}
        onVideoUrlChange={setVideoUrl}
      />

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Muscle group
        </label>
        <select
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          className={inputClass}
        >
          {muscleGroups.map((group) => (
            <option key={group.id ?? group.name} value={group.name}>
              {group.name}{group.isCustom ? ' (Custom)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Target muscle
        </label>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder={defaultTarget}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Equipment
          </label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className={inputClass}
          >
            {EQUIPMENT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as ExerciseDifficulty)}
            className={inputClass}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Secondary muscles
        </label>
        <input
          value={secondaryText}
          onChange={(e) => setSecondaryText(e.target.value)}
          placeholder="Triceps, Front Delts (comma separated)"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Instructions
        </label>
        <textarea
          value={instructionsText}
          onChange={(e) => setInstructionsText(e.target.value)}
          placeholder="One step per line&#10;Keep core tight&#10;Control the negative"
          rows={5}
          className="w-full bg-muted border border-border rounded-[16px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary text-sm resize-none"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          onClick={onCancel}
          className="flex-1 h-12 rounded-[16px] bg-muted hover:bg-muted/80 text-foreground border-0"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 h-12 rounded-[16px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-0"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
