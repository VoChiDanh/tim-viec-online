"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "cn";
import { normalizeSearch } from "@/features/jobs/query";
import { Input } from "@/modules/cores/shadcn/components/ui/input";
import { Checkbox } from "@/modules/cores/shadcn/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/cores/shadcn/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/cores/shadcn/components/ui/popover";

export type SelectionOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type CommonProps = {
  label: string;
  placeholder: string;
  name: string;
  options: SelectionOption[];
  className?: string;
};

const ALL_VALUES = "__all_values__";

// Radix traps focus and hides the page from assistive technology. Inert also
// prevents hidden page controls from remaining programmatically focusable.
export function isolateSelectionMenu(menu: HTMLDivElement | null) {
  if (!menu) return;
  const outside = Array.from(document.body.children)
    .filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && !element.contains(menu),
    )
    .map((element) => ({ element, inert: element.inert }));
  outside.forEach(({ element }) => {
    element.inert = true;
  });
  return () =>
    outside.forEach(({ element, inert }) => {
      element.inert = inert;
    });
}

export function SelectionField({
  label,
  placeholder,
  name,
  options,
  value,
  onValueChange,
  className,
  clearable = true,
}: CommonProps & {
  value: string;
  onValueChange: (value: string) => void;
  clearable?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div
      className={cn("selection-field", className)}
      data-active={!!value}
      data-clearable={clearable}
    >
      <input type="hidden" name={name} value={value} />
      <Select
        value={value || (clearable ? ALL_VALUES : "")}
        onValueChange={(next) => onValueChange(next === ALL_VALUES ? "" : next)}
      >
        <SelectTrigger
          ref={trigger}
          className="selection-trigger"
          aria-label={label}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          ref={isolateSelectionMenu}
          className="selection-menu"
          position="popper"
          align="start"
          sideOffset={6}
          collisionPadding={12}
        >
          {clearable && (
            <SelectItem className="selection-option" value={ALL_VALUES}>
              {placeholder}
            </SelectItem>
          )}
          {options.map((option) => (
            <SelectItem
              className="selection-option"
              value={option.value}
              key={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && clearable && (
        <button
          className="selection-clear"
          type="button"
          aria-label={`Xóa ${label.toLocaleLowerCase("vi")}`}
          onClick={() => {
            onValueChange("");
            trigger.current?.focus();
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function SearchableSelectionField({
  label,
  placeholder,
  name,
  options,
  value,
  onValueChange,
  searchLabel,
  className,
  open: controlledOpen,
  onOpenChange,
  popupClassName,
  popupOwner,
  popupTitle,
}: CommonProps & {
  value: string;
  onValueChange: (value: string) => void;
  searchLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  popupClassName?: string;
  popupOwner?: string;
  popupTitle?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", time: 0 });
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [search, setSearch] = useState("");
  const keyword = normalizeSearch(search);
  const selected = options.find((option) => option.value === value);
  const visible = keyword
    ? options.filter((option) =>
        normalizeSearch(option.label).includes(keyword),
      )
    : [{ value: "", label: placeholder }, ...options];

  function choose(next: string) {
    onValueChange(next);
    changeOpen(false);
  }

  function changeOpen(next: boolean) {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
    setSearch("");
    typeahead.current = { text: "", time: 0 };
  }

  function focusOption(index: number) {
    const items =
      list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]');
    if (items?.length) items[(index + items.length) % items.length].focus();
  }

  return (
    <div className={cn("selection-field", className)} data-active={!!value}>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger asChild>
          <button
            ref={trigger}
            className="selection-trigger"
            type="button"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={open ? `${id}-popup` : undefined}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                changeOpen(true);
              }
            }}
          >
            <span className="selection-value">
              <span>{selected?.label ?? placeholder}</span>
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          id={`${id}-popup`}
          className={cn(
            "selection-menu selection-searchable-menu",
            !searchLabel && "selection-plain-menu",
            popupClassName,
          )}
          data-search-owner={popupOwner}
          align={popupOwner ? "end" : "start"}
          side="bottom"
          sticky="always"
          updatePositionStrategy={popupOwner ? "always" : "optimized"}
          sideOffset={6}
          collisionPadding={12}
          aria-label={label}
          onOpenAutoFocus={
            searchLabel
              ? undefined
              : (event) => {
                  event.preventDefault();
                  focusOption(
                    Math.max(
                      0,
                      visible.findIndex((option) => option.value === value),
                    ),
                  );
                }
          }
        >
          {popupTitle && (
            <h2 className="selection-popup-title">{popupTitle}</h2>
          )}
          {searchLabel && (
            <div className="selection-search">
              <Search size={16} aria-hidden="true" />
              <label className="sr-only" htmlFor={`${id}-search`}>
                {searchLabel}
              </label>
              <Input
                id={`${id}-search`}
                value={search}
                placeholder={`${searchLabel}…`}
                maxLength={100}
                autoComplete="off"
                aria-controls={`${id}-list`}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    focusOption(event.key === "ArrowDown" ? 0 : -1);
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    if (visible[0]) choose(visible[0].value);
                  }
                }}
              />
            </div>
          )}
          <div
            id={`${id}-list`}
            ref={list}
            role="listbox"
            aria-label={label}
            className="selection-options"
            onKeyDown={(event) => {
              const items = Array.from(
                list.current?.querySelectorAll('[role="option"]') ?? [],
              );
              const index = items.indexOf(event.target as Element);
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                focusOption(
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? -1
                      : index + (event.key === "ArrowDown" ? 1 : -1),
                );
              } else if (
                event.key.length === 1 &&
                event.key !== " " &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                const now = performance.now();
                const text =
                  now - typeahead.current.time < 700
                    ? typeahead.current.text + event.key
                    : event.key;
                typeahead.current = { text, time: now };
                const match = visible.findIndex((option) =>
                  normalizeSearch(option.label).startsWith(
                    normalizeSearch(text),
                  ),
                );
                if (match >= 0) focusOption(match);
              }
            }}
          >
            {visible.map((option) => (
              <button
                type="button"
                role="option"
                tabIndex={-1}
                key={option.value}
                aria-selected={option.value === value}
                data-state={option.value === value ? "checked" : "unchecked"}
                className="selection-option"
                onClick={() => choose(option.value)}
              >
                <span className="selection-single-check" aria-hidden="true">
                  {option.value === value && <Check size={14} />}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          {visible.length === 0 && (
            <p className="selection-empty" role="status">
              Không tìm thấy tỉnh/thành phố.
            </p>
          )}
        </PopoverContent>
      </Popover>
      {value && (
        <button
          className="selection-clear"
          type="button"
          aria-label={`Xóa ${label.toLocaleLowerCase("vi")}`}
          onClick={() => {
            onValueChange("");
            trigger.current?.focus();
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function MultiSelectionField({
  label,
  placeholder,
  name,
  options,
  values,
  onValuesChange,
  searchLabel,
  className,
}: CommonProps & {
  values: string[];
  onValuesChange: (values: string[]) => void;
  searchLabel: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.filter((option) => values.includes(option.value));
  const visible = options.filter((option) =>
    normalizeSearch(option.label).includes(normalizeSearch(search)),
  );
  return (
    <div
      className={cn("selection-field", className)}
      data-active={values.length > 0}
    >
      {values.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={trigger}
            className="selection-trigger"
            type="button"
            aria-label={label}
            aria-describedby={`${id}-selection`}
          >
            <span className="selection-value">
              <span>{selected[0]?.label ?? placeholder}</span>
              {selected.length > 1 && (
                <span className="selection-count">+{selected.length - 1}</span>
              )}
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <span className="sr-only" id={`${id}-selection`}>
          {selected.length > 0
            ? `Đã chọn ${selected.length} ngành nghề: ${selected.map((option) => option.label).join(", ")}`
            : "Chưa chọn ngành nghề"}
        </span>
        <PopoverContent
          className="selection-menu selection-multiple-menu"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label={label}
        >
          <div className="selection-search">
            <Search size={16} aria-hidden="true" />
            <label className="sr-only" htmlFor={`${id}-search`}>
              {searchLabel}
            </label>
            <Input
              id={`${id}-search`}
              value={search}
              placeholder={`${searchLabel}…`}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <fieldset className="selection-options">
            <legend className="sr-only">
              Chọn nhiều {label.toLocaleLowerCase("vi")}
            </legend>
            {visible.map((option) => {
              const checked = values.includes(option.value);
              return (
                <label
                  className="selection-check-option"
                  key={option.value}
                  data-selected={checked}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      onValuesChange(
                        next === true
                          ? [...values, option.value]
                          : values.filter((value) => value !== option.value),
                      )
                    }
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
            {visible.length === 0 && (
              <p className="selection-empty" role="status">
                Không tìm thấy lựa chọn phù hợp.
              </p>
            )}
          </fieldset>
        </PopoverContent>
      </Popover>
      {values.length > 0 && (
        <button
          className="selection-clear"
          type="button"
          aria-label={`Xóa ${label.toLocaleLowerCase("vi")}`}
          onClick={() => {
            onValuesChange([]);
            trigger.current?.focus();
          }}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
