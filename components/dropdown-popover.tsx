"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { FormControl } from "@/components/ui/form"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DropdownPopoverProps {
    field: any,
    options: {
        id: string | number,
        name: string
    }[],
    onSelectFunc: (value: string) => void
}

const DropdownPopover = ({
    field,
    options,
    onSelectFunc
}: DropdownPopoverProps) => {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <FormControl className="items-end col-span-4 w-full">
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                            "justify-between h-fit",
                            !field.value && "text-muted-foreground"
                        )}
                    >
                        {field.value
                            ? options?.find(
                                (option) => option?.id.toString() === field.value
                            )?.name
                            : "Select an option"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="p-0 col-span-4 w-full">
                <Command>
                    <CommandInput placeholder="Search options..." />
                    <CommandEmpty>No option found.</CommandEmpty>
                    <ScrollArea className='overflow-auto max-h-screen'>
                        <CommandGroup>
                            {options?.map((option) => (
                                <CommandItem
                                    value={option.name}
                                    key={option.id}
                                    onSelect={(currentValue) => {
                                        onSelectFunc(currentValue);
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            option?.id.toString() === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    {option.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </ScrollArea>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export default DropdownPopover;