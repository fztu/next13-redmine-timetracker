"use client"

import { useState, useMemo } from "react"
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns"
import { CalendarIcon, Copy, Plus, Trash2 } from "lucide-react"
import axios from "axios"
import useSWR from "swr"
import { UserRedmineConnection } from "@prisma/client"
import type { Project as RedmineProject, TimeEntryActivity } from "@/lib/redmine"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { TTimeEntries } from "@/types"
import type { TimeEntry } from "@/lib/redmine"

interface DuplicateWeekDialogProps {
    timeEntries: TTimeEntries[] | undefined
    redmineConnections: UserRedmineConnection[] | undefined
    onSuccess: () => void
}

type EditableEntry = {
    key: string
    connectionId: string
    connectionName: string
    originalEntry: TimeEntry
    parentProjectName: string | null
    include: boolean
    comments: string
    hours: string
    spent_on: string
}

type PendingEntry = {
    key: string
    connectionId: string
    connectionName: string
    projectId: string
    projectName: string
    parentProjectName: string | null
    issueId: string
    activityId: string
    activityName: string
    comments: string
    hours: string
    spent_on: string
}

const EMPTY_ADD_FORM = {
    connectionId: "",
    projectId: "",
    subProjectId: "",
    issueId: "",
    activityId: "",
    comments: "",
    hours: "",
    spent_on: "",
}
type AddForm = typeof EMPTY_ADD_FORM

const fetcher = (url: string) => axios.get(url).then(res => res.data)

function findParentProject(projects: RedmineProject[], targetId: number): RedmineProject | undefined {
    for (const project of projects) {
        if (project.id === targetId) return project
        if (project.children?.some((c) => c.id === targetId)) return project
    }
    return undefined
}

