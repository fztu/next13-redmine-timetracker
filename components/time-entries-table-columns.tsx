"use client"

import { ColumnDef, RowData } from "@tanstack/react-table"

import { Button } from "@/components/ui/button";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useState } from "react";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

import TimeEntryForm from "./time-entry-form";
import { UserRedmineConnection } from "@prisma/client"
import { Project as RedmineProject, TimeEntry } from '@/lib/redmine';
import { DataTableColumnHeader } from "@/components/datatable-column-header";

interface TableMeta<TData extends RowData> {
    redmineConnection: UserRedmineConnection,
    dateRange: DateRange | undefined,
    removeTimeEntry: (rowIndex: number) => void
}

const findProjectById = function (data: RedmineProject[], targetId: number) {
    for (const project of data) {
        if (project.id === targetId) {
            return project;
        } else if (project.children !== undefined && project.children.length > 0) {
            for (const childProject of project.children) {
                if (childProject.id === targetId) {
                    return project;
                }
            }
        }
    }
    return undefined;
}

export const TimeEntryTableColumns: ColumnDef<TimeEntry>[] = [
    {
        accessorKey: "project",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Project" />
        ),
        cell: ({ row, table }) => {
            const project = row.getValue("project") as { id: number, name: string };
            const projectName = project ? project.name : ""

            const tableMeta = table.options?.meta as TableMeta<TimeEntry>
            if (tableMeta?.hasOwnProperty("redmineConnection")) {
                const allProjects = tableMeta.redmineConnection.projects ? JSON.parse(tableMeta.redmineConnection.projects) : []
                // console.log(allProjects)
                const matchedProject = findProjectById(allProjects, project.id)
                if (matchedProject !== undefined && matchedProject.id !== project.id) {
                    // This means the project is a sub project
                    return (
                        <div>
                            <div className="font-medium">{matchedProject.name}</div>
                            <div className="font-medium">{projectName}</div>
                        </div>
                    )
                }
            }
            return (
                <div>
                    <div className="font-medium">{projectName}</div>
                </div>
            )
        },
    },
    {
        accessorKey: "issue",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Ticket" />
        ),
        cell: ({ row }) => {
            const issue = row.getValue("issue") as { id: number };
            const issueId = issue ? issue.id : ""

            return <div className="font-medium">{issueId}</div>
        },
    },
    {
        accessorKey: "activity",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Activity" />
        ),
        cell: ({ row }) => {
            const activity = row.getValue("activity") as { id: number, name: string };
            const activityName = activity ? activity.name : ""

            return <div className="font-medium">{activityName}</div>
        },
    },
    {
        accessorKey: "comments",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Comments" />
        ),
    },
    {
        accessorKey: "spent_on",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Spent On" />
        ),
    },
    {
        accessorKey: "hours",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Hours" />
        ),
    },
    {
        id: "actions",
        cell: ({ row, table }) => {
            // console.log(table.options.meta);

            const timeEntry = row.original;
            const tableMeta = table.options?.meta as TableMeta<TimeEntry>
            const redmineConnection = tableMeta?.redmineConnection ?? undefined;
            const dateRange = tableMeta?.dateRange ?? undefined;

            const removeTimeEntry = () => {
                tableMeta?.removeTimeEntry(row.index);
            };

            // const [open, setOpen] = useState<boolean>(false);

            return (
                <section className="w-full flex flex-row space-x-4">
                    <Sheet>
                        <SheetTrigger className="ml-auto">
                            <Button
                                variant="ghost"
                                type="button"
                                className="w-1/2"
                                size="icon"
                            >
                                <PencilIcon />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="p-2 pt-4 min-w-fit">
                            <TimeEntryForm
                                date={dateRange}
                                redmineConnection={redmineConnection}
                                timeEntry={timeEntry}
                            />
                        </SheetContent>
                    </Sheet>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                type="button"
                                className="w-1/2"
                                size="icon"
                            >
                                <Trash2Icon color="red" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone.
                                    This will permanently delete your time entry from the Redmine.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={removeTimeEntry}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </section>
            )
        }
    }
];

// export default TimeEntryTableColumns;