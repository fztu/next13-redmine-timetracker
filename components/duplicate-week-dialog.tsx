"use client"

import { useState } from "react"
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns"
import { CalendarIcon, Copy, Trash2 } from "lucide-react"
import axios from "axios"
import { UserRedmineConnection } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
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
    include: boolean
    comments: string
    hours: string
    spent_on: string // new date in target week (YYYY-MM-DD)
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
    const [isLoading, setIsLoading] = useState(false)

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

    const handleNext = () => {
        if (!sourceWeekStart || !targetWeekStart || !timeEntries) return

        const connectionMap = new Map(redmineConnections?.map((c) => [c.id, c.url]) ?? [])

        const entries: EditableEntry[] = timeEntries.flatMap(({ connectionId, data }) =>
            data
                .filter((entry) => {
                    const d = parseISO(entry.spent_on)
                    const weekEnd = addDays(sourceWeekStart, 6)
                    return d >= sourceWeekStart && d <= weekEnd
                })
                .map((entry, i) => ({
                    key: `${connectionId}-${entry.id}-${i}`,
                    connectionId,
                    connectionName: connectionMap.get(connectionId) ?? connectionId,
                    originalEntry: entry,
                    include: true,
                    comments: entry.comments,
                    hours: entry.hours.toString(),
                    spent_on: format(addDays(parseISO(entry.spent_on), offsetDays), "yyyy-MM-dd"),
                }))
        )

        setEditableEntries(entries)
        setStep("review")
    }

    const handleSubmit = async () => {
        const toCreate = editableEntries.filter((e) => e.include)
        if (toCreate.length === 0) return

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
    }

    const updateEntry = (key: string, field: keyof EditableEntry, value: string | boolean) => {
        setEditableEntries((prev) =>
            prev.map((e) => (e.key === key ? { ...e, [field]: value } : e))
        )
    }

    const removeEntry = (key: string) => {
        setEditableEntries((prev) => prev.filter((e) => e.key !== key))
    }

    const includedCount = editableEntries.filter((e) => e.include).length

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
                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Review Entries</DialogTitle>
                        <DialogDescription>
                            Review and adjust the entries before submitting. Uncheck or remove any entries you don&apos;t want to copy.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-auto flex-1 rounded border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Activity</TableHead>
                                    <TableHead>Comments</TableHead>
                                    <TableHead className="w-20">Hours</TableHead>
                                    <TableHead className="w-28">Date</TableHead>
                                    <TableHead className="w-8"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableEntries.map((entry) => (
                                    <TableRow key={entry.key} className={!entry.include ? "opacity-40" : ""}>
                                        <TableCell>
                                            <Checkbox
                                                checked={entry.include}
                                                onCheckedChange={(checked) =>
                                                    updateEntry(entry.key, "include", !!checked)
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-sm">
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
                                        <TableCell className="text-sm">{entry.spent_on}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeEntry(entry.key)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {editableEntries.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                                            All entries removed.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="text-sm text-muted-foreground pt-1">
                        {includedCount} of {editableEntries.length} entries selected.
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStep("pick")} disabled={isLoading}>← Back</Button>
                        <Button variant="outline" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={includedCount === 0 || isLoading}
                        >
                            {isLoading ? "Submitting…" : `Submit ${includedCount} ${includedCount === 1 ? "entry" : "entries"}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    )
}