function WeekPicker({
    label,
    selectedDate,
    onSelect,
}: {
    label: string
    selectedDate: Date | undefined
    onSelect: (date: Date | undefined) => void
}) {
    const weekStart = selectedDate ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : undefined
    const weekEnd = weekStart ? addDays(weekStart, 6) : undefined

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{label}</label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {weekStart && weekEnd
                            ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`
                            : "Pick a week"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={weekStart}
                        onSelect={onSelect}
                        modifiers={{
                            highlighted: weekStart && weekEnd ? { from: weekStart, to: weekEnd } : [],
                        }}
                        modifiersClassNames={{
                            highlighted: "bg-accent rounded-none [&:first-child]:rounded-l-md [&:last-child]:rounded-r-md",
                        }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default function DuplicateWeekDialog({
    timeEntries,
    redmineConnections,
    onSuccess,
}: DuplicateWeekDialogProps) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<"pick" | "review">("pick")
    const [sourceDate, setSourceDate] = useState<Date | undefined>()
    const [targetDate, setTargetDate] = useState<Date | undefined>()
    const [editableEntries, setEditableEntries] = useState<EditableEntry[]>([])
    const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD_FORM)

    const showConnections = (redmineConnections?.length ?? 0) > 1

    const sourceWeekStart = sourceDate ? startOfWeek(sourceDate, { weekStartsOn: 1 }) : undefined
    const targetWeekStart = targetDate ? startOfWeek(targetDate, { weekStartsOn: 1 }) : undefined

    const offsetDays =
        sourceWeekStart && targetWeekStart
            ? differenceInCalendarDays(targetWeekStart, sourceWeekStart)
            : 0

    const isSameWeek = sourceWeekStart && targetWeekStart && offsetDays === 0

    // Count source entries for the pick step
    const sourceEntryCount =
        sourceWeekStart && timeEntries
            ? timeEntries.flatMap(({ data }) =>
                data.filter((entry) => {
                    const d = parseISO(entry.spent_on)
                    const weekEnd = addDays(sourceWeekStart, 6)
                    return d >= sourceWeekStart && d <= weekEnd
                })
            ).length
            : 0

    // Fetch activities for the add form's selected connection
    const { data: activities } = useSWR<TimeEntryActivity[]>(
        addForm.connectionId ? `/api/redmine/conn/${addForm.connectionId}/activities` : null,
        fetcher,
        { revalidateOnFocus: false, revalidateIfStale: false, revalidateOnReconnect: false }
    )

    const addFormProjects = useMemo<RedmineProject[]>(() => {
        const conn = redmineConnections?.find(c => c.id === addForm.connectionId)
        return conn?.projects ? JSON.parse(conn.projects) : []
    }, [redmineConnections, addForm.connectionId])

    const addFormSubProjects = useMemo(() => {
        const proj = addFormProjects.find(p => p.id.toString() === addForm.projectId)
        return proj?.children ?? []
    }, [addFormProjects, addForm.projectId])

    const handleNext = () => {
        if (!sourceWeekStart || !targetWeekStart || !timeEntries) return

        const connectionMap = new Map(redmineConnections?.map((c) => [c.id, c.name ?? c.url]) ?? [])
        const projectsCache = new Map<string, RedmineProject[]>()
        redmineConnections?.forEach((c) => {
            projectsCache.set(c.id, c.projects ? JSON.parse(c.projects) : [])
        })

        const entries: EditableEntry[] = timeEntries.flatMap(({ connectionId, data }) =>
            data
                .filter((entry) => {
                    const d = parseISO(entry.spent_on)
                    const weekEnd = addDays(sourceWeekStart, 6)
                    return d >= sourceWeekStart && d <= weekEnd
                })
                .map((entry, i) => {
                    const allProjects = projectsCache.get(connectionId) ?? []
                    const parent = findParentProject(allProjects, entry.project.id)
                    const isSubProject = parent !== undefined && parent.id !== entry.project.id
                    return {
                        key: `${connectionId}-${entry.id}-${i}`,
                        connectionId,
                        connectionName: connectionMap.get(connectionId) ?? connectionId,
                        originalEntry: entry,
                        parentProjectName: isSubProject ? parent!.name : null,
                        include: true,
                        comments: entry.comments,
                        hours: entry.hours.toString(),
                        spent_on: format(addDays(parseISO(entry.spent_on), offsetDays), "yyyy-MM-dd"),
                    }
                })
        )

        setEditableEntries(entries)
        setPendingEntries([])
        setShowAddForm(false)

        const singleConnectionId = !showConnections ? redmineConnections?.[0]?.id ?? "" : ""
        setAddForm({
            ...EMPTY_ADD_FORM,
            connectionId: singleConnectionId,
            spent_on: targetWeekStart ? format(targetWeekStart, "yyyy-MM-dd") : "",
        })
        setStep("review")
    }

    const handleSubmit = async () => {
        const toCreate = editableEntries.filter((e) => e.include)
        const total = toCreate.length + pendingEntries.length
        if (total === 0) return

        setIsLoading(true)
        let successCount = 0
        let failCount = 0

        for (const entry of toCreate) {
            try {
                await axios.post(`/api/redmine/conn/${entry.connectionId}/time_entries`, {
                    id: "",
                    comments: entry.comments,
                    hours: parseFloat(entry.hours) || 0,
                    connection_id: entry.connectionId,
                    project_id: entry.originalEntry.issue?.id ? "" : entry.originalEntry.project.id.toString(),
                    sub_project_id: "",
                    issue_id: entry.originalEntry.issue?.id?.toString() ?? "",
                    activity_id: entry.originalEntry.activity.id.toString(),
                    spent_on: entry.spent_on,
                })
                successCount++
            } catch {
                failCount++
            }
        }

        for (const entry of pendingEntries) {
            try {
                await axios.post(`/api/redmine/conn/${entry.connectionId}/time_entries`, {
                    id: "",
                    comments: entry.comments,
                    hours: parseFloat(entry.hours) || 0,
                    connection_id: entry.connectionId,
                    project_id: entry.issueId ? "" : entry.projectId,
                    sub_project_id: "",
                    issue_id: entry.issueId,
                    activity_id: entry.activityId,
                    spent_on: entry.spent_on,
                })
                successCount++
            } catch {
                failCount++
            }
        }

        setIsLoading(false)

        if (failCount === 0) {
            toast({ title: `Created ${successCount} time ${successCount === 1 ? "entry" : "entries"} successfully.` })
            handleClose()
        } else {
            toast({
                title: `Created ${successCount}, failed ${failCount}.`,
                variant: "destructive",
            })
        }
        onSuccess()
    }

    const handleClose = () => {
        setOpen(false)
        setStep("pick")
        setSourceDate(undefined)
        setTargetDate(undefined)
        setEditableEntries([])
        setPendingEntries([])
        setShowAddForm(false)
        setAddForm(EMPTY_ADD_FORM)
    }

    const updateEntry = (key: string, field: "comments" | "hours" | "spent_on", value: string) => {
        setEditableEntries((prev) =>
            prev.map((e) => (e.key === key ? { ...e, [field]: value } : e))
        )
    }

    const toggleInclude = (key: string, checked: boolean) => {
        setEditableEntries((prev) =>
            prev.map((e) => (e.key === key ? { ...e, include: checked } : e))
        )
    }

    const removeEntry = (key: string) => {
        setEditableEntries((prev) => prev.filter((e) => e.key !== key))
    }

    const copyEntry = (entry: EditableEntry) => {
        const copy: EditableEntry = {
            ...entry,
            key: `copy-${Date.now()}-${Math.random()}`,
        }
        setEditableEntries((prev) => {
            const idx = prev.findIndex((e) => e.key === entry.key)
            const next = [...prev]
            next.splice(idx + 1, 0, copy)
            return next
        })
    }

    const setAddField = (field: keyof AddForm, value: string) => {
        setAddForm(prev => {
            const next = { ...prev, [field]: value }
            if (field === "connectionId") { next.projectId = ""; next.subProjectId = ""; next.activityId = "" }
            if (field === "projectId") { next.subProjectId = "" }
            return next
        })
    }

    const handleQueueEntry = () => {
        const conn = redmineConnections?.find(c => c.id === addForm.connectionId)
        const project = addFormProjects.find(p => p.id.toString() === addForm.projectId)
        const subProject = addFormSubProjects.find(p => p.id.toString() === addForm.subProjectId)
        const activity = activities?.find(a => a.id.toString() === addForm.activityId)

        const effectiveProjectId = addForm.subProjectId || addForm.projectId
        const effectiveProjectName = subProject?.name ?? project?.name ?? ""
        const parentProjectName = subProject ? (project?.name ?? null) : null

        setPendingEntries(prev => [...prev, {
            key: `new-${Date.now()}-${Math.random()}`,
            connectionId: addForm.connectionId,
            connectionName: conn?.name ?? conn?.url ?? addForm.connectionId,
            projectId: effectiveProjectId,
            projectName: effectiveProjectName,
            parentProjectName,
            issueId: addForm.issueId,
            activityId: addForm.activityId,
            activityName: activity?.name ?? "",
            comments: addForm.comments,
            hours: addForm.hours,
            spent_on: addForm.spent_on,
        }])

        setAddForm(prev => ({
            ...prev,
            projectId: "",
            subProjectId: "",
            issueId: "",
            activityId: "",
            comments: "",
            hours: "",
        }))
    }

    const removePending = (key: string) => {
        setPendingEntries(prev => prev.filter(e => e.key !== key))
    }

    const includedCount = editableEntries.filter((e) => e.include).length
    const totalPending = pendingEntries.length
    const totalToSubmit = includedCount + totalPending

    const addFormValid =
        !!addForm.connectionId &&
        (!!addForm.projectId || !!addForm.issueId) &&
        !!addForm.activityId &&
        !!addForm.comments.trim() &&
        parseFloat(addForm.hours) > 0 &&
        !!addForm.spent_on

    const colSpan = showConnections ? 8 : 7

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else setOpen(true); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="text-white bg-blue-500 hover:bg-blue-700 hover:text-white">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Weekly Entries
                </Button>
            </DialogTrigger>

            {step === "pick" && (
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Copy Weekly Entries</DialogTitle>
                        <DialogDescription>
                            Select a source week to copy from and a target week to copy to.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-2">
                        <WeekPicker
                            label="Source week (copy from)"
                            selectedDate={sourceDate}
                            onSelect={setSourceDate}
                        />
                        <WeekPicker
                            label="Target week (copy to)"
                            selectedDate={targetDate}
                            onSelect={setTargetDate}
                        />

                        {sourceWeekStart && (
                            <p className="text-sm text-muted-foreground">
                                {sourceEntryCount === 0
                                    ? "No time entries found in the selected source week."
                                    : `${sourceEntryCount} time ${sourceEntryCount === 1 ? "entry" : "entries"} found.`}
                            </p>
                        )}
                        {isSameWeek && (
                            <p className="text-sm text-destructive">Source and target week must be different.</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>Cancel</Button>
                        <Button
                            onClick={handleNext}
                            disabled={!sourceWeekStart || !targetWeekStart || sourceEntryCount === 0 || !!isSameWeek}
                        >
                            Next →
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}

            {step === "review" && (
                <DialogContent className="inset-0 translate-x-0 translate-y-0 w-screen max-w-none h-screen max-h-screen rounded-none flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Review Entries</DialogTitle>
                        <DialogDescription>
                            Review and adjust the entries before submitting. Uncheck or remove entries you don&apos;t want to copy, or add new ones.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-auto flex-1 rounded border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    {showConnections && <TableHead className="w-32">Connection</TableHead>}
                                    <TableHead>Project</TableHead>
                                    <TableHead>Activity</TableHead>
                                    <TableHead>Comments</TableHead>
                                    <TableHead className="w-20">Hours</TableHead>
                                    <TableHead className="w-36">Date</TableHead>
                                    <TableHead className="w-20"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableEntries.map((entry) => (
                                    <TableRow key={entry.key} className={!entry.include ? "opacity-40" : ""}>
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                checked={entry.include}
                                                onChange={(e) => toggleInclude(entry.key, e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                        </TableCell>
                                        {showConnections && (
                                            <TableCell className="text-xs text-muted-foreground">
                                                {entry.connectionName}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-sm">
                                            {entry.parentProjectName && (
                                                <div className="text-muted-foreground text-xs">{entry.parentProjectName}</div>
                                            )}
                                            <div className="font-medium">{entry.originalEntry.project.name}</div>
                                            {entry.originalEntry.issue?.id && (
                                                <div className="text-muted-foreground text-xs">#{entry.originalEntry.issue.id}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">{entry.originalEntry.activity.name}</TableCell>
                                        <TableCell>
                                            <Input
                                                value={entry.comments}
                                                onChange={(e) => updateEntry(entry.key, "comments", e.target.value)}
                                                disabled={!entry.include}
                                                className="h-7 text-sm min-w-[160px]"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                step="0.25"
                                                min="0"
                                                value={entry.hours}
                                                onChange={(e) => updateEntry(entry.key, "hours", e.target.value)}
                                                disabled={!entry.include}
                                                className="h-7 text-sm w-20"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="date"
                                                value={entry.spent_on}
                                                onChange={(e) => updateEntry(entry.key, "spent_on", e.target.value)}
                                                disabled={!entry.include}
                                                className="h-7 text-sm w-36 min-w-[144px]"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    title="Duplicate entry"
                                                    onClick={() => copyEntry(entry)}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeEntry(entry.key)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {pendingEntries.map((entry) => (
                                    <TableRow key={entry.key} className="bg-green-50 dark:bg-green-950/20">
                                        <TableCell />
                                        {showConnections && (
                                            <TableCell className="text-xs text-muted-foreground">{entry.connectionName}</TableCell>
                                        )}
                                        <TableCell className="text-sm">
                                            {entry.parentProjectName && (
                                                <div className="text-muted-foreground text-xs">{entry.parentProjectName}</div>
                                            )}
                                            <div className="font-medium">
                                                {entry.projectName}
                                                {entry.issueId && (
                                                    <span className="text-muted-foreground text-xs ml-1">#{entry.issueId}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">{entry.activityName}</TableCell>
                                        <TableCell className="text-sm">{entry.comments}</TableCell>
                                        <TableCell className="text-sm">{entry.hours}</TableCell>
                                        <TableCell className="text-sm">{entry.spent_on}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => removePending(entry.key)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {editableEntries.length === 0 && pendingEntries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
                                            All entries removed.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {showAddForm ? (
                        <div className="border rounded p-3 space-y-2 bg-muted/30 shrink-0">
                            <p className="text-sm font-medium">New Entry</p>
                            <div className="flex flex-wrap gap-2 items-end">
                                {showConnections && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground">Connection *</label>
                                        <Select value={addForm.connectionId} onValueChange={v => setAddField("connectionId", v)}>
                                            <SelectTrigger className="h-8 text-sm w-44">
                                                <SelectValue placeholder="Connection" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {redmineConnections?.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name ?? c.url}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-muted-foreground">Project *</label>
                                    <Select
                                        value={addForm.projectId}
                                        onValueChange={v => setAddField("projectId", v)}
                                        disabled={!addForm.connectionId || addFormProjects.length === 0}
                                    >
                                        <SelectTrigger className="h-8 text-sm w-44">
                                            <SelectValue placeholder="Project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {addFormProjects.map(p => (
                                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {addFormSubProjects.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground">Sub-project</label>
                                        <Select value={addForm.subProjectId} onValueChange={v => setAddField("subProjectId", v)}>
                                            <SelectTrigger className="h-8 text-sm w-44">
                                                <SelectValue placeholder="Sub-project" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {addFormSubProjects.map(p => (
                                                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-muted-foreground">Activity *</label>
                                    <Select
                                        value={addForm.activityId}
                                        onValueChange={v => setAddField("activityId", v)}
                                        disabled={!activities || activities.length === 0}
                                    >
                                        <SelectTrigger className="h-8 text-sm w-36">
                                            <SelectValue placeholder={!addForm.connectionId ? "Select connection first" : "Activity"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {activities?.map(a => (
                                                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-muted-foreground">Issue # (optional)</label>
                                    <Input
                                        placeholder="123"
                                        value={addForm.issueId}
                                        onChange={e => setAddField("issueId", e.target.value)}
                                        className="h-8 text-sm w-24"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                    <label className="text-xs text-muted-foreground">Comments *</label>
                                    <Input
                                        placeholder="What you did"
                                        value={addForm.comments}
                                        onChange={e => setAddField("comments", e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-muted-foreground">Hours *</label>
                                    <Input
                                        type="number"
                                        step="0.25"
                                        min="0"
                                        placeholder="0"
                                        value={addForm.hours}
                                        onChange={e => setAddField("hours", e.target.value)}
                                        className="h-8 text-sm w-20"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-muted-foreground">Date *</label>
                                    <Input
                                        type="date"
                                        value={addForm.spent_on}
                                        onChange={e => setAddField("spent_on", e.target.value)}
                                        className="h-8 text-sm w-36 min-w-[144px]"
                                    />
                                </div>
                                <div className="flex gap-2 pb-0.5">
                                    <Button size="sm" onClick={handleQueueEntry} disabled={!addFormValid}>
                                        Add
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="self-start shrink-0"
                            onClick={() => setShowAddForm(true)}
                            disabled={isLoading}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Entry
                        </Button>
                    )}

                    <div className="text-sm text-muted-foreground shrink-0">
                        {[
                            includedCount > 0 && `${includedCount} copied ${includedCount === 1 ? "entry" : "entries"}`,
                            totalPending > 0 && `${totalPending} new ${totalPending === 1 ? "entry" : "entries"}`,
                        ].filter(Boolean).join(" · ") ||
                            "No entries selected."}
                    </div>

                    <DialogFooter className="shrink-0">
                        <Button variant="outline" onClick={() => setStep("pick")} disabled={isLoading}>← Back</Button>
                        <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={totalToSubmit === 0 || isLoading}
                        >
                            {isLoading ? "Submitting…" : `Submit ${totalToSubmit} ${totalToSubmit === 1 ? "entry" : "entries"}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    )
}
