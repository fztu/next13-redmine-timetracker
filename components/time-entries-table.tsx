"use client";

import axios from 'axios'
import { useSWRConfig } from 'swr'
import { useUser } from "@clerk/nextjs";
import { DateRange } from "react-day-picker"
import { addDays } from 'date-fns';

import {
    RowData,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { UserRedmineConnection } from "@prisma/client"
import { TimeEntry } from '@/lib/redmine';

import { TimeEntryTableColumns } from '@/components/time-entries-table-columns'
import { DataTablePagination } from './datatable-pagination';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import TimeEntryForm from './time-entry-form';
import { useState } from 'react';
import useTimeEntriesRequest from '@/hooks/useTimeEntriesRequest';
import { toast } from './ui/use-toast';

interface TimeEntriesTableProps {
    date: DateRange | undefined,
    redmineConnections: UserRedmineConnection[],
    redmineConnection: UserRedmineConnection,
    timeEntries: TimeEntry[] | undefined,
    isTimeEntriesLoading: Boolean,
    mutateTimeEntries: () => void
}

interface TableMeta<TData extends RowData> {
    redmineConnection: UserRedmineConnection,
    dateRange: DateRange | undefined,
}

const TimeEntriesTable = ({
    date,
    redmineConnections,
    redmineConnection,
    timeEntries,
    isTimeEntriesLoading,
    mutateTimeEntries
}: TimeEntriesTableProps) => {
    const data = timeEntries == undefined ? [] : timeEntries;

    const table = useReactTable({
        data,
        columns: TimeEntryTableColumns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            redmineConnection: redmineConnection,
            dateRange: date,
            removeTimeEntry: async (rowIndex: number) => {
                console.log(rowIndex);
                console.log(data);
                const timeEntry = data[rowIndex];
                const connectionId = redmineConnection?.id;
                const response = await axios.delete(
                    `/api/redmine/conn/${connectionId}/time_entries/${timeEntry.id}`
                );
                console.log(response.data);
                if (response?.data?.status?.hasError === false) {
                    toast({
                        title: "Time Entry Deleted",
                        description: "Time entry deleted successfully.",
                    });
                } else {
                    toast({
                        variant: "destructive",
                        title: "Failed",
                        description: "Failed to delete the time entry",
                    })
                }
                mutateTimeEntries()
            },
        } as TableMeta<TimeEntry>
    })
    // console.log(table)
    return (
        <div className="rounded-md border">
            <div className="flex items-center p-2 w-full">
                <div className="ml-0 font-medium">
                    <h2 className="text-2xl font-bold tracking-tight pt-2 pl-2">{redmineConnection.name} Time Entries</h2>
                    <p className="text-muted-foreground pl-2">
                        Time entries from {date?.from?.toISOString().split('T')[0]} to {date?.to?.toISOString().split('T')[0]}
                    </p>
                </div>

                <Sheet>
                    <SheetTrigger className="ml-auto">
                        <Button
                            variant="outline"
                            type="button"
                            className="ml-auto text-white bg-green-500 hover:bg-green-700 hover:text-white"
                            disabled={(isTimeEntriesLoading == undefined || isTimeEntriesLoading) ? true : false}
                        >
                            Add
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="p-2 pt-4 min-w-fit">
                        <TimeEntryForm
                            date={date}
                            redmineConnection={redmineConnection}
                        />
                    </SheetContent>
                </Sheet>
            </div>
            {(table == undefined || data == undefined) &&
                <div className="border border-blue-300 shadow rounded-md p-4 w-full mx-auto">
                    <div className="animate-pulse flex space-x-4">
                        <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                        <div className="flex-1 space-y-6 py-1">
                            <div className="h-2 bg-slate-200 rounded"></div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                                    <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                                </div>
                                <div className="h-2 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            }
            {(table && data) &&
                <div>
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups()?.map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="pt-2 pb-2">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={TimeEntryTableColumns.length} className="h-24 text-center">
                                        {isTimeEntriesLoading ? "Loading..." : "No result."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <DataTablePagination table={table} />
                </div>
            }
        </div >

    )
}

export default TimeEntriesTable;