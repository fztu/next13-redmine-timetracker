"use client"

import { useState } from "react";
import { ControllerRenderProps, useForm } from "react-hook-form";
import { format } from "date-fns"
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios";
import useSWR from 'swr'
import { useUser } from "@clerk/nextjs";

import type { UserRedmineConnection } from '@prisma/client'
import {
    Project as RedmineProject,
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
import { toast, useToast } from "@/components/ui/use-toast"
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";

import DropdownPopover from "@/components/dropdown-popover"

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
    spent_on: z.date()
})
.refine(({ project_id, sub_project_id, issue_id }) =>
    project_id !== "" || sub_project_id !== "" || issue_id !== "",
    { message: "Either project, sub project, or ticket must be defined" }
);

interface TimeEntryFormProps {
    userRedmineConnections?: UserRedmineConnection[]
}

const fetcher = (url: string) => axios.get(url).then(res => res.data)

const TimeEntryForm = ({
    userRedmineConnections
}: TimeEntryFormProps) => {
    const { isSignedIn, user, isLoaded } = useUser();
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [connectionId, setConnectionId] = useState<string>("")
    const [projectOptions, setProjectOptions] = useState<Array<RedmineProject>>([])
    const [subProjectOptions, setSubProjectOptions] = useState<Array<{ id: number, name: string }>>([])

    const redmineConnectionOptions = userRedmineConnections ? userRedmineConnections.map(item => ({
        id: item.id,
        name: item.name
    })) : [];

    const { data: timeEntryActivityOptions, isLoading: isActivitiesLoading, isValidating, error } = useSWR<TimeEntryActivity[]>(
        connectionId ? ('/api/redmine/conn/' + connectionId + '/activities?userId=' + user?.id ?? "") : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateIfStale: false,
            revalidateOnReconnect: false,
        }
    );

    const activityOptons = timeEntryActivityOptions ? timeEntryActivityOptions.map(item => ({
        id: item.id.toString(),
        name: item.name
    })) : [];

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            id: "",
            comments: "",
            hours: 0,
            connection_id: "",
            project_id: "",
            sub_project_id: "",
            issue_id: "",
            activity_id: "",
            spent_on: new Date()
        }
    })

    // 2. Define a submit handler.
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
        } catch (error: any) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Define a save draft handler
    const onSaveDraft = async (values: z.infer<typeof formSchema>) => {
        try {
            console.log("Save draft time entry");
            console.log(values);
            setIsLoading(true);
        } catch (error: any) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    }

    // Define on Redmine connection change handler
    const onRedmineConnectionChange = async (value: string) => {
        console.log(value);
        setProjectOptions([])
        setSubProjectOptions([])
        const matchedConnections = userRedmineConnections?.filter(c => c.name.toLowerCase() === value);
        const selectedConnection = matchedConnections?.at(0);
        console.log(selectedConnection);
        if (selectedConnection) {
            setProjectOptions(JSON.parse(selectedConnection.projects))
            setConnectionId(selectedConnection.id)
            form.setValue("connection_id", selectedConnection.id)
        }
    }

    // Define on Redmine project change handler
    const onProjectChange = async (value: string) => {
        console.log(value);
        setSubProjectOptions([])
        const matchedProjects = projectOptions?.filter(c => c.name.toLowerCase() === value);
        const selectedProject = matchedProjects?.at(0);
        console.log(selectedProject);
        if (selectedProject && selectedProject?.children) {
            setSubProjectOptions(selectedProject?.children)
            form.setValue("project_id", selectedProject?.id.toString())
        }
    }

    // Define on Redmine sub project change handler
    const onTimeEntryActivityChange = async (value: string) => {
        console.log(value);
        const foundOption = activityOptons?.find(
            (option) => option?.name.toLowerCase() === value
        )
        if (foundOption) {
            form.setValue("activity_id", foundOption.id)
        }
    }

    // Define on Redmine sub project change handler
    const onSubProjectChange = async (value: string) => {
        console.log(value);
        const foundOption = subProjectOptions?.find(
            (option) => option?.name.toLowerCase() === value
        )
        if (foundOption) {
            form.setValue("sub_project_id", foundOption.id.toString())
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                    <p>This will log the time entry to the ticket and the project association will depend on the ticket.</p>
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
                                                format(field.value, "PPP")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <section className="w-full flex flex-row space-x-6">
                    <Button
                        variant="outline"
                        type="button"
                        className="w-1/2"
                        disabled={isLoading}
                        onClick={() => form.reset()}
                    >
                        Reset
                    </Button>
                    {/* <Button
                        variant="secondary"
                        type="button"
                        className="w-1/2"
                        disabled={isLoading}
                        onClick={form.handleSubmit(onSaveDraft)}
                    >
                        Save Draft
                    </Button> */}
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