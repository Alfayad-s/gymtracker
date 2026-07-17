'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  EXERCISE_CATEGORIES,
  getMuscleGroupDefaults,
  type BuiltInMuscleGroup,
} from '@/data/exercises'
import { MuscleFocusPreview } from '@/components/muscle-map'
import {
  useMuscleGroupStore,
  type CustomMuscleGroup,
} from '@/stores/muscleGroupStore'
import { useExerciseStore } from '@/stores/exerciseStore'

export default function MuscleGroupsPage() {
  const router = useRouter()
  const groups = useMuscleGroupStore((state) => state.groups)
  const createGroup = useMuscleGroupStore((state) => state.createGroup)
  const updateGroup = useMuscleGroupStore((state) => state.updateGroup)
  const deleteGroup = useMuscleGroupStore((state) => state.deleteGroup)
  const customExercises = useExerciseStore((state) => state.exercises)
  const reassignMuscleGroup = useExerciseStore((state) => state.reassignMuscleGroup)

  const [name, setName] = useState('')
  const [baseGroup, setBaseGroup] = useState<BuiltInMuscleGroup>('Chest')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBase, setEditBase] = useState<BuiltInMuscleGroup>('Chest')
  const [deleting, setDeleting] = useState<CustomMuscleGroup | null>(null)
  const [error, setError] = useState('')

  const allNames = useMemo(
    () =>
      new Set([
        ...EXERCISE_CATEGORIES.map((group) => group.toLowerCase()),
        ...groups.map((group) => group.name.toLowerCase()),
      ]),
    [groups]
  )

  const exerciseCount = (groupName: string) =>
    customExercises.filter((exercise) => exercise.muscleGroup === groupName).length

  const validateName = (value: string, currentName?: string) => {
    const clean = value.trim()
    if (!clean) return 'Enter a group name.'
    const normalized = clean.toLowerCase()
    if (normalized !== currentName?.toLowerCase() && allNames.has(normalized)) {
      return 'A muscle group with this name already exists.'
    }
    return ''
  }

  const handleCreate = () => {
    const validation = validateName(name)
    if (validation) {
      setError(validation)
      return
    }
    createGroup(name, baseGroup)
    setName('')
    setBaseGroup('Chest')
    setError('')
  }

  const beginEdit = (group: CustomMuscleGroup) => {
    setEditingId(group.id)
    setEditName(group.name)
    setEditBase(group.anatomyBaseGroup)
    setError('')
  }

  const handleUpdate = (group: CustomMuscleGroup) => {
    const validation = validateName(editName, group.name)
    if (validation) {
      setError(validation)
      return
    }

    const oldName = group.name
    const newName = editName.trim()
    updateGroup(group.id, { name: newName, anatomyBaseGroup: editBase })
    reassignMuscleGroup(oldName, newName, editBase)
    setEditingId(null)
    setError('')
  }

  const handleDelete = () => {
    if (!deleting) return
    reassignMuscleGroup(
      deleting.name,
      deleting.anatomyBaseGroup,
      deleting.anatomyBaseGroup
    )
    deleteGroup(deleting.id)
    setDeleting(null)
  }

  return (
    <div className="p-5 space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 bg-card border border-border rounded-xl text-foreground cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Muscle Groups</h1>
          <p className="text-xs text-muted-foreground">
            {EXERCISE_CATEGORIES.length} built-in · {groups.length} custom
          </p>
        </div>
      </div>

      <section className="bg-card border border-border rounded-[24px] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">Create muscle group</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Choose the closest anatomy region for muscle highlighting.
          </p>
        </div>
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
          placeholder="e.g. Upper Body"
          className="w-full h-11 bg-muted border border-border rounded-[14px] px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <select
          value={baseGroup}
          onChange={(event) => setBaseGroup(event.target.value as BuiltInMuscleGroup)}
          className="w-full h-11 bg-muted border border-border rounded-[14px] px-3 text-sm text-foreground focus:outline-none focus:border-primary"
        >
          {EXERCISE_CATEGORIES.map((group) => (
            <option key={group} value={group}>
              Anatomy: {group}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim()}
          className="w-full h-11 rounded-[14px] bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Custom groups
        </h2>
        {groups.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border p-6 text-center">
            <p className="text-xs text-muted-foreground">No custom muscle groups yet.</p>
          </div>
        ) : (
          groups.map((group) => {
            const anatomy = getMuscleGroupDefaults(group.anatomyBaseGroup)
            const isEditing = editingId === group.id
            return (
              <div
                key={group.id}
                className="bg-card border border-border rounded-[20px] p-3.5"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(event) => {
                        setEditName(event.target.value)
                        setError('')
                      }}
                      className="w-full h-10 bg-muted border border-border rounded-[12px] px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                    <select
                      value={editBase}
                      onChange={(event) =>
                        setEditBase(event.target.value as BuiltInMuscleGroup)
                      }
                      className="w-full h-10 bg-muted border border-border rounded-[12px] px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                    >
                      {EXERCISE_CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          Anatomy: {item}
                        </option>
                      ))}
                    </select>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null)
                          setError('')
                        }}
                        className="flex-1 h-10 rounded-[12px] bg-muted text-foreground text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(group)}
                        className="flex-1 h-10 rounded-[12px] bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-16 rounded-[16px] bg-background border border-border p-1.5 shrink-0">
                      <MuscleFocusPreview
                        view={anatomy.view}
                        primary={anatomy.primary}
                        secondary={anatomy.secondary}
                        size="list"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-foreground truncate">{group.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {group.anatomyBaseGroup} anatomy · {exerciseCount(group.name)} exercises
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => beginEdit(group)}
                        className="w-9 h-9 rounded-[12px] bg-muted text-foreground flex items-center justify-center cursor-pointer"
                        aria-label={`Edit ${group.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(group)}
                        className="w-9 h-9 rounded-[12px] bg-destructive/10 text-destructive flex items-center justify-center cursor-pointer"
                        aria-label={`Delete ${group.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          Built-in groups
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {EXERCISE_CATEGORIES.map((group) => (
            <div
              key={group}
              className="bg-card border border-border rounded-[16px] px-3 py-3"
            >
              <p className="text-sm font-bold text-foreground">{group}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Built-in</p>
            </div>
          ))}
        </div>
      </section>

      {deleting && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--overlay)] backdrop-blur-sm">
          <div className="w-full sm:max-w-[430px] bg-card border-t border-border rounded-t-[28px] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-foreground">Delete muscle group?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                &ldquo;{deleting.name}&rdquo; will be deleted. Its custom exercises will move
                to {deleting.anatomyBaseGroup}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="flex-1 h-12 rounded-[16px] bg-muted text-foreground font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 h-12 rounded-[16px] bg-destructive text-destructive-foreground font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
