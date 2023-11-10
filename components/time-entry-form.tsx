"use client"

import moment from 'moment';
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios";
import useSWR from 'swr'
import { useUser } from "@clerk/nextjs";

import type { UserRedmineConnection } from '@prisma/client'
import {
    Project as RedmineProject,
    TimeEntry,
    TimeEntryActivity
} from "@/lib/redmine";

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast"
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";

import DropdownPopover from "@/components/dropdown-popover"
import { DateRange } from "react-day-picker";
import useTimeEntriesRequest from "@/hooks/useTimeEntriesRequest";
import useRedmineConnectionsRequest from "@/hooks/useRedmineConnectionsRequest";

const formSchema = z.object({
    id: z.string().optional(),
    comments: z.string().nonempty({
        message: "Comments is required"
    }),
    hours: z.coerce.number().gt(0),
    connection_id: z.string(),
    project_id: z.string().optional(),
    sub_project_id: z.string().optional(),
    issue_id: z.coerce.string().optional(),
    activity_id: z.string(),
    spent_on: z.string()
})
.refine(({ project_id, sub_project_id, issue_id }) =>
    project_id !== "" || sub_project_id !== "" || issue_id !== "",
    { message: "Either project, sub project, or ticket must be defined" }
);

interface TimeEntryFormProps {
    date?: DateRange | undefined,
    redmineConnection?: UserRedmineConnection,
    timeEntry?: TimeEntry
}

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const TimeEntryForm = ({
    date,
    redmineConnection,
    timeEntry
}: TimeEntryFormProps) => {
    const { isSignedIn, user, isLoaded } = useUser();
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [connectionId, setConnectionId] = useState<string>(redmineConnection ? redmineConnection.id : "")
    const [projectOptions, setProjectOptions] = useState<Array<RedmineProject>>([])
    const [subProjectOptions, setSubProjectOptions] = useState<Array<{ id: number, name: string }>>([])
    const containerRef = useRef<HTMLDivElement>(null);

    /**
     * Retrieves the user's Redmine connections using the useRedmineConnectionsRequest hook.
     * @returns An object containing the user's Redmine connections data, loading status, validation status, error, and a function to mutate the connections data.
     * - data: The user's Redmine connections.
     * - isLoading: A boolean indicating whether the connections are currently being loaded.
     * - isValidating: A boolean indicating whether the connections are currently being validated.
     * - error: An error object if there was an error retrieving the connections.
     * - mutate: A function to mutate the connections data.
     */
    const {
        data: userRedmineConnections,
        isLoading: isRedmineConnectionsLoading,
        isValidating: isRedmineConnectionsValidating,
        error: redmineConnectionsError,
        mutate: mutateRedmineConnections
    } = useRedmineConnectionsRequest();

    /**
     * Retrieves time entries data using the useTimeEntriesRequest hook.
     * @param {Date} date - The date for which to retrieve time entries.
     * @param {UserRedmineConnection[]} userRedmineConnections - An array of user Redmine connections.
     * @returns An object containing the time entries data, loading status, validation status, error, and mutate function.
     * - data: The time entries data.
     * - isLoading: A boolean indicating if the time entries are currently being loaded.
     * - isValidating: A boolean indicating if the time entries are currently being validated.
     * - error: An error object if there was an error loading the time entries.
     * - mutate: A function to manually mutate the time entries data.
     */
    const {
        data: timeEntries,
        isLoading: isTimeEntriesLoading,
        isValidating: isTimeEntriesValdating,
        error: timeEntriesLoadError,
        mutate: mutateTimeEntries
    } = useTimeEntriesRequest(date, userRedmineConnections)

    /**
     * Creates an array of Redmine connection options based on the user's Redmine connections.
     * @param {Array} userRedmineConnections - The user's Redmine connections.
     * @returns {Array} An array of Redmine connection options with id and name properties.
     */
    const redmineConnectionOptions = userRedmineConnections ? userRedmineConnections.map(item => ({
        id: item.id,
        name: item.name
    })) : [];

    /**
     * Fetches the time entry activity options from the server using the useSWR hook.
     * @param {string} connectionId - The ID of the connection.
     * @param {number} user.id - The ID of the user.
     * @returns {Object} An object containing the time entry activity options, loading state, validation state, and error.
     */
    const { data: timeEntryActivityOptions, isLoading: isActivitiesLoading, isValidating, error } = useSWR<TimeEntryActivity[]>(
        connectionId ? ('/api/redmine/conn/' + connectionId + '/activities?userId=' + user?.id ?? "") : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );

    /**
     * Maps the time entry activity options to a new format.
     * @param {Array} timeEntryActivityOptions - The array of time entry activity options.
     * @returns {Array} An array of objects with id and name properties.
     */
    const activityOptons = timeEntryActivityOptions ? timeEntryActivityOptions.map(item => ({
        id: item.id.toString(),
        name: item.name
    })) : [];

    /**
     * Finds a project in the given array of Redmine projects by its ID.
     * @param {RedmineProject[]} data - The array of Redmine projects to search in.
     * @param {number} targetId - The ID of the project to find.
     * @returns The project object if found, otherwise undefined.
     */
    const findProjectById= function (data: RedmineProject[], targetId: number) {
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

    // 1. Define your form.
    /**
     * Creates a form using the useForm hook from the react-hook-form library.
     * @param {z.infer<typeof formSchema>} - The inferred type of the form schema.
     * @returns The created form object.
     */
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: "",
            comments: "",
            hours: 0,
            connection_id: redmineConnection ? redmineConnection.id : "",
            project_id: "",
            sub_project_id: "",
            issue_id: "",
            activity_id: "",
            spent_on: moment().toISOString(true).split('T')[0]
        }
    })

    /**
     * useEffect hook that runs when the redmineConnection, timeEntry, or form values change.
     * It updates the form values based on the redmineConnection and timeEntry data.
     * @param {Object} redmineConnection - The redmine connection object.
     * @param {Object} timeEntry - The time entry object.
     * @param {Object} form - The form object.
     * @returns None
     */
    useEffect(() => {
        if (redmineConnection) {
            setProjectOptions(redmineConnection.projects ? JSON.parse(redmineConnection.projects) : []);
            form.setValue("connection_id", redmineConnection.id);
        }
        if (redmineConnection && timeEntry && form) {
            console.log(timeEntry);
            form.setValue("id", timeEntry.id.toString());
            form.setValue("comments", timeEntry.comments);
            form.setValue("issue_id", timeEntry.issue?.id.toString());
            form.setValue("activity_id", timeEntry.activity.id.toString());
            form.setValue("spent_on", moment(timeEntry.spent_on).toISOString(true).split('T')[0])
            form.setValue("hours", timeEntry.hours);
            const allProjects = redmineConnection.projects ? JSON.parse(redmineConnection.projects) : [];
            const matchedProject = findProjectById(allProjects, timeEntry.project.id)
            if (matchedProject !== undefined && matchedProject.id !== timeEntry.project.id) {
                form.setValue("project_id", matchedProject.id.toString());
                setSubProjectOptions(matchedProject.children ?? [])
                form.setValue("sub_project_id", timeEntry.project.id.toString());
                console.log("Sub Project ID: " + timeEntry.project.id.toString())
            } else {
                form.setValue("project_id", timeEntry.project.id.toString());
                form.setValue("sub_project_id", "");
            }
        }
    }, [redmineConnection, timeEntry, form]);

    // 2. Define a submit handler.
    /**
     * Handles the submission of a time entry form.
     * @param {object} values - The values from the time entry form.
     * @returns None
     */
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Submit time entry");
            console.log(values);
            setIsLoading(true);
            const connectionId = values?.connection_id;
            const response = await axios.post(
                `/api/redmine/conn/${connectionId}/time_entries`,
                values
            );
            console.log(response.data);
            if (response?.data?.status?.hasError === false) {
                toast({
                    title: "Time Entry Submitted",
                    description: "Time entry submitted successfully.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed",
                    description: "Failed to submit the time entry",
                })
            }
            // tell all SWRs with this key to revalidate
            mutateTimeEntries()
        } catch (error: any) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Define on Redmine connection change handler
    /**
     * Handles the change event of the Redmine connection input field.
     * @param {string} value - The new value of the Redmine connection input field.
     * @returns None
     */
    const onRedmineConnectionChange = async (value: string) => {
        // console.log(value);
        setProjectOptions([])
        setSubProjectOptions([])
        const matchedConnections = userRedmineConnections?.filter(c => c.name.toLowerCase() === value);
        const selectedConnection = matchedConnections?.at(0);
        // console.log(selectedConnection);
        if (selectedConnection) {
            setProjectOptions(selectedConnection.projects ? JSON.parse(selectedConnection.projects) : [])
            setConnectionId(selectedConnection.id)
            form.setValue("connection_id", selectedConnection.id)
        }
    }

    // Define on Redmine project change handler
    /**
     * Handles the change event when the project value is selected.
     * @param {string} value - The selected project value.
     * @returns None
     */
    const onProjectChange = async (value: string) => {
        // console.log(value);
        setSubProjectOptions([])
        const matchedProjects = projectOptions?.filter(c => c.name.toLowerCase() === value);
        const selectedProject = matchedProjects?.at(0);
        // console.log(selectedProject);
        if (selectedProject && selectedProject?.children) {
            setSubProjectOptions(selectedProject?.children)
            form.setValue("project_id", selectedProject?.id.toString())
        }
    }

    // Define on Redmine sub project change handler
    /**
     * Handles the change event of the time entry activity dropdown.
     * @param {string} value - The selected value from the dropdown.
     * @returns None
     */
    const onTimeEntryActivityChange = async (value: string) => {
        // console.log(value);
        const foundOption = activityOptons?.find(
            (option) => option?.name.toLowerCase() === value
        )
        if (foundOption) {
            form.setValue("activity_id", foundOption.id)
        }
    }

    // Define on Redmine sub project change handler
    /**
     * Handles the change event of the sub project select input.
     * @param {string} value - The selected value from the sub project select input.
     * @returns None
     */
    const onSubProjectChange = async (value: string) => {
        // console.log(value);
        // console.log(subProjectOptions)
        const foundOption = subProjectOptions?.find(
            (option) => option?.name.toLowerCase().trim() === value.trim()
        )
        if (foundOption) {
            form.setValue("sub_project_id", foundOption.id.toString())
        }
    }

    // Define on Spend on date change handler
    /**
     * Handles the change event for the "spent_on" field.
     * @param {Date | undefined} value - The new value of the field.
     * @returns None
     */
    const onSpentOnChange = async (value: Date | undefined) => {
        console.log(value);
        // console.log(subProjectOptions)
        form.setValue("spent_on", moment(value).toISOString(true).split('T')[0])
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-[800px]">
                <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormLabel>ID</FormLabel>
                            <FormControl>
                                <Input className="bg-gray-300" readOnly {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="connection_id"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                            <FormLabel className="items-start col-span-1 after:content-['*'] after:text-red-600">Redmine Connection</FormLabel>
                            <DropdownPopover
                                field={field}
                                options={redmineConnectionOptions}
                                onSelectFunc={onRedmineConnectionChange}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {(!isActivitiesLoading && timeEntryActivityOptions) &&
                    <FormField
                        control={form.control}
                        name="activity_id"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                                <FormLabel className="items-start col-span-1 after:content-['*'] after:text-red-600">Activity</FormLabel>
                                <DropdownPopover
                                    field={field}
                                    options={activityOptons}
                                    onSelectFunc={onTimeEntryActivityChange}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                }
                {(!isActivitiesLoading && timeEntryActivityOptions) &&
                    <FormField
                        control={form.control}
                        name="project_id"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                                <FormLabel className="items-start col-span-1 after:content-['*'] after:text-red-600">Project</FormLabel>
                                <DropdownPopover
                                    field={field}
                                    options={projectOptions.map(({id, name}) => ({id, name}))}
                                    onSelectFunc={onProjectChange}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                }
                {subProjectOptions.length > 0 &&
                    <FormField
                        control={form.control}
                        name="sub_project_id"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                                <FormLabel className="items-start col-span-1">Sub Project</FormLabel>
                                <DropdownPopover
                                    field={field}
                                    options={subProjectOptions}
                                    onSelectFunc={onSubProjectChange}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                }
                {(!isActivitiesLoading && timeEntryActivityOptions) &&
                    <FormField
                        control={form.control}
                        name="issue_id"
                        render={({ field }) => (
                            <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                                <FormLabel className="items-start col-span-1">Ticket</FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        className="items-end col-span-1 w-full"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                <FormDescription className="col-span-5">
                                    This will log the time entry to the ticket and the project association will depend on the ticket.
                                </FormDescription>
                            </FormItem>
                        )}
                    />
                }
                <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                            <FormLabel className="items-start col-span-1 after:content-['*'] after:text-red-600">Hours</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    className="items-end col-span-1 w-full"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                            <FormLabel className="items-start col-span-1 after:content-['*'] after:text-red-600">Comments</FormLabel>
                            <FormControl>
                                <Input
                                    className="items-end col-span-4 w-full"
                                    placeholder="What you did." {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="spent_on"
                    render={({ field }) => (
                        <FormItem className="grid grid-cols-5 items-center justify-center pr-0">
                            <FormLabel className="items-start col-span-1 after:content-['*'] after:text-red-600">Spent On</FormLabel>
                            <div ref={containerRef} className="col-span-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-[240px] pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(moment(field.value).toDate(), "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                        className="w-auto p-0" 
                                        align="start" 
                                        style={{
                                            width: containerRef.current?.offsetWidth
                                        }}
                                        container={containerRef.current}
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={moment(field.value).toDate()}
                                            onSelect={onSpentOnChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <section className="w-full flex flex-row space-x-6 max-w-xl">
                    <Button
                        variant="outline"
                        type="button"
                        className="w-1/2"
                        disabled={isLoading}
                        onClick={() => form.reset()}
                    >
                        Reset
                    </Button>
                    <Button
                        variant="default"
                        type="submit"
                        className="w-1/2"
                        disabled={isLoading}
                    >
                        Save
                    </Button>
                </section>
            </form>
        </Form>
    );
}

export default TimeEntryForm;