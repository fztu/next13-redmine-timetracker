"use client";

import axios from 'axios'
import useSWR from 'swr'
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

interface TimeEntriesTableProps {
    date: DateRange | undefined,
    redmineConnection: UserRedmineConnection
}

interface TableMeta<TData extends RowData> {
    redmineConnection: UserRedmineConnection
}

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const TimeEntriesTable = ({
    date,
    redmineConnection
}: TimeEntriesTableProps) => {
    const { isSignedIn, user, isLoaded } = useUser();

    const params = {
        "userId": user?.id ?? "",
        "from": date?.from ? date.from.toISOString().split('T')[0] : addDays(new Date(), -7).toISOString().split('T')[0],
        "to": date?.to ? date.to.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }

    const usp = new URLSearchParams(params);
    usp.sort();
    const qs = usp.toString();

    const {
        data,
        isLoading,
        isValidating,
        error
    } = useSWR<TimeEntry[]>(
        `/api/redmine/conn/${redmineConnection?.id}/time_entries?${qs}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );

    console.log(data);
    const table = useReactTable({
        data: data as TimeEntry[],
        columns: TimeEntryTableColumns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        meta: {
            redmineConnection: redmineConnection
        } as TableMeta<TimeEntry>
    })
    console.log(table)
    return (
        <div className="rounded-md border">
            <h2 className="text-2xl font-bold tracking-tight pt-2 pl-2">{redmineConnection.name} Time Entries</h2>
            <p className="text-muted-foreground pl-2">
                Time entries from {date?.from?.toISOString().split('T')[0]} to {date?.to?.toISOString().split('T')[0]}
            </p>
            { (table == undefined || data == undefined) &&
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
                                        No results.
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