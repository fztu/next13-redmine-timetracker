import { TimeEntry } from "@/lib/redmine"
import { UserRedmineConnection } from '@prisma/client';

export type TTimeEntries = {
    connectionId: string,
    data: TimeEntry[]
}