"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import useSWR from "swr"
import { Plus, Trash2 } from "lucide-react"
import { UserRedmineConnection } from "@prisma/client"
import type { Project as RedmineProject, TimeEntryActivity } from "@/lib/redmine"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import type { TTimeEntries } from "@/types"
import type { TimeEntry } from "@/lib/redmine"

export interface SelectedRange {
    from: string   // YYYY-MM-DD
    to: string     // YYYY-MM-DD
    label: string
}

interface WeekReviewDialogProps {
    selectedRange: SelectedRange | null
    timeEntries: TTimeEntries[] | undefined
    redmineConnections: UserRedmineConnection[] | undefined
    onClose: () => void
    onSuccess: () => void
}

type EditableEntry = {
    key: string
    connectionId: string
    connectionName: string
    originalEntry: TimeEntry
    parentProjectName: string | null
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

function hasChanges(entry: EditableEntry): boolean {
    return (
        entry.comments !== entry.originalEntry.comments ||
        entry.hours !== entry.originalEntry.hours.toString() ||
        entry.spent_on !== entry.originalEntry.spent_on
    )
}

export default function WeekReviewDialog({
    selectedRange,
    timeEntries,
    redmineConnections,
    onClose,
    onSuccess,
}: WeekReviewDialogProps) {
    const { toast } = useToast()
    const [editableEntries, setEditableEntries] = useState<EditableEntry[]>([])
    const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD_FORM)

    const showConnections = (redmineConnections?.length ?? 0) > 1

    // fetch activities for the selected connection in the add form
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

    useEffect(() => {
        if (!selectedRange || !timeEntries) {
            setEditableEntries([])
            setPendingEntries([])
            setConfirmDeleteKey(null)
            setShowAddForm(false)
            setAddForm(EMPTY_ADD_FORM)
            return
        }
        setConfirmDeleteKey(null)
        setPendingEntries([])
        setShowAddForm(false)

        const { from, to } = selectedRange
        const connectionMap = new Map(redmineConnections?.map((c) => [c.id, c.name ?? c.url]) ?? [])

        const projectsCache = new Map<string, RedmineProject[]>()
        redmineConnections?.forEach((c) => {
            projectsCache.set(c.id, c.projects ? JSON.parse(c.projects) : [])
        })

        const entries: EditableEntry[] = timeEntries.flatMap(({ connectionId, data }) =>
            data
                .filter((entry) => entry.spent_on >= from && entry.spent_on <= to)
                .map((entry, i) => {
                    const allProjects = projectsCache.get(connectionId) ?? []
                    const parent = findParentProject(allProjects, entry.project.id)
                    const isSubProject = parent !== undefined && parent.id !== entry.project.id
                    return {
                        key: `${connectionId}-${entry.id}-${i}`,
                        connectionId,
                        connectionName: connectionMap.get(connectionId) ?? connectionId,
                        originalEntry: entry,
                        parentProjectName: isSubProject ? parent.name : null,
                        comments: entry.comments,
                        hours: entry.hours.toString(),
                        spent_on: entry.spent_on,
                    }
                })
        )

        setEditableEntries(entries)

        // pre-fill add form defaults
        const singleConnectionId = !showConnections ? redmineConnections?.[0]?.id ?? "" : ""
        setAddForm({ ...EMPTY_ADD_FORM, connectionId: singleConnectionId, spent_on: from })
    }, [selectedRange, timeEntries, redmineConnections]) // eslint-disable-line react-hooks/exhaustive-deps

    const updateEntry = (key: string, field: "comments" | "hours" | "spent_on", value: string) => {
        setEditableEntries((prev) =>
            prev.map((e) => (e.key === key ? { ...e, [field]: value } : e))
        )
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

        // keep connection + date for convenience, reset rest
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

    const handleDelete = async (entry: EditableEntry) => {
        setIsLoading(true)
        try {
            await axios.delete(`/api/redmine/conn/${entry.connectionId}/time_entries/${entry.originalEntry.id}`)
            setEditableEntries((prev) => prev.filter((e) => e.key !== entry.key))
            toast({ title: "Entry deleted." })
            onSuccess()
        } catch {
            toast({ title: "Failed to delete entry.", variant: "destructive" })
        } finally {
            setIsLoading(false)
            setConfirmDeleteKey(null)
        }
    }

    const handleSubmit = async () => {
        const toUpdate = editableEntries.filter(hasChanges)
        setIsLoading(true)
        let successCount = 0
        let failCount = 0

        for (const entry of toUpdate) {
            try {
                await axios.post(`/api/redmine/conn/${entry.connectionId}/time_entries`, {
                    id: entry.originalEntry.id.toString(),
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
            toast({ title: `Saved ${successCount} ${successCount === 1 ? "entry" : "entries"} successfully.` })
            onSuccess()
            onClose()
        } else {
            toast({ title: `Saved ${successCount}, failed ${failCount}.`, variant: "destructive" })
        }
    }

    const changedCount = editableEntries.filter(hasChanges).length
    const totalPending = pendingEntries.length
    const canSave = changedCount > 0 || totalPending > 0
    const colSpan = showConnections ? 7 : 6

    const addFormValid =
        !!addForm.connectionId &&
        (!!addForm.projectId || !!addForm.issueId) &&
        !!addForm.activityId &&
        !!addForm.comments.trim() &&
        parseFloat(addForm.hours) > 0 &&
        !!addForm.spent_on

    const saveLabel = (() => {
        if (isLoading) return "Saving…"
        if (!canSave) return "No changes"
        const parts = []
        if (changedCount > 0) parts.push(`${changedCount} change${changedCount !== 1 ? "s" : ""}`)
        if (totalPending > 0) parts.push(`${totalPending} new`)
        return `Save ${parts.join(" + ")}`
    })()

    return (
        <Dialog open={!!selectedRange} onOpenChange={(val) => { if (!val) onClose() }}>
            <DialogContent className="inset-0 translate-x-0 translate-y-0 w-screen max-w-none h-screen max-h-screen rounded-none flex flex-col">
                <DialogHeader>
                    <DialogTitle>{selectedRange?.label}</DialogTitle>
                    <DialogDescription>
                        Edit or delete existing entries inline, or add new ones. Only changes and new entries will be submitted.
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-auto flex-1 rounded border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {showConnections && <TableHead className="w-32">Connection</TableHead>}
                                <TableHead>Project</TableHead>
                                <TableHead>Activity</TableHead>
                                <TableHead>Comments</TableHead>
                                <TableHead className="w-20">Hours</TableHead>
                                <TableHead className="w-32">Date</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {editableEntries.map((entry) => (
                                <TableRow
                                    key={entry.key}
                                    className={hasChanges(entry) ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                                >
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
                                            className="h-7 text-sm w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="date"
                                            value={entry.spent_on}
                                            onChange={(e) => updateEntry(entry.key, "spent_on", e.target.value)}
                                            className="h-7 text-sm w-36 min-w-[144px]"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {confirmDeleteKey === entry.key ? (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    disabled={isLoading}
                                                    onClick={() => handleDelete(entry)}
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 text-xs"
                                                    disabled={isLoading}
                                                    onClick={() => setConfirmDeleteKey(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                disabled={isLoading}
                                                onClick={() => setConfirmDeleteKey(entry.key)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {pendingEntries.map((entry) => (
                                <TableRow key={entry.key} className="bg-green-50 dark:bg-green-950/20">
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
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => removePending(entry.key)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {editableEntries.length === 0 && pendingEntries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-6">
                                        No time entries found for this period.
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
                        changedCount > 0 && `${changedCount} ${changedCount === 1 ? "change" : "changes"}`,
                        totalPending > 0 && `${totalPending} new ${totalPending === 1 ? "entry" : "entries"} queued`,
                    ].filter(Boolean).join(" · ") ||
                        `${editableEntries.length} ${editableEntries.length === 1 ? "entry" : "entries"} — edit cells above to make changes.`}
                </div>

                <DialogFooter className="shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Close
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSave || isLoading}>
                        {saveLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
